import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { embedText } from '@/lib/llm';
import { rerankDestinations } from '@/lib/search/reranker';
import { searchAsimov, mapAsimovResultsToDestinations } from '@/lib/search/asimov';
import { applyRateLimit, getRateLimitHeaders, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rateLimit';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Simple in-memory cache for search results
interface CacheEntry {
  data: any;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 100; // Limit cache size to prevent memory issues

function getCacheKey(query: string, intent: any): string {
  return `${query.toLowerCase()}_${intent.city || ''}_${intent.category || ''}`;
}

function getFromCache(key: string): any | null {
  const entry = searchCache.get(key);
  if (!entry) return null;

  // Check if cache entry is still valid
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }

  return entry.data;
}

function setInCache(key: string, data: any): void {
  // Implement simple LRU by removing oldest entry if cache is full
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }

  searchCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Category synonym mapping
const CATEGORY_SYNONYMS: Record<string, string> = {
  'restaurant': 'Dining',
  'dining': 'Dining',
  'food': 'Dining',
  'eat': 'Dining',
  'meal': 'Dining',
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

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openai?.embeddings) {
    console.error('[AI Chat] No OpenAI client available');
    return null;
  }

  try {
    return await embedText(text);
  } catch (error) {
    console.error('[AI Chat] Error generating embedding:', error);
    return null;
  }
}

// AI-powered query understanding with conversation context
async function understandQuery(
  query: string,
  conversationHistory: Array<{role: string, content: string}> = [],
  userId?: string
): Promise<{
  keywords: string[];
  city?: string;
  category?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
  intent?: string; // User's apparent intent (e.g., "find", "compare", "recommend")
  confidence?: number; // 0-1 confidence score
  clarifications?: string[]; // Questions to clarify ambiguous queries
}> {
  if (!openai?.chat) {
    return parseQueryFallback(query);
  }

  try {
    // Build conversation context string
    const conversationContext = conversationHistory.length > 0
      ? `\n\nConversation History:\n${conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';

    // Fetch user preferences if available
    let userContext = '';
    if (userId) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style, interests')
          .eq('user_id', userId)
          .single();
        
        // Handle errors gracefully - user_profiles might not exist or RLS might block
        if (!profileError && profile) {
          const contextParts = [];
          if (profile.favorite_cities?.length > 0) {
            contextParts.push(`Favorite cities: ${profile.favorite_cities.join(', ')}`);
          }
          if (profile.favorite_categories?.length > 0) {
            contextParts.push(`Favorite categories: ${profile.favorite_categories.join(', ')}`);
          }
          if (profile.travel_style) {
            contextParts.push(`Travel style: ${profile.travel_style}`);
          }
          if (contextParts.length > 0) {
            userContext = `\n\nUser Preferences: ${contextParts.join('; ')}`;
          }
        }
      } catch (error) {
        // Silently fail - user context is optional
        console.debug('User profile fetch failed (optional):', error);
      }
    }

    const systemPrompt = `You are a travel search intent analyzer. Extract structured information from travel/dining queries with full context. Return ONLY valid JSON with this exact structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "category": "category like restaurant/cafe/hotel or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null
  },
  "intent": "brief description of user intent (e.g., 'finding romantic dinner spots', 'comparing hotels', 'discovering hidden gems')",
  "confidence": 0.0-1.0,
  "clarifications": ["array", "of", "suggested", "questions", "if", "query", "is", "ambiguous"]
}

Guidelines:
- Use conversation history to resolve pronouns and references (e.g., "show me more like this" refers to previous results)
- Use "more", "another", "similar" to expand on previous queries
- If query is ambiguous (e.g., just "hotels" without city), set clarifications with helpful questions
- Extract descriptive modifiers: romantic, cozy, luxury, budget, hidden, trendy, etc. as keywords
- Detect weather-related queries: "rainy day", "outdoor", "indoor", "weather" → suggest weather-aware recommendations
- Detect event-related queries: "events", "happening", "festival", "concert" → boost places near events
- Confidence should reflect how clear the query intent is
- For relative queries ("more", "another", "different"), infer intent from conversation history

Return only the JSON, no other text.`;

    const userPrompt = `Query: "${query}"${conversationContext}${userContext}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const text = response.choices?.[0]?.message?.content || '';
    
    if (text) {
      try {
        const parsed = JSON.parse(text);
        console.log('[AI Chat] Enhanced parsed intent:', parsed);
        
        // If query contains relative terms, enhance intent from conversation
        const lowerQuery = query.toLowerCase();
        if ((lowerQuery.includes('more') || lowerQuery.includes('another') || lowerQuery.includes('similar') || lowerQuery.includes('different')) && conversationHistory.length > 0) {
          // Try to extract context from last assistant response
          const lastAssistant = conversationHistory.filter(m => m.role === 'assistant').pop();
          if (lastAssistant) {
            // Infer category/city from previous conversation
            const lastContent = lastAssistant.content.toLowerCase();
            if (!parsed.city && lastContent.includes('in ')) {
              const cityMatch = lastContent.match(/in ([a-z\s]+?)(?:\.|,|$)/);
              if (cityMatch) parsed.city = cityMatch[1].trim();
            }
            if (!parsed.category && (lastContent.includes('place') || lastContent.includes('restaurant') || lastContent.includes('hotel'))) {
              if (lastContent.includes('restaurant')) parsed.category = 'Dining';
              else if (lastContent.includes('hotel')) parsed.category = 'Hotel';
              else if (lastContent.includes('cafe')) parsed.category = 'Cafe';
            }
          }
        }
        
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    }
  } catch (error) {
    console.error('[AI Chat] LLM error:', error);
  }

  return parseQueryFallback(query);
}

function parseQueryFallback(query: string): {
  keywords: string[];
  city?: string;
  category?: string;
  filters?: any;
  intent?: string;
  confidence?: number;
  clarifications?: string[];
} {
  const lowerQuery = query.toLowerCase();
  let city: string | undefined;
  let category: string | undefined;
  
  // Extract city
  const cityNames = ['tokyo', 'paris', 'london', 'new york', 'los angeles', 'singapore', 'hong kong', 'sydney', 'dubai', 'bangkok', 'berlin', 'amsterdam', 'rome', 'barcelona', 'lisbon', 'madrid', 'vienna', 'prague', 'stockholm', 'oslo', 'copenhagen', 'helsinki', 'milan', 'taipei', 'seoul', 'shanghai', 'beijing', 'mumbai', 'delhi', 'istanbul', 'moscow', 'sao paulo', 'mexico city', 'buenos aires', 'miami', 'san francisco', 'chicago', 'boston', 'seattle', 'toronto', 'vancouver', 'melbourne', 'auckland'];
  
  for (const cityName of cityNames) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }
  
  // Extract category
  const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'bakery', 'culture', 'dining', 'museum', 'gallery', 'shop', 'market'];
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      category = cat;
      break;
    }
  }
  
  // Extract keywords (words not in city or category)
  const keywords: string[] = [];
  const words = query.split(/\s+/);
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!city?.includes(lowerWord) && !category?.includes(lowerWord)) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
  }

  return {
    keywords,
    city,
    category,
    intent: `finding ${category || 'places'}${city ? ` in ${city}` : ''}`,
    confidence: (city ? 0.7 : 0.5) + (category ? 0.2 : 0),
  };
}

// Generate natural language response
// Generate intelligent response leveraging enriched data
async function generateIntelligentResponse(
  results: any[],
  query: string,
  intent: any,
  enhancedIntent: any,
  userId?: string
): Promise<string> {
  if (results.length === 0) {
    return "I couldn't find any places matching your search. Try adjusting your filters or search terms.";
  }

  // Get contextual information from enriched data
  const topResults = results.slice(0, 5);
  const hasWeather = topResults.some((r: any) => r.currentWeather);
  const hasEvents = topResults.some((r: any) => r.nearbyEvents && r.nearbyEvents.length > 0);
  const hasRoutes = topResults.some((r: any) => r.routeFromCityCenter);
  const hasPhotos = topResults.some((r: any) => r.photos && r.photos.length > 0);

  // Build context string for AI
  let contextInfo = '';
  
  if (hasWeather && topResults[0]?.currentWeather) {
    const weather = topResults[0].currentWeather;
    contextInfo += `\nCurrent weather: ${weather.temperature}°C, ${weather.weatherDescription}`;
    
    // Weather-aware suggestions
    if (weather.weatherCode >= 61 && weather.weatherCode <= 86) {
      // Rainy/snowy weather
      contextInfo += '\n💡 Weather note: It\'s raining/snowing - consider indoor options or places with covered outdoor seating.';
    } else if (weather.weatherCode === 0 || weather.weatherCode === 1) {
      // Clear weather
      contextInfo += '\n💡 Weather note: Perfect weather for outdoor dining or rooftop experiences!';
    }
  }

  if (hasEvents && topResults[0]?.nearbyEvents) {
    const events = topResults[0].nearbyEvents;
    const upcomingEvents = events.slice(0, 3);
    if (upcomingEvents.length > 0) {
      contextInfo += `\n🎭 Nearby events: ${upcomingEvents.map((e: any) => e.name).join(', ')}`;
    }
  }

  if (hasRoutes && topResults[0]?.walkingTimeFromCenter) {
    const walkingTime = topResults[0].walkingTimeFromCenter;
    contextInfo += `\n🚶 Walking time from city center: ~${walkingTime} minutes`;
  }

  // Generate response using OpenAI if available
  if (openai?.chat) {
    try {
      const systemPrompt = `You are Urban Manual's intelligent travel assistant. You help users discover amazing places with rich, contextual insights.

AVAILABLE DATA FOR EACH DESTINATION:
- Photos: High-quality images from Google Places
- Weather: Current conditions + 7-day forecast (temperature, conditions, humidity)
- Events: Nearby upcoming events (concerts, exhibitions, festivals)
- Routes: Walking/driving times from city center
- Currency: Local currency and exchange rates

GUIDELINES:
- Mention weather context when relevant (e.g., "perfect for outdoor dining" or "great indoor option for rainy days")
- Highlight nearby events if they align with the search
- Note walking distances when helpful
- Use photos to describe ambiance/style
- Be concise but informative (2-3 sentences max)
- Match the user's tone (casual queries get casual responses)

${contextInfo}`;

      const userPrompt = `User searched: "${query}"
Found ${results.length} results.

Top results:
${topResults.slice(0, 5).map((r: any, i: number) => {
  let info = `${i + 1}. ${r.name} (${r.city})`;
  if (r.category) info += ` - ${r.category}`;
  if (r.rating) info += ` ⭐ ${r.rating}`;
  if (r.currentWeather) {
    info += ` | Weather: ${r.currentWeather.temperature}°C, ${r.currentWeather.weatherDescription}`;
  }
  if (r.walkingTimeFromCenter) {
    info += ` | ${r.walkingTimeFromCenter} min walk from center`;
  }
  if (r.nearbyEvents && r.nearbyEvents.length > 0) {
    info += ` | ${r.nearbyEvents.length} nearby events`;
  }
  return info;
}).join('\n')}

Generate a natural, helpful response that incorporates relevant context (weather, events, walking distance) when it adds value. Be conversational and concise.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const aiResponse = response.choices?.[0]?.message?.content || '';
      if (aiResponse) {
        return aiResponse.trim();
      }
    } catch (error) {
      console.error('[AI Chat] Error generating intelligent response:', error);
    }
  }

  // Fallback to simple response
  return generateResponse(results.length, intent.city, intent.category);
}

function generateResponse(count: number, city?: string, category?: string): string {
  const location = city ? ` in ${city}` : '';
  const categoryText = category ? ` ${category}` : ' place';
  
  if (count === 0) {
    return `I couldn't find any${categoryText}s${location}. Try a different search or browse all destinations.`;
  }
  
  if (count === 1) {
    return `I found 1${categoryText}${location}.`;
  }
  
  return `I found ${count}${categoryText}s${location}.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, userId, conversationHistory = [] } = body;

    // ✅ SECURITY FIX: Apply rate limiting (AI chat is expensive)
    const identifier = getRateLimitIdentifier(request, userId);
    const { success, ...rateLimit } = await applyRateLimit(identifier, RATE_LIMITS.AI_CHAT);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          limit: rateLimit.limit,
          reset: new Date(rateLimit.reset).toISOString(),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      );
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        content: 'Please enter a search query.',
        destinations: []
      });
    }

    // Get intent for search - using basic intent analysis for better performance
    const intent = await understandQuery(query, conversationHistory, userId);

    // Normalize category using synonyms
    if (intent.category) {
      const normalized = CATEGORY_SYNONYMS[intent.category.toLowerCase()];
      if (normalized) {
        intent.category = normalized;
      }
    }

    console.log('[AI Chat] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

    // Check cache for non-personalized searches
    if (!userId) {
      const cacheKey = getCacheKey(query, intent);
      const cachedResult = getFromCache(cacheKey);
      if (cachedResult) {
        console.log('[AI Chat] Returning cached results for:', query);
        return NextResponse.json(cachedResult);
      }
    }

    // Generate embedding for vector search
    const queryEmbedding = await generateEmbedding(query);

    let results: any[] = [];

    // Strategy 1: Vector similarity search (if embeddings available)
    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
          query_embedding: queryEmbedding,
          match_threshold: 0.6, // Lower threshold for more results
          match_count: 100, // Optimized for performance
          filter_city: intent.city || null,
          filter_category: intent.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || null,
          filter_min_rating: intent.filters?.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || null,
          search_query: query
        });

        if (!vectorError && vectorResults && vectorResults.length > 0) {
          results = vectorResults;
          console.log('[AI Chat] Vector search found', results.length, 'results');
        } else if (vectorError) {
          console.error('[AI Chat] Vector search error:', vectorError);
        }
      } catch (error: any) {
        console.error('[AI Chat] Vector search exception:', error);
      }
    }

    // Strategy 2: Asimov fallback (semantic search service)
    if (results.length === 0) {
      try {
        console.log('[AI Chat] Trying Asimov fallback...');
        const asimovResults = await searchAsimov({
          query,
          limit: 50,
          params: {
            category: intent.category || undefined,
            city: intent.city || undefined,
            language: 'en',
          },
          recall: 100,
        });

        if (asimovResults && asimovResults.length > 0) {
          // Get destinations from DB to match against Asimov results
          const { data: allDestinations } = await supabase
            .from('destinations')
            .select('*')
            .limit(100);

          const mapped = mapAsimovResultsToDestinations(asimovResults, allDestinations || []);
          
          if (mapped.length > 0) {
            results = mapped;
            console.log('[AI Chat] Asimov fallback found', results.length, 'results');
          }
        }
      } catch (error: any) {
        console.error('[AI Chat] Asimov fallback exception:', error);
      }
    }

    // Strategy 3: Basic keyword search fallback (last resort)
    if (results.length === 0) {
      try {
        console.log('[AI Chat] Trying basic keyword search fallback...');
        let fallbackQuery = supabase
          .from('destinations')
          .select('*')
          .limit(100); // Optimized for performance

        // Apply filters
        if (intent.city) {
          fallbackQuery = fallbackQuery.ilike('city', `%${intent.city}%`);
        }

        if (intent.category) {
          fallbackQuery = fallbackQuery.ilike('category', `%${intent.category}%`);
        }

        if (intent.filters?.rating) {
          fallbackQuery = fallbackQuery.gte('rating', intent.filters.rating);
        }

        if (intent.filters?.priceLevel) {
          fallbackQuery = fallbackQuery.lte('price_level', intent.filters.priceLevel);
        }

        if (intent.filters?.michelinStar) {
          fallbackQuery = fallbackQuery.gte('michelin_stars', intent.filters.michelinStar);
        }

        // Try full-text search on search_text if available
        const keywords = query.split(/\s+/).filter((w: string) => w.length > 2);
        if (keywords.length > 0) {
          const searchTerm = keywords.join(' | ');
          fallbackQuery = fallbackQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,search_text.ilike.%${query}%`);
        }

        const { data: fallbackResults, error: fallbackError } = await fallbackQuery;

        if (!fallbackError && fallbackResults) {
          results = fallbackResults;
          console.log('[AI Chat] Basic keyword fallback found', results.length, 'results');
        }
      } catch (error: any) {
        console.error('[AI Chat] Basic keyword fallback exception:', error);
      }
    }

    // Strategy 3: Last resort - show popular destinations in the city or globally
    if (results.length === 0 && intent.city) {
      try {
        const { data: cityResults } = await supabase
          .from('destinations')
          .select('*')
          .ilike('city', `%${intent.city}%`)
          .order('rating', { ascending: false })
          .limit(50);

        if (cityResults && cityResults.length > 0) {
          results = cityResults;
          console.log('[AI Chat] City fallback found', results.length, 'results');
        }
      } catch (error: any) {
        console.error('[AI Chat] City fallback exception:', error);
      }
    }

                // Enrich results with additional data (photos, weather, routes, events) BEFORE reranking
                // Batch fetch enrichment data in a single query for better performance
                const topResults = results.slice(0, 10);
                const slugsToEnrich = topResults.map((dest: any) => dest.slug);

                let enrichmentDataMap = new Map();
                if (slugsToEnrich.length > 0) {
                  try {
                    const { data: enrichmentData } = await supabase
                      .from('destinations')
                      .select('slug, photos_json, current_weather_json, weather_forecast_json, nearby_events_json, route_from_city_center_json, walking_time_from_center_minutes, static_map_url, currency_code, exchange_rate_to_usd')
                      .in('slug', slugsToEnrich);

                    if (enrichmentData) {
                      enrichmentData.forEach((item: any) => {
                        enrichmentDataMap.set(item.slug, item);
                      });
                    }
                  } catch (error) {
                    // Silently fail - enrichment is optional
                    console.debug('Enrichment batch fetch failed:', error);
                  }
                }

                const enrichedResults = topResults.map((dest: any) => {
                  const enriched = enrichmentDataMap.get(dest.slug);
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
                      currencyCode: enriched.currency_code,
                      exchangeRateToUSD: enriched.exchange_rate_to_usd,
                    };
                  }
                  return dest;
                });

                // Apply enhanced re-ranking to results with enriched context
                const topResultForContext = enrichedResults[0];
                const enrichedContext = topResultForContext ? {
                  currentWeather: topResultForContext.currentWeather || null,
                  nearbyEvents: topResultForContext.nearbyEvents || null,
                } : null;

                const rerankedResults = rerankDestinations(enrichedResults, {
                  query,
                  queryIntent: {
                    city: intent.city,
                    category: intent.category,
                    price_level: intent.filters?.priceLevel,
                    // Infer weather preference from query
                    weather_preference: query.toLowerCase().includes('outdoor') ? 'outdoor' :
                                      query.toLowerCase().includes('indoor') ? 'indoor' : null,
                    event_context: query.toLowerCase().includes('event') || query.toLowerCase().includes('happening'),
                  },
                  userId: userId,
                  boostPersonalized: !!userId,
                  enrichedContext: enrichedContext || undefined,
                });

                // Combine reranked enriched results with remaining unenriched results
                // This maintains performance while still showing all results
                const remainingResults = results.slice(10);
                const limitedResults = [...rerankedResults, ...remainingResults];

                // Generate intelligent response with enriched context
                const response = await generateIntelligentResponse(
                  limitedResults,
                  query,
                  intent,
                  intent, // Pass intent twice for backward compatibility
                  userId
                );

                // Generate enhanced response with context if needed
                let enhancedContent = response;
                if (intent.clarifications && intent.clarifications.length > 0 && limitedResults.length === 0) {
                  enhancedContent = `${response}\n\n💡 ${intent.clarifications[0]}`;
                }

    // Get intelligence insights only if city detected and we have results (optional feature for performance)
    // Disabled for better performance - can be re-enabled if needed
    let intelligenceInsights = null;
    // if (intent.city && limitedResults.length > 0) {
    //   try {
    //     const [forecast, opportunities] = await Promise.all([
    //       forecastingService.forecastDemand(intent.city, undefined, 30),
    //       opportunityDetectionService.detectOpportunities(userId, intent.city, 3),
    //     ]);

    //     intelligenceInsights = {
    //       forecast,
    //       opportunities: opportunities.slice(0, 3),
    //     };
    //   } catch (error) {
    //     // Silently fail - insights are optional
    //   }
    // }

                // Log search/chat interaction (best-effort)
                try {
                  await supabase.from('user_interactions').insert({
                    interaction_type: 'search',
                    user_id: userId || null,
                    destination_id: null,
                    metadata: {
                      query,
                      intent,
                      count: limitedResults.length,
                      source: 'api/ai-chat',
                    }
                  });
                } catch {}

                // Include enriched metadata in response
                const enrichedMetadata = {
                  hasWeather: limitedResults.some((r: any) => r.currentWeather),
                  hasEvents: limitedResults.some((r: any) => r.nearbyEvents && r.nearbyEvents.length > 0),
                  hasRoutes: limitedResults.some((r: any) => r.routeFromCityCenter),
                  hasPhotos: limitedResults.some((r: any) => r.photos && r.photos.length > 0),
                  totalPhotos: limitedResults.reduce((sum: number, r: any) => sum + (r.photos?.length || 0), 0),
                  totalEvents: limitedResults.reduce((sum: number, r: any) => sum + (r.nearbyEvents?.length || 0), 0),
                };

                const responseData = {
                  content: enhancedContent,
                  destinations: limitedResults,
                  intent: {
                    ...intent,
                    resultCount: limitedResults.length,
                    hasResults: limitedResults.length > 0
                  },
                  intelligence: intelligenceInsights,
                  enriched: enrichedMetadata, // Include enrichment metadata
                };

                // Cache non-personalized results
                if (!userId) {
                  const cacheKey = getCacheKey(query, intent);
                  setInCache(cacheKey, responseData);
                }

                return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: []
    }, { status: 500 });
  }
}

