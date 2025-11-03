 

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { rerankResults } from '@/lib/ai/rerank';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type MatchDestinationParams = {
  query_embedding: number[];
  match_threshold?: number;
  match_count?: number;
  filter_city?: string | null;
  filter_category?: string | null;
  filter_michelin_stars?: number | null;
  filter_min_rating?: number | null;
  filter_max_price_level?: number | null;
  filter_cuisine?: string | null;
  search_query?: string | null;
};

type FallbackOptions = {
  omitRankingColumns?: boolean;
  relaxCuisine?: boolean;
  relaxRating?: boolean;
  relaxPrice?: boolean;
  relaxMichelin?: boolean;
  relaxCategory?: boolean;
  relaxCity?: boolean;
  relaxKeywords?: boolean;
};

async function callMatchDestinations(params: MatchDestinationParams) {
  const { data, error } = await supabase.rpc('match_destinations', params);

  if (error && error.code === 'PGRST202' && 'filter_cuisine' in params) {
    const { filter_cuisine, ...legacyParams } = params;
    if (filter_cuisine !== undefined) {
      console.warn('[Search API] match_destinations missing cuisine filter, retrying without it');
      return supabase.rpc('match_destinations', legacyParams);
    }
  }

  return { data, error };
}

// Generate embedding for a query using OpenAI's text-embedding-3-large model
async function generateEmbedding(query: string): Promise<number[] | null> {
  if (!openai) {
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: OPENAI_EMBEDDING_MODEL,
      input: query,
    });

    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    }
    
    return null;
  } catch (error: any) {
    console.error('[Search API] Error generating embedding:', error?.message || error);
    return null;
  }
}

// AI-powered query understanding using OpenAI gpt-4.1
async function understandQuery(query: string): Promise<{
  keywords: string[];
  city?: string;
  country?: string;
  category?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
    cuisine?: string;
  };
}> {
  if (!openai) {
    return parseQueryFallback(query);
  }

  try {
    console.log('[AI Search] Calling OpenAI to understand query:', query);
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a travel search query analyzer. Extract structured information from user queries and return ONLY valid JSON.'
        },
        {
          role: 'user',
          content: `Analyze this travel/dining search query and extract structured information. Return ONLY valid JSON with this exact structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "country": "country name or null",
  "category": "category like restaurant/cafe/hotel or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null,
    "cuisine": "cuisine type like french/italian/japanese or null"
  }
}

Query: "${query}"

Return only the JSON, no other text:`
        }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const text = response.choices?.[0]?.message?.content || '';
    console.log('[AI Search] OpenAI raw response:', text.substring(0, 200));
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        // Guard: if the raw query mentions michelin, enforce michelin >= 1
        if (query.toLowerCase().includes('michelin')) {
          parsed.filters = parsed.filters || {};
          if (!parsed.filters.michelinStar || parsed.filters.michelinStar < 1) {
            parsed.filters.michelinStar = 1;
          }
        }
        // Guard: if the raw query includes cuisine keywords, set cuisine filter
        const cuisineWords = ['french','italian','japanese','sushi','ramen','izakaya','yakitori','bbq','steak','seafood','indian','thai','vietnamese','korean','mexican','spanish','mediterranean','greek','lebanese','turkish','chinese','cantonese','sichuan','taiwanese','hotpot','shabu','noodle','pasta','bistro'];
        const lowered = query.toLowerCase();
        for (const cw of cuisineWords) {
          if (lowered.includes(cw)) {
            parsed.filters = parsed.filters || {};
            parsed.filters.cuisine = cw;
            break;
          }
        }
        console.log('[AI Search] Successfully parsed intent:', JSON.stringify(parsed, null, 2));
        return parsed;
      } catch (parseError) {
        console.error('[AI Search] Failed to parse JSON response:', parseError, 'Raw text:', text);
      }
    } else {
      console.warn('[AI Search] No JSON found in OpenAI response');
    }
  } catch (error: any) {
    console.error('[AI Search] OpenAI error:', error?.message || error, error?.stack);
  }

  return parseQueryFallback(query);
}

// Fallback parser if AI is unavailable
function parseQueryFallback(query: string): {
  keywords: string[];
  city?: string;
  country?: string;
  category?: string;
  filters?: any;
} {
  const lowerQuery = query.toLowerCase();
  const words = query.split(/\s+/);

  const cities = [
    'tokyo','paris','new york','london','rome','barcelona','berlin','amsterdam','sydney','dubai','taipei','taipei city','singapore','hong kong','seoul','bangkok'
  ];
  const countries = ['japan', 'france', 'united states', 'usa', 'uk', 'united kingdom', 'italy', 'spain', 'germany', 'netherlands', 'australia', 'uae', 'taiwan', 'singapore', 'korea', 'thailand', 'china'];
  const categories = ['restaurant','cafe','hotel','bar','shop','museum','park','temple','shrine','hotpot','shabu','bbq','yakitori','ramen','sushi','izakaya'];
  const cuisines = ['french','italian','japanese','sushi','ramen','izakaya','yakitori','bbq','steak','seafood','indian','thai','vietnamese','korean','mexican','spanish','mediterranean','greek','lebanese','turkish','chinese','cantonese','sichuan','taiwanese','hotpot','shabu','noodle','pasta','bistro'];
  
  let city: string | undefined;
  let country: string | undefined;
  let category: string | undefined;
  let cuisine: string | undefined;
  const keywords: string[] = [];
  const hasMichelin = lowerQuery.includes('michelin');

  for (const cityName of cities) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }

  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      category = cat;
      break;
    }
  }

  for (const cu of cuisines) {
    if (lowerQuery.includes(cu)) {
      cuisine = cu;
      break;
    }
  }

  for (const ctry of countries) {
    if (lowerQuery.includes(ctry)) {
      country = ctry;
      break;
    }
  }

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!city?.includes(lowerWord) && !country?.includes(lowerWord) && !category?.includes(lowerWord)) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
  }

  const filters: any = {};
  if (hasMichelin) filters.michelinStar = 1;
  if (cuisine) filters.cuisine = cuisine;
  return { keywords, city, country, category, filters };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, pageSize = 50, filters = {}, userId, session_token } = body;
    
    // Try to get userId from cookies/auth if not provided
    let authenticatedUserId = userId;
    let conversationContext: any = null;

    if (!authenticatedUserId) {
      try {
        const { createServerClient } = await import('@/lib/supabase-server');
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        authenticatedUserId = user?.id;
      } catch {
        // Silently fail - userId is optional
      }
    }

    // Get conversation context if available
    try {
      const { getOrCreateSession } = await import('@/app/api/conversation/utils/contextHandler');
      const session = await getOrCreateSession(authenticatedUserId, session_token);
      if (session) {
        conversationContext = session.context;
      }
    } catch {
      // Context is optional
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        results: [], 
        searchTier: 'basic',
        error: 'Query too short' 
      });
    }

    // Extract structured filters using AI (with conversation context)
    const intent = await understandQuery(query);
    console.log('[Search API] AI Intent parsed:', JSON.stringify(intent, null, 2));
    
    // Enhance intent with conversation context if available
    if (conversationContext) {
      if (conversationContext.city && !intent.city) intent.city = conversationContext.city;
      if (conversationContext.category && !intent.category) intent.category = conversationContext.category;
      if (conversationContext.mood) {
        intent.filters = intent.filters || {};
        // Map mood to search filters (could enhance further)
      }
    }
    
    // Map category synonyms to database categories
    const categorySynonyms: Record<string, string> = {
      'restaurant': 'Dining',
      'dining': 'Dining',
      'food': 'Dining',
      'eat': 'Dining',
      'meal': 'Dining',
      'hotpot': 'Dining',
      'shabu': 'Dining',
      'bbq': 'Dining',
      'yakitori': 'Dining',
      'ramen': 'Dining',
      'sushi': 'Dining',
      'izakaya': 'Dining',
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
    
    // Normalize category
    if (intent.category) {
      const normalized = categorySynonyms[intent.category.toLowerCase()];
      if (normalized) {
        intent.category = normalized;
      }
    }
    
    console.log('[Search API] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

    // Generate embedding for vector search
    const queryEmbedding = await generateEmbedding(query);

    let results: any[] = [];
    let searchTier = 'basic';
    let relaxedFiltersApplied: string[] = [];

    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await callMatchDestinations({
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: pageSize,
          filter_city: intent.city || filters.city || null,
          filter_category: intent.category || filters.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || filters.michelinStar || null,
          filter_min_rating: intent.filters?.rating || filters.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || filters.priceLevel || null,
          filter_cuisine: intent.filters?.cuisine || null,
          search_query: query
        });

        if (!vectorError && Array.isArray(vectorResults) && vectorResults.length > 0) {
          results = vectorResults;
          searchTier = 'vector';
        } else if (vectorError) {
          console.warn('[Search API] Vector search error:', vectorError);
          searchTier = 'vector-error';
        }
      } catch (error) {
        console.error('[Search API] Vector search exception:', error);
        searchTier = 'vector-exception';
      }
    }

    if (results.length === 0) {
      try {
        const keywords = intent.keywords?.length
          ? intent.keywords
          : query.split(/\s+/).filter((w: string) => w.length > 2);

        const applyFilters = (queryBuilder: any, options: FallbackOptions) => {
          let qb = queryBuilder;
          const orConditions: string[] = [];

          const cityFilter = (intent.city || filters.city) && !options.relaxCity ? (intent.city || filters.city) : null;
          if (cityFilter) {
            qb = qb.ilike('city', `%${cityFilter}%`);
          }

          const countryFilter = intent.country || filters.country;
          if (countryFilter) {
            qb = qb.ilike('country', `%${countryFilter}%`);
          }

          const categoryFilter = (intent.category || filters.category) && !options.relaxCategory
            ? (intent.category || filters.category)
            : null;
          if (categoryFilter) {
            qb = qb.ilike('category', `%${categoryFilter}%`);
          }

          const cuisineFilter = intent.filters?.cuisine || filters.cuisine;
          if (cuisineFilter) {
            const loweredCuisine = String(cuisineFilter).toLowerCase();
            if (options.relaxCuisine) {
              orConditions.push(
                `search_text.ilike.%${loweredCuisine}%`,
                `description.ilike.%${loweredCuisine}%`,
                `content.ilike.%${loweredCuisine}%`
              );
            } else {
              qb = qb.contains('tags', [loweredCuisine]);
            }
          }

          const keywordSource = Array.isArray(filters.keywords) && filters.keywords.length > 0
            ? filters.keywords
            : keywords;
          const keywordList = options.relaxKeywords ? keywordSource.slice(0, 1) : keywordSource;
          if (keywordList.length > 0) {
            const keywordConditions = keywordList
              .map((keyword: string) => keyword.trim())
              .filter(Boolean)
              .map((keyword: string) => [
                `name.ilike.%${keyword}%`,
                `description.ilike.%${keyword}%`,
                `content.ilike.%${keyword}%`,
                `search_text.ilike.%${keyword}%`
              ])
              .flat();
            orConditions.push(...keywordConditions);
          }

          const ratingFilter = intent.filters?.rating || filters.rating;
          if (ratingFilter) {
            const ratingThreshold = options.relaxRating
              ? Math.max(3, ratingFilter - 0.5)
              : ratingFilter;
            if (ratingThreshold) {
              qb = qb.gte('rating', ratingThreshold);
            }
          }

          const priceFilter = intent.filters?.priceLevel || filters.priceLevel;
          if (priceFilter) {
            const priceThreshold = options.relaxPrice
              ? Math.min(4, priceFilter + 1)
              : priceFilter;
            if (priceThreshold) {
              qb = qb.lte('price_level', priceThreshold);
            }
          }

          const michelinFilter = intent.filters?.michelinStar || filters.michelinStar;
          if (michelinFilter && !options.relaxMichelin) {
            qb = qb.gte('michelin_stars', michelinFilter);
          }

          if (orConditions.length > 0) {
            qb = qb.or(orConditions.join(','));
          }

          return qb;
        };

        const executeFallbackAttempt = async (options: FallbackOptions) => {
          const omitRankingColumns = options.omitRankingColumns ?? false;
          const selectColumns = omitRankingColumns
            ? 'id, slug, name, city, country, category, description, content, image, michelin_stars, crown, rating, price_level, tags'
            : 'id, slug, name, city, country, category, description, content, image, michelin_stars, crown, rating, price_level, rank_score, trending_score, tags';

          let qb = supabase
            .from('destinations')
            .select(selectColumns)
            .limit(pageSize);

          qb = omitRankingColumns
            ? qb.order('rating', { ascending: false })
            : qb.order('rank_score', { ascending: false });

          const { data, error } = await applyFilters(qb, options);

          if (error && error.code === '42703' && !omitRankingColumns) {
            console.warn('[Search API] rank_score not available, retrying fallback without ranking columns');
            return executeFallbackAttempt({ ...options, omitRankingColumns: true });
          }

          return { data, error, omitRankingColumns: omitRankingColumns || (error?.code === '42703') };
        };

        const fallbackAttempts: FallbackOptions[] = [
          {},
          { omitRankingColumns: true },
          { relaxCuisine: true },
          { relaxCuisine: true, omitRankingColumns: true },
          { relaxCuisine: true, relaxRating: true, relaxPrice: true, relaxMichelin: true },
          { relaxCuisine: true, relaxRating: true, relaxPrice: true, relaxMichelin: true, omitRankingColumns: true },
          { relaxCuisine: true, relaxRating: true, relaxPrice: true, relaxMichelin: true, relaxCategory: true },
          { relaxCuisine: true, relaxRating: true, relaxPrice: true, relaxMichelin: true, relaxCategory: true, omitRankingColumns: true },
          { relaxCuisine: true, relaxRating: true, relaxPrice: true, relaxMichelin: true, relaxCategory: true, relaxCity: true },
          {
            relaxCuisine: true,
            relaxRating: true,
            relaxPrice: true,
            relaxMichelin: true,
            relaxCategory: true,
            relaxCity: true,
            omitRankingColumns: true,
          },
          {
            relaxCuisine: true,
            relaxRating: true,
            relaxPrice: true,
            relaxMichelin: true,
            relaxCategory: true,
            relaxCity: true,
            relaxKeywords: true,
          },
          {
            relaxCuisine: true,
            relaxRating: true,
            relaxPrice: true,
            relaxMichelin: true,
            relaxCategory: true,
            relaxCity: true,
            relaxKeywords: true,
            omitRankingColumns: true,
          },
        ];

        for (const attempt of fallbackAttempts) {
          const { data: fallbackResults, error: fallbackError, omitRankingColumns } = await executeFallbackAttempt(attempt);

          if (fallbackError) {
            console.warn('[Search API] Full-text fallback attempt failed:', fallbackError);
            continue;
          }

          if (Array.isArray(fallbackResults) && fallbackResults.length > 0) {
            const relaxed: string[] = Object.entries(attempt)
              .filter(([key, value]) => key.startsWith('relax') && value)
              .map(([key]) => key.replace('relax', '').toLowerCase());

            if (relaxed.length > 0) {
              searchTier = omitRankingColumns ? 'fallback-relaxed-rating' : 'fallback-relaxed';
            } else {
              searchTier = omitRankingColumns ? 'rating-fallback' : 'fulltext';
            }

            relaxedFiltersApplied = relaxed;

            results = fallbackResults.map((d: any) => ({
              ...d,
              blended_rank: omitRankingColumns
                ? (typeof d.rating === 'number' ? d.rating : 0)
                : (d.rank_score || 0) * 0.7 + (d.trending_score || 0) * 0.3,
              vector_similarity: 0,
              full_text_rank: 0
            }));
            break;
          }
        }

        if (results.length === 0) {
          searchTier = searchTier.startsWith('vector')
            ? `${searchTier}-fallback-empty`
            : 'fallback-empty';
        }
      } catch (error) {
        console.error('[Search API] Full-text fallback exception:', error);
      }
    }

    // Get personalized recommendations for user (if authenticated)
    let personalizedScores: Map<number, number> = new Map();
    if (authenticatedUserId) {
      try {
        // Use internal API call with user context
        const { createServerClient } = await import('@/lib/supabase-server');
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { AIRecommendationEngine } = await import('@/lib/ai-recommendations/engine');
          const engine = new AIRecommendationEngine(user.id);
          const recommendations = await engine.getCachedRecommendations(50);
          
          recommendations.forEach(rec => {
            personalizedScores.set(rec.destinationId, rec.score);
          });
        }
      } catch (error) {
        // Silently fail - personalization is optional
        console.log('[Search] Could not fetch personalized scores:', error);
      }
    }

    // Rank and sort results
    const lowerQuery = query.toLowerCase();
    let rankedResults = results
      .map((dest: any) => {
        let score = typeof dest.blended_rank === 'number'
          ? dest.blended_rank
          : (typeof dest.vector_similarity === 'number' ? dest.vector_similarity : 0);
        const lowerName = (dest.name || '').toLowerCase();
        const lowerDesc = (dest.description || '').toLowerCase();
        const lowerCategory = (dest.category || '').toLowerCase();

        // Boost for exact matches
        if (lowerName.includes(lowerQuery)) score += 0.2;
        if (lowerDesc.includes(lowerQuery)) score += 0.1;

        // Boost for category match
        if (intent.category && lowerCategory.includes(intent.category.toLowerCase())) {
          score += 0.15;
        }

        // Boost for city match
        if (intent.city && dest.city && dest.city.toLowerCase().includes(intent.city.toLowerCase())) {
          score += 0.1;
        }

        // Boost for Michelin stars
        if (dest.michelin_stars) score += dest.michelin_stars * 0.05;

        // Boost for high ratings
        if (dest.rating && dest.rating >= 4.5) score += 0.05;

        // Boost personalized recommendations (strong boost)
        const personalizationScore = personalizedScores.get(dest.id);
        if (personalizationScore) {
          score += personalizationScore * 0.3; // 30% boost from personalization
        }

        return { ...dest, _score: score };
      })
      .sort((a: any, b: any) => b._score - a._score)
      .slice(0, pageSize)
      .map(({ _score, ...rest }: any) => rest);

    // Apply LLM re-ranker on the top N for improved ordering
    try {
      rankedResults = await rerankResults(query, rankedResults, 20);
    } catch {}

    // Generate suggestions
    const suggestions: string[] = [];
    if (intent.city && !intent.category) {
      suggestions.push(`Try "best restaurants in ${intent.city}"`);
      suggestions.push(`Try "top cafes in ${intent.city}"`);
    }
    if (intent.category && !intent.city) {
      suggestions.push(`Try "best ${intent.category}s in Tokyo"`);
      suggestions.push(`Try "best ${intent.category}s in Paris"`);
    }

    // Generate AI insight banner if conversation context exists
    let aiInsightBanner: string | null = null;
    if (conversationContext && (conversationContext.city || conversationContext.category)) {
      const contextParts: string[] = [];
      if (conversationContext.city) contextParts.push(conversationContext.city);
      if (conversationContext.category) contextParts.push(conversationContext.category);
      if (conversationContext.mood) contextParts.push(conversationContext.mood);
      aiInsightBanner = `Tailored for ${contextParts.join(', ')}`;
    }

    const responseIntent: any = {
      ...intent,
      resultCount: rankedResults.length,
      searchStrategy: searchTier,
      relaxedFilters: relaxedFiltersApplied,
    };

    return NextResponse.json({
      results: rankedResults,
      searchTier: searchTier,
      conversationContext: conversationContext || undefined,
      aiInsightBanner: aiInsightBanner || undefined,
      intent: responseIntent,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    });

  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({
      results: [],
      searchTier: 'basic',
      error: error.message || 'Search failed',
    }, { status: 500 });
  }
}