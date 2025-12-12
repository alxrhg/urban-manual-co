/**
 * OpenAI Responses API Integration
 *
 * Migrated from Assistants API (sunset mid-2026) to Chat Completions with Tools
 * This implementation uses Chat Completions API with function calling, which provides:
 * - Custom tools for curated destination search
 * - Lower latency (no polling required like Assistants)
 * - Streaming support
 *
 * When OpenAI Responses API is fully available in the SDK, this can be upgraded.
 * The Responses API will add:
 * - Built-in web search
 * - Built-in file search
 * - MCP server support
 */

import { getOpenAI } from '../openai';
import { createServerClient } from '@/lib/supabase/server';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { trackUsage, estimateTokens, trackOpenAIResponse } from '@/lib/ai/cost-tracking';
import { rerankDestinations } from '@/lib/search/reranker';
import { generateFollowUpSuggestions } from '@/lib/chat/generateFollowUpSuggestions';

// Models - using GPT-4.1 series for best performance
const RESPONSES_MODEL = process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o';
const RESPONSES_MODEL_MINI = process.env.OPENAI_RESPONSES_MODEL_MINI || 'gpt-4o-mini';

// Category synonym mapping (matches ai-chat)
const CATEGORY_SYNONYMS: Record<string, string> = {
  'restaurant': 'Restaurant',
  'dining': 'Restaurant',
  'food': 'Restaurant',
  'eat': 'Restaurant',
  'meal': 'Restaurant',
  'hotel': 'Hotel',
  'stay': 'Hotel',
  'accommodation': 'Hotel',
  'lodging': 'Hotel',
  'cafe': 'Cafe',
  'coffee': 'Cafe',
  'bar': 'Bar',
  'drink': 'Bar',
  'cocktail': 'Bar',
  'nightlife': 'Bar',
  'culture': 'Culture',
  'museum': 'Culture',
  'art': 'Culture',
  'gallery': 'Culture'
};

// Intent type definition
export interface ParsedIntent {
  keywords: string[];
  city?: string;
  category?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
  intent?: string;
  confidence?: number;
  clarifications?: string[];
  inferredTags?: {
    neighborhoods?: string[];
    styleTags?: string[];
    priceLevel?: string;
    modifiers?: string[];
  };
  tripPlanning?: {
    isTrip?: boolean;
    tripType?: 'weekend' | 'day' | 'week' | 'multi-day' | null;
    duration?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    travelers?: 'solo' | 'couple' | 'family' | 'group' | null;
    tripStyle?: 'adventure' | 'relaxation' | 'cultural' | 'foodie' | 'romantic' | 'business' | null;
  };
}

// Web search configuration (for future Responses API upgrade)
const WEB_SEARCH_CONFIG = {
  // Trusted travel domains for domain filtering
  allowedDomains: [
    'tripadvisor.com',
    'timeout.com',
    'lonelyplanet.com',
    'cntraveler.com',
    'theinfatuation.com',
    'eater.com',
    'michelin.com',
    'booking.com',
    'expedia.com',
    'yelp.com',
    'google.com/travel',
    'fodors.com',
    'frommers.com',
  ],
};

/**
 * Tool definitions for Chat Completions with function calling
 * Format compatible with OpenAI's tools parameter
 */
export const RESPONSES_TOOLS: Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}> = [
  // Custom tool: Search curated Urban Manual destinations
  {
    type: 'function' as const,
    function: {
      name: 'search_curated_destinations',
      description: `Search Urban Manual's curated collection of 900+ hand-picked destinations including restaurants, hotels, cafes, bars, and cultural spots. Use this for specific place recommendations from our editorial collection. Returns detailed information including ratings, Michelin stars, price levels, and descriptions.`,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query - can be natural language like "romantic dinner in Paris" or keywords',
          },
          city: {
            type: 'string',
            description: 'City name (e.g., "Tokyo", "Paris", "New York", "London")',
          },
          category: {
            type: 'string',
            enum: ['Restaurant', 'Hotel', 'Cafe', 'Bar', 'Culture', 'Shop'],
            description: 'Destination category',
          },
          priceLevel: {
            type: 'number',
            minimum: 1,
            maximum: 4,
            description: 'Price level: 1=budget, 2=moderate, 3=upscale, 4=luxury',
          },
          minRating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            description: 'Minimum rating filter',
          },
          michelinStars: {
            type: 'number',
            minimum: 1,
            maximum: 3,
            description: 'Filter for Michelin-starred restaurants only',
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 20,
            description: 'Maximum results to return (default: 10)',
          },
        },
        required: ['query'],
      },
    },
  },
  // Custom tool: Get destination details
  {
    type: 'function' as const,
    function: {
      name: 'get_destination_details',
      description: 'Get detailed information about a specific destination from Urban Manual by its slug or name. Returns full details including hours, address, photos, reviews, and more.',
      parameters: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'Destination slug (URL-friendly identifier) or exact name',
          },
        },
        required: ['slug'],
      },
    },
  },
  // Custom tool: Save destination
  {
    type: 'function' as const,
    function: {
      name: 'save_destination',
      description: "Save a destination to the user's bookmarks/saved places for later reference.",
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug to save',
          },
          note: {
            type: 'string',
            description: 'Optional note to add when saving',
          },
        },
        required: ['destinationSlug'],
      },
    },
  },
  // Custom tool: Mark as visited
  {
    type: 'function' as const,
    function: {
      name: 'mark_visited',
      description: "Mark a destination as visited in the user's travel history.",
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug to mark as visited',
          },
          rating: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: "User's rating (1-5 stars)",
          },
          review: {
            type: 'string',
            description: "User's brief review or notes",
          },
        },
        required: ['destinationSlug'],
      },
    },
  },
];

/**
 * Extract intent from user query using OpenAI
 * Matches the functionality from ai-chat for consistency
 */
export async function extractIntent(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<ParsedIntent> {
  const openai = getOpenAI();

  // Fallback to simple parsing if OpenAI unavailable
  if (!openai?.chat) {
    return parseQueryFallback(query);
  }

  try {
    const systemPrompt = `You are a travel search intent analyzer. Extract structured information from travel/dining queries. Return ONLY valid JSON with this structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "category": "category like Restaurant/Cafe/Hotel/Bar/Culture/Shop or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null
  },
  "intent": "brief description of user intent",
  "confidence": 0.0-1.0,
  "clarifications": ["questions if query is ambiguous"],
  "inferredTags": {
    "neighborhoods": ["neighborhood names if mentioned"],
    "styleTags": ["minimalist", "contemporary", "traditional", "luxury"],
    "priceLevel": "$" to "$$$$" or null,
    "modifiers": ["quiet", "romantic", "trendy", "hidden gem"]
  },
  "tripPlanning": {
    "isTrip": true/false,
    "tripType": "weekend" | "day" | "week" | "multi-day" | null,
    "duration": number or null,
    "travelers": "solo" | "couple" | "family" | "group" | null,
    "tripStyle": "adventure" | "relaxation" | "cultural" | "foodie" | "romantic" | "business" | null
  }
}

Guidelines:
- Set tripPlanning.isTrip=true for queries like "plan my weekend in miami", "3 day trip to tokyo"
- Extract descriptive modifiers: romantic, cozy, luxury, budget, hidden, trendy
- For neighborhoods: Extract specific names (Daikanyama, Aoyama, Soho, etc.)
- Confidence should reflect how clear the query intent is
Return only the JSON, no other text.`;

    const conversationContext = conversationHistory.length > 0
      ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    const response = await openai.chat.completions.create({
      model: RESPONSES_MODEL_MINI,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Query: "${query}"${conversationContext}` }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const text = response.choices?.[0]?.message?.content || '';
    if (text) {
      const parsed = JSON.parse(text);
      // Normalize category
      if (parsed.category) {
        const normalized = CATEGORY_SYNONYMS[parsed.category.toLowerCase()];
        if (normalized) parsed.category = normalized;
      }
      return parsed;
    }
  } catch (error) {
    console.error('[Responses] Intent extraction error:', error);
  }

  return parseQueryFallback(query);
}

/**
 * Simple fallback query parser when AI is unavailable
 */
function parseQueryFallback(query: string): ParsedIntent {
  const lowerQuery = query.toLowerCase();
  let city: string | undefined;
  let category: string | undefined;

  // City detection
  const cityNames = ['tokyo', 'paris', 'london', 'new york', 'los angeles', 'singapore', 'hong kong', 'sydney', 'dubai', 'bangkok', 'berlin', 'amsterdam', 'rome', 'barcelona', 'lisbon', 'madrid', 'vienna', 'prague', 'stockholm', 'milan', 'taipei', 'seoul', 'shanghai', 'miami', 'san francisco', 'chicago', 'boston', 'seattle', 'toronto', 'vancouver', 'melbourne'];
  for (const cityName of cityNames) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }

  // Category detection
  for (const [keyword, cat] of Object.entries(CATEGORY_SYNONYMS)) {
    if (lowerQuery.includes(keyword)) {
      category = cat;
      break;
    }
  }

  // Trip planning detection
  const tripKeywords = ['plan', 'trip', 'itinerary', 'vacation', 'holiday', 'getaway'];
  const isTrip = tripKeywords.some(kw => lowerQuery.includes(kw));

  let tripType: 'weekend' | 'day' | 'week' | 'multi-day' | null = null;
  let duration: number | null = null;

  if (isTrip) {
    if (lowerQuery.includes('weekend')) {
      tripType = 'weekend';
      duration = 2;
    } else if (lowerQuery.includes('week')) {
      tripType = 'week';
      duration = 7;
    } else if (lowerQuery.match(/(\d+)\s*day/)) {
      const match = lowerQuery.match(/(\d+)\s*day/);
      duration = match ? parseInt(match[1]) : null;
      tripType = duration === 1 ? 'day' : 'multi-day';
    }
  }

  const keywords = query.split(/\s+/).filter(w => w.length > 2);

  return {
    keywords,
    city,
    category,
    intent: isTrip ? `planning a trip${city ? ` to ${city}` : ''}` : `finding ${category || 'places'}${city ? ` in ${city}` : ''}`,
    confidence: (city ? 0.7 : 0.5) + (category ? 0.2 : 0),
    tripPlanning: isTrip ? { isTrip: true, tripType, duration } : undefined,
    clarifications: isTrip && !city ? ['Where would you like to go?'] : undefined,
  };
}

/**
 * Enrich destinations with additional data (weather, events, photos)
 */
async function enrichDestinations(destinations: any[]): Promise<any[]> {
  if (destinations.length === 0) return destinations;

  const supabase = await createServerClient();
  const slugs = destinations.slice(0, 10).map((d: any) => d.slug);

  try {
    const { data: enrichmentData } = await supabase
      .from('destinations')
      .select('slug, photos_json, current_weather_json, weather_forecast_json, nearby_events_json, route_from_city_center_json, walking_time_from_center_minutes, static_map_url')
      .in('slug', slugs);

    if (!enrichmentData) return destinations;

    const enrichmentMap = new Map(enrichmentData.map((item: any) => [item.slug, item]));

    return destinations.map((dest: any) => {
      const enriched = enrichmentMap.get(dest.slug);
      if (enriched) {
        return {
          ...dest,
          photos: enriched.photos_json ? JSON.parse(enriched.photos_json) : null,
          currentWeather: enriched.current_weather_json ? JSON.parse(enriched.current_weather_json) : null,
          weatherForecast: enriched.weather_forecast_json ? JSON.parse(enriched.weather_forecast_json) : null,
          nearbyEvents: enriched.nearby_events_json ? JSON.parse(enriched.nearby_events_json) : null,
          routeFromCityCenter: enriched.route_from_city_center_json ? JSON.parse(enriched.route_from_city_center_json) : null,
          walkingTimeFromCenter: enriched.walking_time_from_center_minutes,
          staticMapUrl: enriched.static_map_url,
        };
      }
      return dest;
    });
  } catch (error) {
    console.debug('[Responses] Enrichment failed:', error);
    return destinations;
  }
}

/**
 * Execute a tool call from the Responses API
 */
export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  userId?: string
): Promise<{ result: any; error?: string }> {
  const supabase = await createServerClient();

  try {
    switch (toolName) {
      case 'search_curated_destinations': {
        const { query, city, category, priceLevel, minRating, michelinStars, limit = 10 } = args;

        // Build Supabase query (removed parent_destination_id filter to include nested destinations)
        let dbQuery = supabase
          .from('destinations')
          .select(
            'id, slug, name, city, country, category, description, micro_description, image, rating, price_level, michelin_stars, latitude, longitude, address, neighborhood'
          )
          .limit(Math.min(limit, 20)); // Cap at 20 for performance

        // Apply city filter - simple ilike (matches working ai-chat implementation)
        if (city) {
          dbQuery = dbQuery.ilike('city', `%${city}%`);
        }

        if (category) {
          dbQuery = dbQuery.ilike('category', `%${category}%`);
        }
        if (priceLevel) {
          dbQuery = dbQuery.lte('price_level', priceLevel);
        }
        if (minRating) {
          dbQuery = dbQuery.gte('rating', minRating);
        }
        if (michelinStars) {
          dbQuery = dbQuery.gte('michelin_stars', michelinStars);
        }

        // Text search - only apply if NO city filter (to avoid conflicts)
        // When city is provided, we just return all destinations in that city
        if (!city && query && query.trim()) {
          const stopWords = new Set(['in', 'the', 'a', 'an', 'for', 'at', 'to', 'best', 'good', 'nice', 'great', 'find', 'show', 'me', 'restaurants', 'hotel', 'hotels', 'bar', 'bars', 'cafe', 'cafes']);
          const searchTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 2)
            .filter((w: string) => !stopWords.has(w));

          if (searchTerms.length > 0) {
            const conditions = searchTerms.flatMap((term: string) => [
              `name.ilike.%${term}%`,
              `description.ilike.%${term}%`,
              `city.ilike.%${term}%`,
            ]);
            dbQuery = dbQuery.or(conditions.join(','));
          }
        }

        // Order by rating
        dbQuery = dbQuery.order('rating', { ascending: false, nullsFirst: false });

        const { data, error } = await dbQuery;

        if (error) {
          console.error('[Responses] Search error:', error);
          return { result: [], error: error.message };
        }

        // Log for debugging
        console.log(`[Responses] search_curated_destinations: city=${city}, category=${category}, query=${query}, results=${data?.length || 0}`);

        // Format results for the AI
        const results = (data || []).map((d: any) => ({
          name: d.name,
          slug: d.slug,
          city: d.city,
          country: d.country,
          category: d.category,
          description: d.micro_description || d.description?.substring(0, 200),
          rating: d.rating,
          priceLevel: d.price_level,
          michelinStars: d.michelin_stars,
          neighborhood: d.neighborhood,
          image: d.image,
        }));

        return {
          result: {
            destinations: results,
            count: results.length,
            query: { city, category, priceLevel, minRating, michelinStars },
          },
        };
      }

      case 'get_destination_details': {
        const { slug } = args;

        const { data, error } = await supabase
          .from('destinations')
          .select('*')
          .or(`slug.eq.${slug},name.ilike.%${slug}%`)
          .limit(1)
          .single();

        if (error || !data) {
          return { result: null, error: 'Destination not found' };
        }

        return {
          result: {
            name: data.name,
            slug: data.slug,
            city: data.city,
            country: data.country,
            category: data.category,
            description: data.description,
            microDescription: data.micro_description,
            rating: data.rating,
            priceLevel: data.price_level,
            michelinStars: data.michelin_stars,
            address: data.address,
            neighborhood: data.neighborhood,
            phone: data.phone,
            website: data.website,
            hours: data.hours,
            image: data.image,
            latitude: data.latitude,
            longitude: data.longitude,
            cuisineType: data.cuisine_type,
            tags: data.tags,
          },
        };
      }

      case 'save_destination': {
        if (!userId) {
          return { result: null, error: 'User must be logged in to save destinations' };
        }

        const { destinationSlug, note } = args;

        // Get destination ID
        const { data: dest } = await supabase
          .from('destinations')
          .select('id')
          .eq('slug', destinationSlug)
          .single();

        if (!dest) {
          return { result: null, error: 'Destination not found' };
        }

        // Save to saved_places
        const { error } = await supabase.from('saved_places').upsert(
          {
            user_id: userId,
            destination_id: dest.id,
            note: note || null,
            created_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,destination_id' }
        );

        if (error) {
          return { result: null, error: error.message };
        }

        return {
          result: {
            success: true,
            message: `Saved ${destinationSlug} to your places`,
          },
        };
      }

      case 'mark_visited': {
        if (!userId) {
          return { result: null, error: 'User must be logged in to mark places as visited' };
        }

        const { destinationSlug, rating, review } = args;

        // Get destination ID
        const { data: dest } = await supabase
          .from('destinations')
          .select('id')
          .eq('slug', destinationSlug)
          .single();

        if (!dest) {
          return { result: null, error: 'Destination not found' };
        }

        // Mark as visited
        const { error } = await supabase.from('visited_places').upsert(
          {
            user_id: userId,
            destination_id: dest.id,
            visited_at: new Date().toISOString(),
            rating: rating || null,
            review: review || null,
          },
          { onConflict: 'user_id,destination_id' }
        );

        if (error) {
          return { result: null, error: error.message };
        }

        return {
          result: {
            success: true,
            message: `Marked ${destinationSlug} as visited`,
          },
        };
      }

      default:
        return { result: null, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`[Responses] Tool execution error for ${toolName}:`, error);
    return { result: null, error: error.message };
  }
}

/**
 * Build system instructions for the travel assistant
 */
function buildSystemInstructions(userContext?: {
  favoriteCities?: string[];
  favoriteCategories?: string[];
  travelStyle?: string;
}): string {
  let instructions = `${URBAN_MANUAL_EDITOR_SYSTEM_PROMPT}

## Available Tools

You have access to the following tools:

1. **Web Search** - Use for real-time information:
   - Current events and festivals in cities
   - Restaurant hours and current status
   - Weather conditions
   - Recent reviews and news
   - Flight/hotel prices
   - Local tips and recent travel articles

2. **search_curated_destinations** - Use for finding places from Urban Manual's curated collection:
   - 900+ hand-picked restaurants, hotels, cafes, bars, and cultural spots
   - Editorial recommendations with detailed descriptions
   - Michelin-starred restaurants
   - Hidden gems selected by travel editors

3. **get_destination_details** - Get full details about a specific place

4. **save_destination** - Save a place to user's bookmarks

5. **mark_visited** - Mark a place as visited

## Guidelines

- ALWAYS use search_curated_destinations first for specific place recommendations
- Use web search for real-time info (hours, events, weather, recent news)
- Combine both: find curated places, then enrich with live web data
- Never invent places - only recommend destinations from our database
- Be concise (2-3 sentences) unless detailed info is requested
- Include relevant web citations when using real-time data
`;

  // Add user context if available
  if (userContext) {
    instructions += '\n## User Preferences\n';
    if (userContext.favoriteCities?.length) {
      instructions += `- Favorite cities: ${userContext.favoriteCities.join(', ')}\n`;
    }
    if (userContext.favoriteCategories?.length) {
      instructions += `- Favorite categories: ${userContext.favoriteCategories.join(', ')}\n`;
    }
    if (userContext.travelStyle) {
      instructions += `- Travel style: ${userContext.travelStyle}\n`;
    }
  }

  return instructions;
}

/**
 * Chat with OpenAI using Chat Completions with Tools
 * Handles tool calls automatically in a loop
 */
export async function chatWithResponses(options: {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    travelStyle?: string;
  };
  enableWebSearch?: boolean;
  maxToolCalls?: number;
}): Promise<{
  response: string;
  toolsUsed: string[];
  webSearchResults?: any[];
  curatedResults?: any[];
  citations?: Array<{ title: string; url: string }>;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
  // New fields matching ai-chat functionality
  intent?: ParsedIntent;
  suggestions?: Array<{ text: string; icon?: string; type?: string }>;
  tripPlanning?: {
    isTrip: boolean;
    tripType?: string | null;
    duration?: number | null;
    suggestedTitle?: string;
    destination?: string | null;
  };
  enriched?: {
    hasWeather: boolean;
    hasEvents: boolean;
    hasPhotos: boolean;
    hasRoutes: boolean;
  };
  inferredTags?: ParsedIntent['inferredTags'];
}> {
  const openai = getOpenAI();
  if (!openai?.chat) {
    throw new Error('OpenAI client not available');
  }

  const {
    message,
    conversationHistory = [],
    userId,
    userContext,
    maxToolCalls = 5,
  } = options;

  // Extract intent first (for trip planning detection, filters, etc.)
  const intent = await extractIntent(message, conversationHistory);
  console.log('[Responses] Extracted intent:', JSON.stringify(intent, null, 2));

  // Build messages array with system prompt
  const messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
  }> = [{ role: 'system', content: buildSystemInstructions(userContext) }];

  // Add conversation history
  for (const msg of conversationHistory.slice(-10)) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  // Track results
  const toolsUsed: string[] = [];
  let curatedResults: any[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Determine model based on query complexity
  const isComplex =
    message.length > 200 ||
    message.includes('compare') ||
    message.includes('plan') ||
    message.includes('itinerary') ||
    intent.tripPlanning?.isTrip;
  const model = isComplex ? RESPONSES_MODEL : RESPONSES_MODEL_MINI;

  try {
    // Initial API call with tools
    let response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      tools: RESPONSES_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Track usage
    if (response.usage) {
      totalInputTokens += response.usage.prompt_tokens || 0;
      totalOutputTokens += response.usage.completion_tokens || 0;
    }

    // Process tool calls in a loop
    let toolCallCount = 0;
    let currentMessages = [...messages];

    while (response.choices[0]?.message?.tool_calls && toolCallCount < maxToolCalls) {
      const toolCalls = response.choices[0].message.tool_calls;

      // Add assistant message with tool calls to history
      currentMessages.push(response.choices[0].message as any);

      // Process each tool call
      for (const toolCall of toolCalls) {
        toolCallCount++;
        const { id, function: func } = toolCall;
        const args = JSON.parse(func.arguments || '{}');

        toolsUsed.push(func.name);

        // Execute custom tool
        const { result, error } = await executeToolCall(func.name, args, userId);

        if (func.name === 'search_curated_destinations' && result?.destinations) {
          curatedResults = result.destinations;
        }

        // Add tool result to messages
        currentMessages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(error ? { error } : result),
        });
      }

      // Continue conversation with tool results
      response = await openai.chat.completions.create({
        model,
        messages: currentMessages as any,
        tools: RESPONSES_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      // Track usage
      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }
    }

    // Extract final text response
    const finalResponse =
      response.choices[0]?.message?.content ||
      'I apologize, but I was unable to generate a response.';

    // Track costs
    trackOpenAIResponse(response, model, '/api/responses', userId);

    // Enrich destinations with weather, events, photos
    let enrichedResults = curatedResults;
    if (curatedResults.length > 0) {
      enrichedResults = await enrichDestinations(curatedResults);
    }

    // Apply reranking based on query intent and context
    if (enrichedResults.length > 0) {
      const topResultForContext = enrichedResults[0];
      const enrichedContext = topResultForContext ? {
        currentWeather: topResultForContext.currentWeather || null,
        nearbyEvents: topResultForContext.nearbyEvents || null,
      } : null;

      enrichedResults = rerankDestinations(enrichedResults, {
        query: message,
        queryIntent: {
          city: intent.city,
          category: intent.category,
          price_level: intent.filters?.priceLevel,
          weather_preference: message.toLowerCase().includes('outdoor') ? 'outdoor' :
                            message.toLowerCase().includes('indoor') ? 'indoor' : null,
          event_context: message.toLowerCase().includes('event') || message.toLowerCase().includes('happening'),
        },
        userId,
        boostPersonalized: !!userId,
        enrichedContext: enrichedContext || undefined,
      });
    }

    // Generate follow-up suggestions
    let suggestions: Array<{ text: string; icon?: string; type?: string }> = [];
    try {
      const normalizedIntent = {
        ...intent,
        filters: intent.filters ? {
          ...intent.filters,
          priceLevel: intent.filters.priceLevel ? String(intent.filters.priceLevel) : undefined,
        } : undefined,
      };

      suggestions = generateFollowUpSuggestions({
        query: message,
        intent: normalizedIntent,
        destinations: enrichedResults,
        conversationHistory,
        userContext: userContext ? {
          favoriteCities: userContext.favoriteCities || [],
          favoriteCategories: userContext.favoriteCategories || [],
        } : undefined,
      });
    } catch (error) {
      console.debug('[Responses] Failed to generate suggestions:', error);
    }

    // Build enrichment metadata
    const enrichedMetadata = {
      hasWeather: enrichedResults.some((r: any) => r.currentWeather),
      hasEvents: enrichedResults.some((r: any) => r.nearbyEvents && r.nearbyEvents.length > 0),
      hasPhotos: enrichedResults.some((r: any) => r.photos && r.photos.length > 0),
      hasRoutes: enrichedResults.some((r: any) => r.routeFromCityCenter),
    };

    // Build trip planning response if detected
    const tripPlanningResponse = intent.tripPlanning?.isTrip ? {
      isTrip: true,
      tripType: intent.tripPlanning.tripType,
      duration: intent.tripPlanning.duration,
      suggestedTitle: intent.tripPlanning.tripType
        ? `${intent.tripPlanning.tripType.charAt(0).toUpperCase() + intent.tripPlanning.tripType.slice(1)} in ${intent.city || 'your destination'}`
        : `Trip to ${intent.city || 'your destination'}`,
      destination: intent.city || null,
    } : undefined;

    return {
      response: finalResponse,
      toolsUsed,
      curatedResults: enrichedResults.length > 0 ? enrichedResults : undefined,
      model,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
      intent,
      suggestions,
      tripPlanning: tripPlanningResponse,
      enriched: enrichedMetadata,
      inferredTags: intent.inferredTags,
    };
  } catch (error: any) {
    console.error('[Responses] API error:', error);
    throw error;
  }
}

/**
 * Stream chat response with Chat Completions API
 */
export async function* streamChatWithResponses(options: {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  userId?: string;
  userContext?: {
    favoriteCities?: string[];
    favoriteCategories?: string[];
    travelStyle?: string;
  };
  enableWebSearch?: boolean;
}): AsyncGenerator<
  | { type: 'text'; content: string }
  | { type: 'tool_start'; name: string }
  | { type: 'tool_result'; name: string; result: any }
  | { type: 'destinations'; data: any[] }
  | { type: 'citations'; data: Array<{ title: string; url: string }> }
  | { type: 'done'; usage?: { inputTokens: number; outputTokens: number } }
> {
  const openai = getOpenAI();
  if (!openai?.chat) {
    throw new Error('OpenAI client not available');
  }

  const { message, conversationHistory = [], userId, userContext } = options;

  // Build messages with system prompt
  const messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
  }> = [{ role: 'system', content: buildSystemInstructions(userContext) }];

  for (const msg of conversationHistory.slice(-10)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: 'user', content: message });

  const isComplex = message.length > 200 || message.includes('plan');
  const model = isComplex ? RESPONSES_MODEL : RESPONSES_MODEL_MINI;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // First, make a non-streaming call to handle tool calls
    let response = await openai.chat.completions.create({
      model,
      messages: messages as any,
      tools: RESPONSES_TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (response.usage) {
      totalInputTokens += response.usage.prompt_tokens || 0;
      totalOutputTokens += response.usage.completion_tokens || 0;
    }

    let currentMessages = [...messages];
    let toolCallCount = 0;
    const maxToolCalls = 5;

    // Process tool calls
    while (response.choices[0]?.message?.tool_calls && toolCallCount < maxToolCalls) {
      const toolCalls = response.choices[0].message.tool_calls;
      currentMessages.push(response.choices[0].message as any);

      for (const toolCall of toolCalls) {
        toolCallCount++;
        const { id, function: func } = toolCall;
        const args = JSON.parse(func.arguments || '{}');

        yield { type: 'tool_start', name: func.name };

        const { result, error } = await executeToolCall(func.name, args, userId);

        yield {
          type: 'tool_result',
          name: func.name,
          result: error ? { error } : result,
        };

        if (func.name === 'search_curated_destinations' && result?.destinations) {
          yield { type: 'destinations', data: result.destinations };
        }

        currentMessages.push({
          role: 'tool',
          tool_call_id: id,
          content: JSON.stringify(error ? { error } : result),
        });
      }

      // Get next response
      response = await openai.chat.completions.create({
        model,
        messages: currentMessages as any,
        tools: RESPONSES_TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      if (response.usage) {
        totalInputTokens += response.usage.prompt_tokens || 0;
        totalOutputTokens += response.usage.completion_tokens || 0;
      }
    }

    // Now stream the final text response
    if (response.choices[0]?.message?.content) {
      // If we already have content from non-streaming, yield it in chunks
      const content = response.choices[0].message.content;
      const chunkSize = 20;
      for (let i = 0; i < content.length; i += chunkSize) {
        yield { type: 'text', content: content.slice(i, i + chunkSize) };
        // Small delay for streaming effect
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } else if (!response.choices[0]?.message?.tool_calls) {
      // Stream final response if no tool calls pending
      const stream = await openai.chat.completions.create({
        model,
        messages: currentMessages as any,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { type: 'text', content };
        }
      }
    }

    // Track costs
    trackUsage({
      model,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      endpoint: '/api/responses/stream',
      userId,
    });

    yield {
      type: 'done',
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  } catch (error: any) {
    console.error('[Responses Stream] Error:', error);
    throw error;
  }
}

export { RESPONSES_MODEL, RESPONSES_MODEL_MINI, WEB_SEARCH_CONFIG };
