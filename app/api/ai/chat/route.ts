/**
 * Unified AI Chat API
 *
 * Single endpoint that handles all AI chat interactions across the app.
 * Context-aware: understands trip itineraries, current page, and user preferences.
 *
 * Features:
 * - Persistent sessions
 * - Trip-aware responses (knows your itinerary)
 * - Proactive suggestions
 * - Curated destination awareness
 * - Weather/crowd intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { openai, getModelForQuery } from '@/lib/openai';
import { embedText } from '@/lib/llm';
import { unifiedSearch } from '@/lib/discovery-engine/integration';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';
import { trackOpenAIResponse, estimateTokens, trackUsage } from '@/lib/ai/cost-tracking';
import { genAI, GEMINI_MODEL } from '@/lib/gemini';

// Types
export interface AIContext {
  type: 'global' | 'trip' | 'destination' | 'city';
  // Trip context
  trip?: {
    id?: string;
    title: string;
    city: string;
    days: {
      dayNumber: number;
      date?: string;
      items: {
        name: string;
        category?: string;
        timeSlot?: string;
        slug: string;
      }[];
    }[];
    startDate?: string;
    endDate?: string;
  };
  // Current destination being viewed
  destination?: {
    slug: string;
    name: string;
    city: string;
    category?: string;
  };
  // Current city being browsed
  city?: string;
  // Page context
  page?: string;
}

export interface ProactiveSuggestion {
  id: string;
  type: 'tip' | 'warning' | 'recommendation' | 'action';
  title: string;
  description: string;
  action?: {
    type: 'add_to_trip' | 'search' | 'navigate' | 'optimize';
    label: string;
    payload?: Record<string, unknown>;
  };
  destinations?: {
    slug: string;
    name: string;
    city: string;
    category?: string;
    image?: string;
  }[];
  priority: number;
  reasoning?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Session storage (in production, use Redis or database)
const sessionCache = new Map<string, {
  messages: ChatMessage[];
  context?: AIContext;
  lastActive: number;
}>();

// Clean up old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  for (const [key, session] of sessionCache.entries()) {
    if (now - session.lastActive > maxAge) {
      sessionCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate proactive suggestions based on context
 */
async function generateProactiveSuggestions(
  context: AIContext,
  userId?: string
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = [];
  const supabase = await createServerClient();

  // Trip-specific suggestions
  if (context.type === 'trip' && context.trip) {
    const trip = context.trip;

    // Check for missing meals
    for (const day of trip.days) {
      const hasMorningFood = day.items.some(i => {
        const cat = (i.category || '').toLowerCase();
        const time = parseInt(i.timeSlot?.split(':')[0] || '0');
        return (cat.includes('cafe') || cat.includes('breakfast') || cat.includes('bakery')) && time < 11;
      });

      const hasLunch = day.items.some(i => {
        const cat = (i.category || '').toLowerCase();
        const time = parseInt(i.timeSlot?.split(':')[0] || '0');
        return cat.includes('restaurant') && time >= 11 && time <= 14;
      });

      const hasDinner = day.items.some(i => {
        const cat = (i.category || '').toLowerCase();
        const time = parseInt(i.timeSlot?.split(':')[0] || '0');
        return cat.includes('restaurant') && time >= 18;
      });

      if (day.items.length >= 2 && !hasLunch) {
        // Fetch lunch recommendations from curated list
        const { data: lunchSpots } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image_thumbnail')
          .ilike('city', `%${trip.city}%`)
          .ilike('category', '%restaurant%')
          .order('rating', { ascending: false })
          .limit(3);

        suggestions.push({
          id: `missing-lunch-day-${day.dayNumber}`,
          type: 'recommendation',
          title: `Day ${day.dayNumber} needs lunch`,
          description: `Your itinerary is packed but missing a lunch spot. Here are some curated options in ${trip.city}.`,
          action: {
            type: 'search',
            label: 'Find restaurants',
            payload: { query: `lunch restaurants ${trip.city}`, day: day.dayNumber },
          },
          destinations: lunchSpots?.map(d => ({
            slug: d.slug,
            name: d.name,
            city: d.city,
            category: d.category,
            image: d.image_thumbnail,
          })),
          priority: 80,
          reasoning: 'Day has 2+ activities but no lunch scheduled between 11am-2pm',
        });
      }

      if (day.items.length >= 3 && !hasDinner) {
        const { data: dinnerSpots } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image_thumbnail')
          .ilike('city', `%${trip.city}%`)
          .ilike('category', '%restaurant%')
          .order('rating', { ascending: false })
          .limit(3);

        suggestions.push({
          id: `missing-dinner-day-${day.dayNumber}`,
          type: 'recommendation',
          title: `Day ${day.dayNumber} needs dinner`,
          description: `You have a full day planned but no dinner reservation yet.`,
          action: {
            type: 'search',
            label: 'Find dinner spots',
            payload: { query: `dinner restaurants ${trip.city}`, day: day.dayNumber },
          },
          destinations: dinnerSpots?.map(d => ({
            slug: d.slug,
            name: d.name,
            city: d.city,
            category: d.category,
            image: d.image_thumbnail,
          })),
          priority: 75,
          reasoning: 'Day has 3+ activities but no dinner scheduled after 6pm',
        });
      }
    }

    // Check for empty days
    const emptyDays = trip.days.filter(d => d.items.length === 0);
    if (emptyDays.length > 0) {
      const { data: topPicks } = await supabase
        .from('destinations')
        .select('slug, name, city, category, image_thumbnail')
        .ilike('city', `%${trip.city}%`)
        .order('rating', { ascending: false })
        .limit(5);

      for (const day of emptyDays.slice(0, 2)) {
        suggestions.push({
          id: `empty-day-${day.dayNumber}`,
          type: 'tip',
          title: `Day ${day.dayNumber} is empty`,
          description: `Start planning with these top picks in ${trip.city}`,
          action: {
            type: 'search',
            label: 'Explore activities',
            payload: { query: `things to do ${trip.city}`, day: day.dayNumber },
          },
          destinations: topPicks?.map(d => ({
            slug: d.slug,
            name: d.name,
            city: d.city,
            category: d.category,
            image: d.image_thumbnail,
          })),
          priority: 90,
        });
      }
    }

    // Suggest based on category gaps
    const allCategories = trip.days.flatMap(d => d.items.map(i => i.category?.toLowerCase() || ''));
    const hasRestaurant = allCategories.some(c => c.includes('restaurant'));
    const hasCafe = allCategories.some(c => c.includes('cafe') || c.includes('coffee'));
    const hasCulture = allCategories.some(c => c.includes('museum') || c.includes('gallery') || c.includes('culture'));

    if (!hasCulture && trip.days.length >= 2) {
      const { data: cultureSpots } = await supabase
        .from('destinations')
        .select('slug, name, city, category, image_thumbnail')
        .ilike('city', `%${trip.city}%`)
        .or('category.ilike.%museum%,category.ilike.%gallery%,category.ilike.%culture%')
        .order('rating', { ascending: false })
        .limit(3);

      if (cultureSpots && cultureSpots.length > 0) {
        suggestions.push({
          id: 'add-culture',
          type: 'recommendation',
          title: 'Add some culture',
          description: `Your trip is missing cultural experiences. ${trip.city} has amazing museums and galleries.`,
          action: {
            type: 'search',
            label: 'Explore culture',
            payload: { query: `museums galleries culture ${trip.city}` },
          },
          destinations: cultureSpots.map(d => ({
            slug: d.slug,
            name: d.name,
            city: d.city,
            category: d.category,
            image: d.image_thumbnail,
          })),
          priority: 60,
        });
      }
    }
  }

  // City browsing suggestions
  if (context.type === 'city' && context.city) {
    const { data: highlights } = await supabase
      .from('destinations')
      .select('slug, name, city, category, image_thumbnail')
      .ilike('city', `%${context.city}%`)
      .order('rating', { ascending: false })
      .limit(5);

    if (highlights && highlights.length > 0) {
      suggestions.push({
        id: 'city-highlights',
        type: 'tip',
        title: `Top picks in ${context.city}`,
        description: 'Our curated selection of the best spots',
        destinations: highlights.map(d => ({
          slug: d.slug,
          name: d.name,
          city: d.city,
          category: d.category,
          image: d.image_thumbnail,
        })),
        priority: 50,
      });
    }
  }

  // Sort by priority
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

/**
 * Build system prompt with context awareness
 */
function buildSystemPrompt(context?: AIContext, conversationHistory?: ChatMessage[]): string {
  let prompt = `You are Urban Manual's AI travel assistant. You help users discover and plan trips to amazing destinations from our curated collection of 900+ places worldwide.

GUIDELINES:
- Be concise and helpful (2-3 sentences max for most responses)
- Focus on actionable recommendations
- Reference the curated list when possible
- For trip planning, consider timing, meals, and logistics
- Use a warm, knowledgeable tone

CAPABILITIES:
- Search destinations by city, category, or style
- Help plan and optimize trip itineraries
- Recommend restaurants, hotels, cafes, bars, and cultural spots
- Provide local insights and tips`;

  if (context?.type === 'trip' && context.trip) {
    const trip = context.trip;
    const itemCount = trip.days.reduce((sum, d) => sum + d.items.length, 0);

    prompt += `\n\nCURRENT TRIP CONTEXT:
- Trip: "${trip.title}" to ${trip.city}
- Duration: ${trip.days.length} day${trip.days.length > 1 ? 's' : ''}
- Items planned: ${itemCount}`;

    if (trip.startDate) {
      prompt += `\n- Dates: ${trip.startDate}${trip.endDate ? ` to ${trip.endDate}` : ''}`;
    }

    // Add itinerary summary
    prompt += '\n\nITINERARY:';
    for (const day of trip.days) {
      prompt += `\n\nDay ${day.dayNumber}${day.date ? ` (${day.date})` : ''}:`;
      if (day.items.length === 0) {
        prompt += '\n  (empty)';
      } else {
        for (const item of day.items) {
          prompt += `\n  - ${item.timeSlot || '??:??'}: ${item.name} (${item.category || 'activity'})`;
        }
      }
    }

    prompt += `\n\nWhen user asks about their trip, reference this itinerary. Suggest improvements like:
- Missing meals (breakfast, lunch, dinner)
- Long gaps between activities
- Geographically inefficient routing
- Category balance (mixing culture, food, leisure)`;
  }

  if (context?.type === 'destination' && context.destination) {
    prompt += `\n\nUSER IS VIEWING:
- ${context.destination.name} in ${context.destination.city}
- Category: ${context.destination.category || 'place'}

Be ready to answer questions about this place or suggest similar/nearby options.`;
  }

  if (context?.type === 'city' && context.city) {
    prompt += `\n\nUSER IS BROWSING: ${context.city}
Be ready to recommend highlights and hidden gems in this city.`;
  }

  return prompt;
}

/**
 * Search for destinations
 */
async function searchDestinations(
  query: string,
  context?: AIContext,
  limit: number = 10
): Promise<any[]> {
  const supabase = await createServerClient();

  // Try Discovery Engine first
  try {
    const discoveryEngine = getDiscoveryEngineService();
    if (discoveryEngine.isAvailable()) {
      const result = await unifiedSearch({
        query,
        city: context?.city || context?.trip?.city,
        pageSize: limit,
        useCache: true,
      });

      if (result?.results?.length > 0) {
        return result.results;
      }
    }
  } catch (error) {
    console.error('[AI Chat] Discovery Engine error:', error);
  }

  // Fallback to Supabase
  let dbQuery = supabase
    .from('destinations')
    .select('slug, name, city, category, image_thumbnail, rating, description')
    .is('parent_destination_id', null)
    .limit(limit);

  // Add city filter if available
  const city = context?.city || context?.trip?.city;
  if (city) {
    dbQuery = dbQuery.ilike('city', `%${city}%`);
  }

  // Text search
  dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`);

  const { data, error } = await dbQuery.order('rating', { ascending: false });

  if (error) {
    console.error('[AI Chat] Supabase search error:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate AI response
 */
async function generateResponse(
  message: string,
  context?: AIContext,
  conversationHistory: ChatMessage[] = [],
  userId?: string
): Promise<{
  content: string;
  destinations: any[];
  suggestions: ProactiveSuggestion[];
}> {
  const systemPrompt = buildSystemPrompt(context, conversationHistory);

  // Determine if we need to search
  const searchTerms = message.toLowerCase();
  const needsSearch = searchTerms.includes('find') ||
    searchTerms.includes('show') ||
    searchTerms.includes('recommend') ||
    searchTerms.includes('search') ||
    searchTerms.includes('best') ||
    searchTerms.includes('where') ||
    searchTerms.includes('restaurant') ||
    searchTerms.includes('hotel') ||
    searchTerms.includes('cafe') ||
    searchTerms.includes('bar') ||
    searchTerms.includes('museum');

  let destinations: any[] = [];
  if (needsSearch) {
    destinations = await searchDestinations(message, context, 10);
  }

  // Build messages for LLM
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-6).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: destinations.length > 0
        ? `${message}\n\n[Search Results: ${destinations.slice(0, 5).map(d => `${d.name} (${d.city}, ${d.category})`).join(', ')}]`
        : message,
    },
  ];

  let content = '';

  // Try OpenAI
  if (openai?.chat) {
    try {
      const model = getModelForQuery(message, conversationHistory);
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 300,
      });

      content = response.choices?.[0]?.message?.content || '';
      trackOpenAIResponse(response, model, '/api/ai/chat', userId);
    } catch (error) {
      console.error('[AI Chat] OpenAI error:', error);
    }
  }

  // Fallback to Gemini
  if (!content && genAI) {
    try {
      const fullPrompt = `${systemPrompt}\n\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nuser: ${message}`;
      const geminiModel = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      });
      const result = await geminiModel.generateContent(fullPrompt);
      content = result.response.text();

      trackUsage({
        model: GEMINI_MODEL,
        inputTokens: estimateTokens(fullPrompt),
        outputTokens: estimateTokens(content),
        endpoint: '/api/ai/chat',
        userId,
      });
    } catch (error) {
      console.error('[AI Chat] Gemini error:', error);
    }
  }

  // Final fallback
  if (!content) {
    content = destinations.length > 0
      ? `I found ${destinations.length} places matching your search. Here are the top results.`
      : "I'm sorry, I couldn't process your request. Please try again.";
  }

  // Generate proactive suggestions
  const suggestions = context ? await generateProactiveSuggestions(context, userId) : [];

  return { content, destinations, suggestions };
}

// =============================================================================
// API HANDLERS
// =============================================================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Get user session
  const supabase = await createServerClient();
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const userId = authSession?.user?.id;

  // Rate limiting
  const identifier = getIdentifier(request, userId);
  const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Too many requests. Please wait a moment.',
      limit,
      remaining,
      reset
    );
  }

  // Parse request
  const body = await request.json();
  const {
    message,
    sessionId,
    context,
    includeProactiveSuggestions = true,
  } = body as {
    message: string;
    sessionId?: string;
    context?: AIContext;
    includeProactiveSuggestions?: boolean;
  };

  // Validate
  if (!message || message.trim().length < 2) {
    throw createValidationError('Message is required');
  }

  // Get or create session
  const session = sessionId
    ? sessionCache.get(sessionId) || { messages: [], lastActive: Date.now() }
    : { messages: [], lastActive: Date.now() };

  // Update session context
  if (context) {
    session.context = context;
  }

  // Generate response
  const { content, destinations, suggestions } = await generateResponse(
    message.trim(),
    session.context || context,
    session.messages,
    userId
  );

  // Update session
  session.messages.push({ role: 'user', content: message.trim() });
  session.messages.push({ role: 'assistant', content });
  session.lastActive = Date.now();

  // Keep only last 20 messages
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  // Save session
  const newSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  sessionCache.set(newSessionId, session);

  return NextResponse.json({
    success: true,
    data: {
      content,
      destinations: destinations.slice(0, 10),
      suggestions: includeProactiveSuggestions ? suggestions : [],
      sessionId: newSessionId,
      messageCount: session.messages.length,
    },
  });
});

/**
 * GET - Get proactive suggestions without chat
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // Get user session
  const supabase = await createServerClient();
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const userId = authSession?.user?.id;

  // Parse context from query params
  const contextType = searchParams.get('contextType') as AIContext['type'] || 'global';
  const city = searchParams.get('city') || undefined;
  const tripJson = searchParams.get('trip');

  let context: AIContext = { type: contextType };

  if (city) {
    context.city = city;
  }

  if (tripJson) {
    try {
      context.trip = JSON.parse(tripJson);
      context.type = 'trip';
    } catch {
      // Invalid trip JSON, ignore
    }
  }

  const suggestions = await generateProactiveSuggestions(context, userId);

  return NextResponse.json({
    success: true,
    data: { suggestions },
  });
});
