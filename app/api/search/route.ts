 

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai, OPENAI_MODEL, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { rerankResults } from '@/lib/ai/rerank';
import { semanticBlendSearch } from '@/lib/search/semanticSearch';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  };
}> {
  if (!openai) {
    return parseQueryFallback(query);
  }

  try {
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
    "michelinStar": 1-3 or null
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AI Search] Parsed intent:', parsed);
        return parsed;
      } catch (parseError) {
        console.error('[AI Search] Failed to parse JSON response:', parseError);
      }
    }
  } catch (error: any) {
    console.error('[AI Search] OpenAI error:', error?.message || error);
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
  
  let city: string | undefined;
  let country: string | undefined;
  let category: string | undefined;
  const keywords: string[] = [];

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

  return { keywords, city, country, category };
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

    // Strategy 1: Vector similarity search (if embeddings available)
    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // Cosine similarity threshold
          match_count: pageSize,
          filter_city: intent.city || filters.city || null,
          filter_category: intent.category || filters.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || filters.michelinStar || null,
          filter_min_rating: intent.filters?.rating || filters.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || filters.priceLevel || null,
          search_query: query // For full-text search ranking boost
        });

        if (!vectorError && vectorResults && vectorResults.length > 0) {
          results = vectorResults;
          searchTier = 'vector-semantic';
          console.log('[Search API] Vector search found', results.length, 'results');
        } else if (vectorError) {
          // If function doesn't exist or embeddings not ready, silently fall through to next strategy
          if (vectorError.code === '42883' || vectorError.message?.includes('does not exist') || 
              vectorError.message?.includes('embedding') || vectorError.code === 'P0001') {
            console.log('[Search API] Vector search not available (embeddings may not be generated yet), using fallback');
          } else {
            console.error('[Search API] Vector search error:', vectorError);
          }
        }
      } catch (error: any) {
        // Handle gracefully if vector search isn't ready
        if (error.message?.includes('match_destinations') || error.message?.includes('embedding')) {
          console.log('[Search API] Vector search not available, using fallback');
        } else {
          console.error('[Search API] Vector search exception:', error);
        }
      }
    }

    // Strategy 1b: Client-side hybrid semantic blend (uses stored embeddings column)
    if (results.length === 0) {
      try {
        const blended = await semanticBlendSearch(query, {
          city: intent.city || filters.city,
          country: intent.country || filters.country,
          category: intent.category || filters.category,
          open_now: intent.filters?.openNow || filters.openNow,
        });
        if (blended && blended.length) {
          results = blended;
          searchTier = 'vector-hybrid';
        }
      } catch (e) {
        // ignore
      }
    }

    // Strategy 2: Full-text search on search_text column (if vector search didn't return results or as fallback)
    if (results.length === 0) {
      try {
        let fullTextQuery = supabase
          .from('destinations')
          .select('slug, name, city, category, description, content, image, michelin_stars, crown, rating, price_level')
          .limit(pageSize);

        // Apply city/country filters FIRST (strict priority)
        if (intent.city || filters.city) {
          const cityFilter = intent.city || filters.city;
          fullTextQuery = fullTextQuery.ilike('city', `%${cityFilter}%`);
        }
        if (intent.country || filters.country) {
          const countryFilter = intent.country || filters.country;
          fullTextQuery = fullTextQuery.ilike('country', `%${countryFilter}%`);
        }

        if (intent.category || filters.category) {
          const categoryFilter = intent.category || filters.category;
          fullTextQuery = fullTextQuery.ilike('category', `%${categoryFilter}%`);
        }

        // Build keyword search: use extracted keywords OR split query into meaningful words
        const searchKeywords = intent.keywords && intent.keywords.length > 0 
          ? intent.keywords 
          : query.split(/\s+/).filter((w: string) => w.length > 2 && !['in', 'the', 'for', 'and', 'or'].includes(w.toLowerCase()));
        
        if (searchKeywords.length > 0) {
          // Search for any keyword in name/description/content
          const keywordConditions: string[] = [];
          for (const keyword of searchKeywords) {
            keywordConditions.push(`name.ilike.%${keyword}%`);
            keywordConditions.push(`description.ilike.%${keyword}%`);
            keywordConditions.push(`content.ilike.%${keyword}%`);
            keywordConditions.push(`search_text.ilike.%${keyword}%`);
          }
          if (keywordConditions.length > 0) {
            fullTextQuery = fullTextQuery.or(keywordConditions.join(','));
          }
        } else {
          // Fallback: search entire query if no keywords extracted
          fullTextQuery = fullTextQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%,search_text.ilike.%${query}%`);
        }

        if (intent.filters?.rating || filters.rating) {
          fullTextQuery = fullTextQuery.gte('rating', intent.filters?.rating || filters.rating);
        }

        if (intent.filters?.priceLevel || filters.priceLevel) {
          fullTextQuery = fullTextQuery.lte('price_level', intent.filters?.priceLevel || filters.priceLevel);
        }

        if (intent.filters?.michelinStar || filters.michelinStar) {
          fullTextQuery = fullTextQuery.gte('michelin_stars', intent.filters?.michelinStar || filters.michelinStar);
        }

        const { data: fullTextResults, error: fullTextError } = await fullTextQuery;

        if (!fullTextError && fullTextResults) {
          results = fullTextResults;
          searchTier = 'fulltext';
          console.log('[Search API] Full-text search found', results.length, 'results');
        } else if (fullTextError) {
          console.error('[Search API] Full-text search error:', fullTextError);
        }
      } catch (error) {
        console.error('[Search API] Full-text search exception:', error);
      }
    }

    // Strategy 3: AI field search (vibe_tags, keywords, search_keywords) if still no results
    if (results.length === 0) {
      try {
        const { data: aiFieldResults, error: aiFieldError } = await supabase.rpc('search_by_ai_fields', {
          search_term: query,
          match_count: pageSize
        });

        if (!aiFieldError && aiFieldResults && aiFieldResults.length > 0) {
          // Fetch full destination data for AI field matches
          const slugs = aiFieldResults.map((r: any) => r.slug);
          const { data: fullData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, description, content, image, michelin_stars, crown, rating, price_level')
            .in('slug', slugs)
            .limit(pageSize);

          if (fullData) {
            // Preserve similarity order from AI field search
            const orderedResults = slugs
              .map((slug: string) => fullData.find((d: any) => d.slug === slug))
              .filter(Boolean);
            
            results = orderedResults;
            searchTier = 'ai-fields';
            console.log('[Search API] AI field search found', results.length, 'results');
          }
        } else if (aiFieldError) {
          // Handle gracefully if function doesn't exist
          if (aiFieldError.code === '42883' || aiFieldError.message?.includes('does not exist')) {
            console.log('[Search API] AI field search function not available, using fallback');
          } else {
            console.error('[Search API] AI field search error:', aiFieldError);
          }
        }
      } catch (error: any) {
        // Handle gracefully if RPC doesn't exist
        if (error.message?.includes('search_by_ai_fields') || error.code === '42883') {
          console.log('[Search API] AI field search not available, using fallback');
        } else {
          console.error('[Search API] AI field search exception:', error);
        }
      }
    }

    // Strategy 4: Fallback to keyword matching (original method)
    if (results.length === 0) {
      let fallbackQuery = supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown, rating, price_level')
        .limit(pageSize);

      // Apply filters
      if (intent.city || filters.city) {
        const cityFilter = intent.city || filters.city;
        fallbackQuery = fallbackQuery.ilike('city', `%${cityFilter}%`);
      }
      if (intent.country || filters.country) {
        const countryFilter = intent.country || filters.country;
        fallbackQuery = fallbackQuery.ilike('country', `%${countryFilter}%`);
      }

      if (intent.category || filters.category) {
        const categoryFilter = intent.category || filters.category;
        fallbackQuery = fallbackQuery.ilike('category', `%${categoryFilter}%`);
      }

      // Keyword matching
      if (intent.keywords && intent.keywords.length > 0) {
        const conditions: string[] = [];
        for (const keyword of intent.keywords) {
          conditions.push(`name.ilike.%${keyword}%`);
          conditions.push(`description.ilike.%${keyword}%`);
          conditions.push(`content.ilike.%${keyword}%`);
        }
        if (conditions.length > 0) {
          fallbackQuery = fallbackQuery.or(conditions.join(','));
        }
      } else {
        fallbackQuery = fallbackQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%`);
      }

      if (intent.filters?.rating || filters.rating) {
        fallbackQuery = fallbackQuery.gte('rating', intent.filters?.rating || filters.rating);
      }

      if (intent.filters?.priceLevel || filters.priceLevel) {
        fallbackQuery = fallbackQuery.lte('price_level', intent.filters?.priceLevel || filters.priceLevel);
      }

      if (intent.filters?.michelinStar || filters.michelinStar) {
        fallbackQuery = fallbackQuery.gte('michelin_stars', intent.filters?.michelinStar || filters.michelinStar);
      }

      const { data: fallbackResults, error: fallbackError } = await fallbackQuery;

      if (!fallbackError && fallbackResults) {
        results = fallbackResults;
        searchTier = 'keyword';
        console.log('[Search API] Keyword search found', results.length, 'results');
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
        let score = dest.similarity || dest.rank || 0;
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
      .map(({ _score, similarity, rank, ...rest }: any) => rest);

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

    return NextResponse.json({
      results: rankedResults,
      searchTier: searchTier,
      conversationContext: conversationContext || undefined,
      aiInsightBanner: aiInsightBanner || undefined,
      intent,
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