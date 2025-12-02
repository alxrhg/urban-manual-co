import { NextRequest, NextResponse } from 'next/server';
import { embedText, generateJSON } from '@/lib/llm';
import {
  searchRatelimit,
  memorySearchRatelimit,
  getIdentifier,
  createRateLimitResponse,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

// Intent detection result type
interface SearchIntent {
  keywords: string[];
  city?: string;
  category?: string;
  brand?: string;
  mood?: string;
  expandedQuery?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
}

// Generate embedding for a query using OpenAI embeddings via provider-agnostic helper
async function generateEmbedding(query: string): Promise<number[] | null> {
  try {
    const embedding = await embedText(query);
    return embedding || null;
  } catch (error) {
    console.error('[Search API] Error generating embedding:', error);
    return null;
  }
}

/**
 * GPT-powered query understanding for better search intent detection
 * Uses OpenAI to extract city, category, mood, price level, and expand the query
 */
async function understandQueryWithGPT(query: string): Promise<SearchIntent> {
  try {
    const systemPrompt = `You are a travel search intent analyzer. Extract search intent from user queries about destinations, restaurants, hotels, bars, cafes, and cultural spots.

Return a JSON object with these fields:
- city: the city name if mentioned (normalize to proper case, e.g., "Tokyo", "New York", "Paris")
- category: one of "Restaurant", "Hotel", "Bar", "Cafe", "Culture", "Shop" if applicable
- brand: hotel/restaurant brand if mentioned (e.g., "Aman", "Four Seasons", "Nobu")
- mood: the vibe/mood if expressed (e.g., "romantic", "casual", "upscale", "trendy", "cozy", "family-friendly")
- priceLevel: 1-4 if price is mentioned (1=budget, 2=moderate, 3=upscale, 4=luxury)
- rating: minimum rating if quality is emphasized (e.g., "best" = 4.5, "top" = 4.0)
- michelinStar: 1-3 if Michelin is mentioned
- keywords: array of important search terms not covered by other fields
- expandedQuery: an enhanced version of the query for better semantic search

Be concise. Only include fields that are clearly implied by the query.`;

    const result = await generateJSON(systemPrompt, query);

    if (result) {
      return {
        keywords: result.keywords || [],
        city: result.city,
        category: result.category,
        brand: result.brand,
        mood: result.mood,
        expandedQuery: result.expandedQuery,
        filters: {
          priceLevel: result.priceLevel,
          rating: result.rating,
          michelinStar: result.michelinStar,
        },
      };
    }
  } catch (error) {
    console.warn('[Search API] GPT intent detection failed, using fallback:', error);
  }

  // Fallback to regex-based parsing
  return parseQueryFallback(query);
}

// AI-powered query understanding with GPT fallback
async function understandQuery(query: string): Promise<SearchIntent> {
  // Use GPT for better intent detection
  return understandQueryWithGPT(query);
}

// Fallback parser if AI is unavailable
function parseQueryFallback(query: string): SearchIntent {
  const lowerQuery = query.toLowerCase();
  const words = query.split(/\s+/);

  // Expanded city list
  const cities = [
    'tokyo', 'paris', 'new york', 'london', 'rome', 'barcelona', 'berlin',
    'amsterdam', 'sydney', 'dubai', 'hong kong', 'singapore', 'bangkok',
    'los angeles', 'san francisco', 'miami', 'chicago', 'seattle',
    'kyoto', 'osaka', 'milan', 'florence', 'venice', 'lisbon', 'madrid',
    'copenhagen', 'stockholm', 'vienna', 'prague', 'budapest', 'athens',
    'marrakech', 'cape town', 'melbourne', 'toronto', 'vancouver', 'montreal',
    'mexico city', 'buenos aires', 'rio de janeiro', 'seoul', 'taipei'
  ];

  const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'shop', 'museum', 'park', 'temple', 'shrine', 'gallery', 'culture'];

  // Common hotel/restaurant brands
  const brands = [
    'aman', 'four seasons', 'ritz-carlton', 'ritz carlton', 'mandarin oriental',
    'peninsula', 'park hyatt', 'rosewood', 'bulgari', 'belmond',
    'six senses', 'one&only', 'shangri-la', 'st regis', 'raffles',
    'como', 'w hotels', 'edition', 'soho house', 'ace hotel',
    'marriott', 'hilton', 'hyatt', 'intercontinental', 'fairmont',
    'nobu', 'momofuku', 'shake shack', 'eleven madison', 'noma'
  ];

  // Mood indicators
  const moodIndicators: Record<string, string> = {
    'romantic': 'romantic', 'date': 'romantic', 'anniversary': 'romantic',
    'casual': 'casual', 'relaxed': 'casual', 'laid-back': 'casual',
    'fancy': 'upscale', 'upscale': 'upscale', 'fine dining': 'upscale', 'elegant': 'upscale',
    'trendy': 'trendy', 'hip': 'trendy', 'cool': 'trendy', 'instagram': 'trendy',
    'cozy': 'cozy', 'intimate': 'cozy', 'quiet': 'cozy',
    'family': 'family-friendly', 'kids': 'family-friendly', 'children': 'family-friendly',
    'business': 'business', 'meeting': 'business', 'work': 'business',
  };

  // Price level indicators
  const priceIndicators: Record<string, number> = {
    'cheap': 1, 'budget': 1, 'affordable': 1, 'inexpensive': 1,
    'moderate': 2, 'mid-range': 2, 'reasonable': 2,
    'upscale': 3, 'nice': 3, 'fancy': 3,
    'luxury': 4, 'expensive': 4, 'high-end': 4, 'splurge': 4,
  };

  let city: string | undefined;
  let category: string | undefined;
  let brand: string | undefined;
  let mood: string | undefined;
  let priceLevel: number | undefined;
  let rating: number | undefined;
  const keywords: string[] = [];

  // Extract city
  for (const cityName of cities) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }

  // Extract category
  for (const cat of categories) {
    if (lowerQuery.includes(cat)) {
      category = cat;
      break;
    }
  }

  // Extract brand
  for (const brandName of brands) {
    if (lowerQuery.includes(brandName)) {
      brand = brandName;
      break;
    }
  }

  // Extract mood
  for (const [indicator, moodValue] of Object.entries(moodIndicators)) {
    if (lowerQuery.includes(indicator)) {
      mood = moodValue;
      break;
    }
  }

  // Extract price level
  for (const [indicator, level] of Object.entries(priceIndicators)) {
    if (lowerQuery.includes(indicator)) {
      priceLevel = level;
      break;
    }
  }

  // Extract quality indicators
  if (lowerQuery.includes('best') || lowerQuery.includes('top rated')) {
    rating = 4.5;
  } else if (lowerQuery.includes('top') || lowerQuery.includes('great')) {
    rating = 4.0;
  }

  // Extract michelin
  let michelinStar: number | undefined;
  if (lowerQuery.includes('michelin')) {
    if (lowerQuery.includes('3 star') || lowerQuery.includes('three star')) {
      michelinStar = 3;
    } else if (lowerQuery.includes('2 star') || lowerQuery.includes('two star')) {
      michelinStar = 2;
    } else {
      michelinStar = 1;
    }
  }

  // Extract keywords (words not matched by other extractors)
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (
      !city?.includes(lowerWord) &&
      !category?.includes(lowerWord) &&
      !brand?.includes(lowerWord) &&
      !Object.keys(moodIndicators).includes(lowerWord) &&
      !Object.keys(priceIndicators).includes(lowerWord) &&
      word.length > 2
    ) {
      keywords.push(word);
    }
  }

  return {
    keywords,
    city,
    category,
    brand,
    mood,
    filters: {
      priceLevel,
      rating,
      michelinStar,
    }
  };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  try {
    const body = await request.json();
    const { query, filters = {}, userId, session_token } = body;
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    const PAGE_SIZE = 10;

    // Try to get userId from cookies/auth if not provided
    const authenticatedUserId = userId || supabaseUser?.id;

    // Rate limiting: 20 requests per 10 seconds for search
    const identifier = getIdentifier(request, authenticatedUserId);
    const ratelimit = isUpstashConfigured() ? searchRatelimit : memorySearchRatelimit;
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return createRateLimitResponse(
        'Too many search requests. Please wait a moment.',
        limit,
        remaining,
        reset
      );
    }
    let conversationContext: any = null;

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
      if (conversationContext.brand && !intent.brand) intent.brand = conversationContext.brand;
      if (conversationContext.mood) {
        intent.filters = intent.filters || {};
        // Map mood to search filters (could enhance further)
      }
    }
    
    // Map category synonyms to database categories
    const categorySynonyms: Record<string, string> = {
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
    
    // Normalize category
    if (intent.category) {
      const normalized = categorySynonyms[intent.category.toLowerCase()];
      if (normalized) {
        intent.category = normalized;
      }
    }
    
    console.log('[Search API] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

    // Use expanded query for better semantic search if GPT provided one
    const searchQuery = intent.expandedQuery || query;

    // Generate embedding for vector search (use expanded query for better semantic matching)
    const queryEmbedding = await generateEmbedding(searchQuery);

    let results: any[] = [];
    let searchTier = 'basic';

    // Strategy 1: Vector similarity search (if embeddings available)
    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // Cosine similarity threshold
          match_count: PAGE_SIZE,
          filter_city: intent.city || filters.city || null,
          filter_category: intent.category || filters.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || filters.michelinStar || null,
          filter_min_rating: intent.filters?.rating || filters.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || filters.priceLevel || null,
          filter_brand: intent.brand || filters.brand || null,
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

    // Strategy 2: Full-text search on search_text column (if vector search didn't return results or as fallback)
    if (results.length === 0) {
      try {
        let fullTextQuery = supabase
          .from('destinations')
          .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, brand')
          .limit(PAGE_SIZE);

        // Full-text search - use ILIKE on search_text as fallback (textSearch requires tsvector column)
        // If search_text column exists but no tsvector, use pattern matching
        fullTextQuery = fullTextQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%,content.ilike.%${query}%,search_text.ilike.%${query}%`);

        // Apply filters
        if (intent.city || filters.city) {
          const cityFilter = intent.city || filters.city;
          fullTextQuery = fullTextQuery.ilike('city', `%${cityFilter}%`);
        }

        if (intent.category || filters.category) {
          const categoryFilter = intent.category || filters.category;
          fullTextQuery = fullTextQuery.ilike('category', `%${categoryFilter}%`);
        }

        if (intent.brand || filters.brand) {
          const brandFilter = intent.brand || filters.brand;
          fullTextQuery = fullTextQuery.ilike('brand', `%${brandFilter}%`);
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
          match_count: PAGE_SIZE
        });

        if (!aiFieldError && aiFieldResults && aiFieldResults.length > 0) {
          // Fetch full destination data for AI field matches
          const slugs = aiFieldResults.map((r: any) => r.slug);
          const { data: fullData } = await supabase
            .from('destinations')
            .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, brand')
            .in('slug', slugs)
            .limit(PAGE_SIZE);

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
        .select('slug, name, city, category, micro_description, description, content, image, michelin_stars, crown, rating, price_level, brand')
        .limit(PAGE_SIZE);

      // Apply filters
      if (intent.city || filters.city) {
        const cityFilter = intent.city || filters.city;
        fallbackQuery = fallbackQuery.ilike('city', `%${cityFilter}%`);
      }

      if (intent.category || filters.category) {
        const categoryFilter = intent.category || filters.category;
        fallbackQuery = fallbackQuery.ilike('category', `%${categoryFilter}%`);
      }

      if (intent.brand || filters.brand) {
        const brandFilter = intent.brand || filters.brand;
        fallbackQuery = fallbackQuery.ilike('brand', `%${brandFilter}%`);
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
    const personalizedScores: Map<number, number> = new Map();
    if (authenticatedUserId) {
      try {
        const { AIRecommendationEngine } = await import('@/lib/ai-recommendations/engine');
        const engine = new AIRecommendationEngine(authenticatedUserId);
        const recommendations = await engine.getCachedRecommendations(50);

        recommendations.forEach(rec => {
          personalizedScores.set(rec.destinationId, rec.score);
        });
      } catch (error) {
        // Silently fail - personalization is optional
        console.log('[Search] Could not fetch personalized scores:', error);
      }
    }

    // Rank and sort results with mood-aware boosting
    const lowerQuery = query.toLowerCase();
    const rankedResults = results
      .map((dest: any) => {
        let score = dest.similarity || dest.rank || 0;
        const lowerName = (dest.name || '').toLowerCase();
        const lowerDesc = (dest.description || '').toLowerCase();
        const lowerCategory = (dest.category || '').toLowerCase();
        const destTags = (dest.tags || dest.vibe_tags || []).map((t: string) => t?.toLowerCase() || '');

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

        // Boost for mood/vibe match (check tags and description)
        if (intent.mood) {
          const moodLower = intent.mood.toLowerCase();
          if (destTags.some((tag: string) => tag.includes(moodLower))) {
            score += 0.15; // Strong boost for tag match
          }
          if (lowerDesc.includes(moodLower)) {
            score += 0.1; // Boost for description match
          }
          // Map mood to related terms for broader matching
          const moodSynonyms: Record<string, string[]> = {
            'romantic': ['intimate', 'date', 'couples', 'candlelit', 'elegant'],
            'casual': ['relaxed', 'laid-back', 'informal', 'easy-going'],
            'upscale': ['fine dining', 'elegant', 'sophisticated', 'luxury', 'premium'],
            'trendy': ['hip', 'instagram', 'modern', 'stylish', 'cool'],
            'cozy': ['warm', 'intimate', 'charming', 'comfortable'],
            'family-friendly': ['kids', 'children', 'family', 'casual'],
          };
          const synonyms = moodSynonyms[moodLower] || [];
          for (const syn of synonyms) {
            if (destTags.some((tag: string) => tag.includes(syn)) || lowerDesc.includes(syn)) {
              score += 0.05;
              break;
            }
          }
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
      .slice(0, PAGE_SIZE)
      .map(({ _score, similarity, rank, ...rest }: any) => rest);

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

    // Generate AI insight banner based on detected intent or conversation context
    let aiInsightBanner: string | null = null;
    const contextParts: string[] = [];

    // Add detected intent elements
    if (intent.mood) contextParts.push(intent.mood);
    if (intent.city) contextParts.push(intent.city);
    if (intent.category) contextParts.push(intent.category);

    // Add conversation context elements if not already covered
    if (conversationContext) {
      if (conversationContext.city && !intent.city) contextParts.push(conversationContext.city);
      if (conversationContext.category && !intent.category) contextParts.push(conversationContext.category);
      if (conversationContext.mood && !intent.mood) contextParts.push(conversationContext.mood);
    }

    if (contextParts.length > 0) {
      aiInsightBanner = `Tailored for ${contextParts.join(' • ')}`;
    }

    // Log search interaction (best-effort)
    if (authenticatedUserId) {
      try {
        await supabase.from('user_interactions').insert({
          interaction_type: 'search',
          user_id: authenticatedUserId,
          destination_id: null,
          metadata: {
            query,
            intent,
            count: rankedResults.length,
            source: 'api/search',
          }
        });
      } catch {}
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
});