/**
 * Streaming Conversation API with Server-Sent Events (SSE)
 * Provides real-time streaming responses for better UX
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { openai, OPENAI_MODEL } from '@/lib/openai';
// Note: Using OpenAI for all conversation (Gemini imports removed)
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { formatFewShots } from '@/lib/ai/fewShots';
import {
  getOrCreateSession,
  getConversationMessages,
  saveMessage,
  updateContext,
  getContextSuggestions,
  type ConversationContext,
} from '../../conversation/utils/contextHandler';
import { extractIntent } from '@/app/api/intent/schema';
import { logConversationMetrics } from '@/lib/metrics/conversationMetrics';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { embedText, generateJSON } from '@/lib/llm';

const CONVERSATION_MODEL = process.env.OPENAI_CONVERSATION_MODEL || OPENAI_MODEL;

// Conversational system prompt for OpenAI - helps refine search through dialogue
const CHAT_SYSTEM_PROMPT = `You are a friendly travel concierge for Urban Manual. Your job is to help users discover amazing places through natural conversation.

GUIDELINES:
- Acknowledge their request and what you found (e.g., "Great choice! I've found some wonderful spots...")
- DO NOT list specific place names - the results grid shows those
- Ask ONE follow-up question to refine results if needed
- Be warm, brief (1-2 sentences max), and natural
- If they've given enough detail, just confirm and encourage exploring the results

EXAMPLES:
- User: "restaurants in tokyo" → "Tokyo has incredible dining! Are you looking for something specific - casual izakaya vibes, fine dining, or a particular cuisine?"
- User: "romantic dinner" → "I've pulled some romantic spots! Intimate and cozy, or something more upscale?"
- User: "best coffee" → "Got some great coffee spots! Looking for specialty beans, a work-friendly cafe, or just great ambiance?"
- User: "casual ramen" → "Perfect! I've got some great casual ramen spots. Check out the results - any preference for style?"
- User: "something trendy and instagrammable" → "Ooh I love that vibe! Found some gorgeous spots. Take a look at these!"

Keep responses SHORT. One acknowledgment + one optional question. Let the grid do the showing.`;

// Smart search interface
interface SmartSearchResult {
  results: any[];
  intent: {
    city?: string;
    category?: string;
    mood?: string;
    keywords?: string[];
  };
  aiInsightBanner?: string;
}

/**
 * GPT-powered smart search for conversation
 * Uses OpenAI for intent detection and Supabase for search
 * Includes diversity and proper intent filtering
 */
async function smartSearch(
  query: string,
  supabase: any,
  options?: { city?: string; category?: string; userId?: string }
): Promise<SmartSearchResult> {
  const PAGE_SIZE = 20; // Fetch more for diversity

  // Extract intent using GPT
  let intent: any = {};
  try {
    const systemPrompt = `You are a travel search intent analyzer. Extract search intent from user queries about destinations, restaurants, hotels, bars, cafes, and cultural spots.

Return a JSON object with these fields:
- city: the city name if mentioned (normalize to proper case, e.g., "Tokyo", "New York", "Paris")
- category: one of "Restaurant", "Hotel", "Bar", "Cafe", "Culture", "Shop" if applicable
- mood: the vibe/mood if expressed (e.g., "romantic", "casual", "upscale", "trendy", "cozy", "hidden gem", "local favorite", "instagram-worthy")
- priceLevel: 1-4 if price is implied (1=budget, 2=moderate, 3=upscale, 4=luxury)
- keywords: array of important search terms not covered by other fields
- expandedQuery: an enhanced version of the query that captures the full intent for semantic search

Be concise. Only include fields that are clearly implied by the query.`;

    const result = await generateJSON(systemPrompt, query);
    if (result) {
      intent = {
        city: result.city || options?.city,
        category: result.category || options?.category,
        mood: result.mood,
        priceLevel: result.priceLevel,
        keywords: result.keywords || [],
        expandedQuery: result.expandedQuery,
      };
    }
  } catch (error) {
    console.warn('[SmartSearch] GPT intent detection failed:', error);
  }

  // Apply conversation context if available
  if (options?.city && !intent.city) intent.city = options.city;
  if (options?.category && !intent.category) intent.category = options.category;

  // Build semantic search query that includes mood/vibe for better matching
  let searchQuery = intent.expandedQuery || query;
  if (intent.mood && !searchQuery.toLowerCase().includes(intent.mood.toLowerCase())) {
    searchQuery = `${searchQuery} ${intent.mood} atmosphere vibe`;
  }

  let results: any[] = [];

  // Strategy 1: Vector similarity search with intent filters
  try {
    const embedding = await embedText(searchQuery);
    if (embedding) {
      const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
        query_embedding: embedding,
        match_threshold: 0.65, // Lower threshold for more diversity
        match_count: PAGE_SIZE,
        filter_city: intent.city || null,
        filter_category: intent.category || null,
        filter_michelin_stars: null,
        filter_min_rating: intent.mood === 'upscale' || intent.mood === 'luxury' ? 4.0 : null,
        filter_max_price_level: intent.priceLevel || null,
        filter_brand: null,
        search_query: query
      });

      if (!vectorError && vectorResults && vectorResults.length > 0) {
        results = vectorResults;
        console.log('[SmartSearch] Vector search found', results.length, 'results');
      }
    }
  } catch (error) {
    console.log('[SmartSearch] Vector search not available, using fallback');
  }

  // Strategy 2: Full-text search fallback with category/mood filtering
  if (results.length === 0) {
    try {
      let fallbackQuery = supabase
        .from('destinations')
        .select('slug, name, city, category, micro_description, description, image, michelin_stars, rating, price_level, vibe_tags')
        .limit(PAGE_SIZE);

      // Apply city filter
      if (intent.city) {
        fallbackQuery = fallbackQuery.ilike('city', `%${intent.city}%`);
      }

      // Apply category filter
      if (intent.category) {
        fallbackQuery = fallbackQuery.ilike('category', `%${intent.category}%`);
      }

      // Apply price filter
      if (intent.priceLevel) {
        fallbackQuery = fallbackQuery.lte('price_level', intent.priceLevel);
      }

      // Order by rating for quality results
      fallbackQuery = fallbackQuery.order('rating', { ascending: false, nullsFirst: false });

      const { data: fallbackResults } = await fallbackQuery;
      if (fallbackResults) {
        results = fallbackResults;
        console.log('[SmartSearch] Full-text search found', results.length, 'results');
      }
    } catch (error) {
      console.error('[SmartSearch] Full-text search error:', error);
    }
  }

  // Strategy 3: City-only fallback if no results
  if (results.length === 0 && intent.city) {
    try {
      const { data: cityResults } = await supabase
        .from('destinations')
        .select('slug, name, city, category, micro_description, description, image, michelin_stars, rating, price_level, vibe_tags')
        .ilike('city', `%${intent.city}%`)
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(PAGE_SIZE);

      if (cityResults && cityResults.length > 0) {
        results = cityResults;
        console.log('[SmartSearch] City fallback found', results.length, 'results');
      }
    } catch (error) {
      console.error('[SmartSearch] City fallback error:', error);
    }
  }

  // Add diversity: shuffle results slightly to avoid always showing the same order
  if (results.length > 5) {
    // Keep top 3, shuffle the rest
    const top3 = results.slice(0, 3);
    const rest = results.slice(3);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    results = [...top3, ...rest];
  }

  // Filter by mood if we have vibe_tags
  if (intent.mood && results.length > 0) {
    const moodLower = intent.mood.toLowerCase();
    const moodSynonyms: Record<string, string[]> = {
      'romantic': ['intimate', 'date', 'candlelit', 'cozy'],
      'casual': ['relaxed', 'laid-back', 'chill', 'everyday'],
      'upscale': ['fine dining', 'elegant', 'sophisticated', 'luxury'],
      'trendy': ['hip', 'instagram', 'modern', 'stylish'],
      'cozy': ['warm', 'intimate', 'homey', 'charming'],
      'hidden gem': ['local', 'secret', 'underrated', 'off-the-beaten-path'],
    };
    const synonyms = [moodLower, ...(moodSynonyms[moodLower] || [])];

    // Boost results that match the mood
    results = results.map(r => {
      const tags = (r.vibe_tags || []).map((t: string) => t?.toLowerCase() || '');
      const desc = (r.description || '').toLowerCase();
      const matchesMood = synonyms.some(syn => tags.includes(syn) || desc.includes(syn));
      return { ...r, _moodMatch: matchesMood };
    });

    // Sort mood matches to the top
    results.sort((a: any, b: any) => (b._moodMatch ? 1 : 0) - (a._moodMatch ? 1 : 0));
  }

  // Limit final results
  results = results.slice(0, 10);

  // Generate AI insight banner
  let aiInsightBanner: string | undefined;
  const contextParts: string[] = [];
  if (intent.mood) contextParts.push(intent.mood);
  if (intent.city) contextParts.push(intent.city);
  if (intent.category) contextParts.push(intent.category);
  if (contextParts.length > 0) {
    aiInsightBanner = `Tailored for ${contextParts.join(' • ')}`;
  }

  return { results, intent, aiInsightBanner };
}

// Helper to create SSE-formatted message
function createSSEMessage(data: any): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function normalizeUserId(userId?: string | null) {
  if (!userId) return undefined;
  return ['anonymous', 'guest'].includes(userId) ? undefined : userId;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ user_id: string }> }
) {
  const encoder = new TextEncoder();

  try {
    // Get user context first for rate limiting
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { user_id } = await context.params;
    const userId = normalizeUserId(user?.id || user_id || undefined);

    // Rate limiting: 5 requests per 10 seconds for conversation
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return new Response(
        encoder.encode(createSSEMessage({
          type: 'error',
          error: 'Too many conversation requests. Please wait a moment.',
          limit,
          remaining,
          reset
        })),
        {
          status: 429,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const { message, session_token } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        encoder.encode(createSSEMessage({ type: 'error', error: 'Message is required' })),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(encoder.encode(createSSEMessage({ type: 'status', status: 'processing' })));

          // Get or create session
          const session = await getOrCreateSession(userId, session_token);
          if (!session) {
            controller.enqueue(encoder.encode(createSSEMessage({ type: 'error', error: 'Failed to initialize session' })));
            controller.close();
            return;
          }

          // Get conversation history
          const messages = await getConversationMessages(session.sessionId, 20);

          // Extract intent from new message
          let userContext: any = {};
          if (userId && supabase) {
            try {
              const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('favorite_cities, favorite_categories, travel_style')
                .eq('user_id', userId)
                .maybeSingle();
              if (!profileError && profile) {
                userContext = {
                  favoriteCities: profile.favorite_cities,
                  favoriteCategories: profile.favorite_categories,
                  travelStyle: profile.travel_style,
                };
              }
            } catch (error) {
              console.debug('User profile fetch failed (optional):', error);
            }
          }

          const intent = await extractIntent(message, messages, userContext);

          // Save user message
          await saveMessage(session.sessionId, {
            role: 'user',
            content: message,
            intent_data: intent,
          });

          // Update context from intent
          const contextUpdates: Partial<ConversationContext> = {};
          if (intent.city) contextUpdates.city = intent.city;
          if (intent.category) contextUpdates.category = intent.category;
          if (intent.temporalContext?.timeframe === 'now') {
            const hour = new Date().getHours();
            if (hour >= 6 && hour < 12) contextUpdates.meal = 'breakfast';
            else if (hour >= 12 && hour < 17) contextUpdates.meal = 'lunch';
            else if (hour >= 17 && hour < 22) contextUpdates.meal = 'dinner';
          }
          if (intent.constraints?.preferences?.length) {
            const prefs = intent.constraints.preferences;
            if (prefs.some((p: string) => p.toLowerCase().includes('romantic'))) contextUpdates.mood = 'romantic';
            if (prefs.some((p: string) => p.toLowerCase().includes('cozy'))) contextUpdates.mood = 'cozy';
            if (prefs.some((p: string) => p.toLowerCase().includes('buzzy'))) contextUpdates.mood = 'buzzy';
          }

          await updateContext(session.sessionId, contextUpdates);

          // Send context update
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'context',
            context: { ...session.context, ...contextUpdates }
          })));

          // Build messages for Gemini (simpler format)
          const contextInfo = Object.keys({ ...session.context, ...contextUpdates }).length > 0
            ? `\n\nContext: ${JSON.stringify({ ...session.context, ...contextUpdates })}`
            : '';

          const recentMessages = messages.slice(-10);
          const conversationHistory = recentMessages.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          }));

          // Generate streaming response using SMART SEARCH (GPT-powered)
          let assistantResponse = '';
          let usedModel = 'unknown';
          let searchResults: any[] = [];

          // PRIMARY: Use GPT-powered smart search
          try {
            // Build enhanced query with conversation context for follow-ups
            let searchQuery = message;
            if (messages.length > 0) {
              const recentQueries = messages.slice(-3).map((m: any) => m.content).join(' ');
              searchQuery = `${message} (context: ${recentQueries})`;
            }

            // Use smart search with GPT intent detection
            const smartSearchResult = await smartSearch(searchQuery, supabase, {
              city: intent.city ?? undefined,
              category: intent.category ?? undefined,
              userId: userId,
            });

            searchResults = smartSearchResult.results;
            const detectedIntent = smartSearchResult.intent;
            const aiInsightBanner = smartSearchResult.aiInsightBanner;

            console.log('[Conversation] Smart search found', searchResults.length, 'results');
            console.log('[Conversation] Detected intent:', JSON.stringify(detectedIntent));

            // Build context info for the conversation
            const moodContext = detectedIntent.mood ? `User vibe: ${detectedIntent.mood}.` : '';
            const cityContext = detectedIntent.city ? `Looking in: ${detectedIntent.city}.` : '';
            const categoryContext = detectedIntent.category ? `Category: ${detectedIntent.category}.` : '';
            const resultCount = searchResults.length;

            // Use OpenAI for conversational response (asking questions, not listing places)
            if (openai && openai.chat) {
              try {
                const openaiMessages = [
                  {
                    role: 'system' as const,
                    content: `${CHAT_SYSTEM_PROMPT}

Current search context:
${moodContext} ${cityContext} ${categoryContext}
Found ${resultCount} matching results (shown in the grid).
${contextInfo ? `Session context: ${JSON.stringify({ ...session.context, ...contextUpdates })}` : ''}

Remember: DO NOT list places. The grid shows results. Your job is to ask questions to refine the search.`
                  },
                  ...recentMessages.map((msg: any) => ({
                    role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
                    content: msg.content,
                  })),
                  { role: 'user' as const, content: message },
                ];

                const stream = await openai.chat.completions.create({
                  model: CONVERSATION_MODEL,
                  messages: openaiMessages,
                  temperature: 0.9,
                  max_tokens: 200, // Keep responses short
                  stream: true,
                });

                for await (const chunk of stream) {
                  const content = chunk.choices?.[0]?.delta?.content || '';
                  if (content) {
                    assistantResponse += content;
                    controller.enqueue(encoder.encode(createSSEMessage({
                      type: 'chunk',
                      content
                    })));
                  }
                }

                usedModel = `openai-${CONVERSATION_MODEL}`;
              } catch (error: any) {
                console.error('OpenAI conversation error:', error);
                // Fallback to a simple clarifying question
                const questions = [
                  "What kind of vibe are you looking for?",
                  "Any particular occasion or mood in mind?",
                  "Are you thinking casual or something more upscale?",
                  "What's the occasion - date night, work meeting, or just exploring?",
                ];
                assistantResponse = questions[Math.floor(Math.random() * questions.length)];
                controller.enqueue(encoder.encode(createSSEMessage({
                  type: 'chunk',
                  content: assistantResponse
                })));
                usedModel = 'fallback';
              }
            } else {
              // No OpenAI available - use simple conversational fallback
              const questions = [
                "What kind of experience are you after?",
                "Any particular mood or vibe you're going for?",
                "Casual or upscale - what's the occasion?",
              ];
              assistantResponse = questions[Math.floor(Math.random() * questions.length)];
              controller.enqueue(encoder.encode(createSSEMessage({
                type: 'chunk',
                content: assistantResponse
              })));
              usedModel = 'fallback';
            }
          } catch (searchError: any) {
            console.error('Smart search error:', searchError);
          }

          // Fallback: General conversation if search failed
          if (!assistantResponse) {
            if (openai && openai.chat) {
              try {
                const openaiMessages = [
                  { role: 'system' as const, content: `${CHAT_SYSTEM_PROMPT}${contextInfo}` },
                  ...recentMessages.map((msg: any) => ({
                    role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
                    content: msg.content,
                  })),
                  { role: 'user' as const, content: message },
                ];

                const stream = await openai.chat.completions.create({
                  model: CONVERSATION_MODEL,
                  messages: openaiMessages,
                  temperature: 0.9,
                  max_tokens: 200,
                  stream: true,
                });

                for await (const chunk of stream) {
                  const content = chunk.choices?.[0]?.delta?.content || '';
                  if (content) {
                    assistantResponse += content;
                    controller.enqueue(encoder.encode(createSSEMessage({
                      type: 'chunk',
                      content
                    })));
                  }
                }

                usedModel = CONVERSATION_MODEL;
              } catch (error: any) {
                console.error('OpenAI fallback error:', error);
              }
            }
          }

          // Only use final fallback if smart search and LLM both failed
          if (!assistantResponse) {
            try {
              const fallbackSuggestions = await getContextSuggestions({ ...session.context, ...contextUpdates });
              assistantResponse = fallbackSuggestions.length > 0 && fallbackSuggestions[0]
                ? fallbackSuggestions[0]
                : "I'm here to help you discover amazing destinations! What are you looking for today?";

              controller.enqueue(encoder.encode(createSSEMessage({
                type: 'chunk',
                content: assistantResponse
              })));
            } catch (error: any) {
              console.error('Final fallback error:', error);
              assistantResponse = "I'm here to help you discover amazing destinations! What are you looking for today?";
              controller.enqueue(encoder.encode(createSSEMessage({
                type: 'chunk',
                content: assistantResponse
              })));
            }
          }

          // Save assistant message
          await saveMessage(session.sessionId, {
            role: 'assistant',
            content: assistantResponse,
          });

          // Log metrics
          await logConversationMetrics({
            userId: userId || session.sessionToken || session_token || 'anonymous',
            messageCount: messages.length + 2,
            intentType: intent.primaryIntent,
            modelUsed: usedModel,
            hasContext: Object.keys(session.context).length > 0,
          });

          // Generate smart quick reply suggestions based on detected intent
          let quickReplies: string[] = [];
          const ctx = { ...session.context, ...contextUpdates };

          // If we have a city but no category, suggest categories
          if (ctx.city && !ctx.category) {
            quickReplies = ['Restaurants', 'Cafes', 'Bars', 'Hotels'];
          }
          // If we have category but no mood, suggest vibes
          else if (ctx.category && !ctx.mood) {
            quickReplies = ['Casual', 'Upscale', 'Romantic', 'Trendy'];
          }
          // If we have mood, suggest refinements
          else if (ctx.mood) {
            quickReplies = ['Show more', 'Different vibe', 'Higher budget', 'Hidden gems'];
          }
          // Default suggestions based on city
          else if (ctx.city) {
            quickReplies = [`Best of ${ctx.city}`, 'Local favorites', 'Fine dining', 'Coffee shops'];
          }
          // Fallback to context suggestions
          else {
            const fallbackSuggestions = await getContextSuggestions(ctx);
            quickReplies = fallbackSuggestions.slice(0, 4);
          }

          // Send completion message with smart quick replies
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'complete',
            intent,
            suggestions: quickReplies,
            searchResults: searchResults.slice(0, 5).map((r: any) => ({
              slug: r.slug,
              name: r.name,
              city: r.city,
              category: r.category,
            })),
            session_id: session.sessionId,
            session_token: session.sessionToken,
            model: usedModel,
          })));

          controller.close();
        } catch (error: any) {
          console.error('Streaming conversation error:', error);
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            error: 'Failed to process conversation',
            details: error.message
          })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Conversation streaming API error:', error);
    return new Response(
      encoder.encode(createSSEMessage({
        type: 'error',
        error: 'Failed to initialize conversation stream',
        details: error.message
      })),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}
