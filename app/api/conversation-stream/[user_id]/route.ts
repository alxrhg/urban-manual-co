/**
 * Streaming Conversation API with Server-Sent Events (SSE)
 * Provides real-time streaming responses for better UX
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { openai, OPENAI_MODEL } from '@/lib/openai';
import {
  genAI,
  GEMINI_MODEL,
  getGeminiModel,
  isGeminiAvailable,
} from '@/lib/gemini';
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

// Simple, conversational system prompt for Gemini
const CHAT_SYSTEM_PROMPT = `You are a friendly and knowledgeable travel assistant for Urban Manual. You help users discover amazing restaurants, hotels, cafes, and destinations from our curated collection.

Guidelines:
- Be conversational, warm, and helpful - like talking to a knowledgeable friend
- Only recommend places from our knowledge base (I'll provide search results)
- If you don't have information about a place, say so honestly
- Feel free to have natural conversations about travel, food, and destinations
- Keep responses concise but engaging (2-4 sentences typically)
- Ask follow-up questions when helpful
- Be enthusiastic about great places but honest about limitations`;

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
 */
async function smartSearch(
  query: string,
  supabase: any,
  options?: { city?: string; category?: string; userId?: string }
): Promise<SmartSearchResult> {
  const PAGE_SIZE = 10;

  // Extract intent using GPT
  let intent: any = {};
  try {
    const systemPrompt = `You are a travel search intent analyzer. Extract search intent from user queries about destinations, restaurants, hotels, bars, cafes, and cultural spots.

Return a JSON object with these fields:
- city: the city name if mentioned (normalize to proper case, e.g., "Tokyo", "New York", "Paris")
- category: one of "Restaurant", "Hotel", "Bar", "Cafe", "Culture", "Shop" if applicable
- mood: the vibe/mood if expressed (e.g., "romantic", "casual", "upscale", "trendy", "cozy")
- keywords: array of important search terms not covered by other fields
- expandedQuery: an enhanced version of the query for better semantic search

Be concise. Only include fields that are clearly implied by the query.`;

    const result = await generateJSON(systemPrompt, query);
    if (result) {
      intent = {
        city: result.city || options?.city,
        category: result.category || options?.category,
        mood: result.mood,
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

  // Use expanded query for better semantic search
  const searchQuery = intent.expandedQuery || query;

  let results: any[] = [];

  // Strategy 1: Vector similarity search
  try {
    const embedding = await embedText(searchQuery);
    if (embedding) {
      const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: PAGE_SIZE,
        filter_city: intent.city || null,
        filter_category: intent.category || null,
        filter_michelin_stars: null,
        filter_min_rating: null,
        filter_max_price_level: null,
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

  // Strategy 2: Full-text search fallback
  if (results.length === 0) {
    try {
      let fallbackQuery = supabase
        .from('destinations')
        .select('slug, name, city, category, micro_description, description, image, michelin_stars, rating, price_level')
        .limit(PAGE_SIZE);

      // Apply city filter
      if (intent.city) {
        fallbackQuery = fallbackQuery.ilike('city', `%${intent.city}%`);
      }

      // Apply category filter
      if (intent.category) {
        fallbackQuery = fallbackQuery.ilike('category', `%${intent.category}%`);
      }

      // Text search
      fallbackQuery = fallbackQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);

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
        .select('slug, name, city, category, micro_description, description, image, michelin_stars, rating, price_level')
        .ilike('city', `%${intent.city}%`)
        .limit(PAGE_SIZE);

      if (cityResults && cityResults.length > 0) {
        results = cityResults;
        console.log('[SmartSearch] City fallback found', results.length, 'results');
      }
    } catch (error) {
      console.error('[SmartSearch] City fallback error:', error);
    }
  }

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

            if (searchResults.length > 0) {
              // Format search results for response generation
              const resultsText = searchResults.slice(0, 5).map((r: any, idx: number) =>
                `${idx + 1}. ${r.name} (${r.city}) - ${r.micro_description || r.description || r.category}${r.michelin_stars ? ` ⭐ ${r.michelin_stars} Michelin` : ''}${r.rating ? ` (${r.rating}/5)` : ''}`
              ).join('\n');

              // Build a context-aware prompt based on detected intent
              const moodContext = detectedIntent.mood ? `The user is looking for a ${detectedIntent.mood} vibe.` : '';
              const cityContext = detectedIntent.city ? `They're interested in ${detectedIntent.city}.` : '';

              // Use Gemini to generate a conversational response
              if (genAI) {
                try {
                  const model = genAI.getGenerativeModel({
                    model: GEMINI_MODEL,
                    generationConfig: {
                      temperature: 0.8,
                      maxOutputTokens: 500,
                    },
                    systemInstruction: CHAT_SYSTEM_PROMPT,
                  });

                  // Build conversation history for chat
                  const history = recentMessages.slice(-5).map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }],
                  }));

                  // Build the current prompt with search results and context
                  const currentPrompt = `${contextInfo ? `Context: ${JSON.stringify({ ...session.context, ...contextUpdates })}\n\n` : ''}${moodContext} ${cityContext}

Here are our top recommendations from the knowledge base:

${resultsText}

User asked: "${message}"

${aiInsightBanner ? `(AI insight: ${aiInsightBanner})\n\n` : ''}Provide a helpful, conversational response recommending 2-3 specific places that best match their request. Be enthusiastic and mention what makes each place special.`;

                  // Start chat with history if available
                  let result;
                  if (history.length > 0) {
                    const chat = model.startChat({ history });
                    result = await chat.sendMessageStream(currentPrompt);
                  } else {
                    result = await model.generateContentStream(currentPrompt);
                  }

                  for await (const chunk of result.stream) {
                    const content = chunk.text();
                    if (content) {
                      assistantResponse += content;
                      controller.enqueue(encoder.encode(createSSEMessage({
                        type: 'chunk',
                        content
                      })));
                    }
                  }

                  usedModel = `smart-search+${GEMINI_MODEL}`;
                } catch (error: any) {
                  console.error('Gemini response error:', error);
                  // Fallback to smart formatted response (not generic!)
                  const topPicks = searchResults.slice(0, 3);
                  const moodDesc = detectedIntent.mood ? `${detectedIntent.mood} ` : '';
                  const cityDesc = detectedIntent.city || 'your destination';

                  assistantResponse = `Here are some ${moodDesc}spots I'd recommend in ${cityDesc}:\n\n${topPicks.map((r: any) =>
                    `• **${r.name}** - ${r.micro_description || r.description || r.category}${r.michelin_stars ? ` (${r.michelin_stars}⭐ Michelin)` : ''}`
                  ).join('\n')}\n\nWould you like more details on any of these?`;

                  controller.enqueue(encoder.encode(createSSEMessage({
                    type: 'chunk',
                    content: assistantResponse
                  })));
                  usedModel = 'smart-search';
                }
              } else if (openai && openai.chat) {
                // Use OpenAI if Gemini not available
                try {
                  const openaiMessages = [
                    { role: 'system' as const, content: `${CHAT_SYSTEM_PROMPT}\n\n${moodContext} ${cityContext}\n\nHere are search results:\n${resultsText}` },
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
                    max_tokens: 600,
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

                  usedModel = `smart-search+${CONVERSATION_MODEL}`;
                } catch (error: any) {
                  console.error('OpenAI response error:', error);
                }
              } else {
                // No LLM available - use smart formatted response
                const topPicks = searchResults.slice(0, 3);
                const moodDesc = detectedIntent.mood ? `${detectedIntent.mood} ` : '';
                const cityDesc = detectedIntent.city || 'your destination';

                assistantResponse = `Here are some ${moodDesc}spots I'd recommend in ${cityDesc}:\n\n${topPicks.map((r: any) =>
                  `• **${r.name}** - ${r.micro_description || r.description || r.category}${r.michelin_stars ? ` (${r.michelin_stars}⭐ Michelin)` : ''}`
                ).join('\n')}\n\nWould you like more details on any of these?`;

                controller.enqueue(encoder.encode(createSSEMessage({
                  type: 'chunk',
                  content: assistantResponse
                })));
                usedModel = 'smart-search';
              }
            }
          } catch (searchError: any) {
            console.error('Smart search error:', searchError);
          }

          // Fallback: General conversation if no search results
          if (!assistantResponse && searchResults.length === 0) {
            if (genAI) {
              try {
                const model = genAI.getGenerativeModel({
                  model: GEMINI_MODEL,
                  generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 600,
                  },
                  systemInstruction: CHAT_SYSTEM_PROMPT,
                });

                // Build conversation history for chat
                const history = recentMessages.slice(-5).map((msg: any) => ({
                  role: msg.role === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.content }],
                }));

                // Build the current prompt
                const currentPrompt = `${contextInfo ? `Context: ${JSON.stringify({ ...session.context, ...contextUpdates })}\n\n` : ''}User: ${message}`;

                // Start chat with history if available
                let result;
                if (history.length > 0) {
                  const chat = model.startChat({ history });
                  result = await chat.sendMessageStream(currentPrompt);
                } else {
                  result = await model.generateContentStream(currentPrompt);
                }

                for await (const chunk of result.stream) {
                  const content = chunk.text();
                  if (content) {
                    assistantResponse += content;
                    controller.enqueue(encoder.encode(createSSEMessage({
                      type: 'chunk',
                      content
                    })));
                  }
                }

                usedModel = GEMINI_MODEL;
              } catch (error: any) {
                console.error('Gemini fallback error:', error);
              }
            } else if (openai && openai.chat) {
              // Fallback to OpenAI
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
                  max_tokens: 600,
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

          // Get suggestions for next turn
          const suggestions = await getContextSuggestions({ ...session.context, ...contextUpdates });

          // Send completion message
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'complete',
            intent,
            suggestions: suggestions.slice(0, 3),
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
