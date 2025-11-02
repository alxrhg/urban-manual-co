import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate embedding for a query using Google's text-embedding-004 model
async function generateEmbedding(query: string): Promise<number[] | null> {
  if (!GOOGLE_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: query }] }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Search API] Embedding API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    // text-embedding-004 returns embedding in data.embedding.values
    if (data.embedding?.values) {
      return data.embedding.values;
    }
    
    console.error('[Search API] Unexpected embedding response format:', data);
    return null;
  } catch (error) {
    console.error('[Search API] Error generating embedding:', error);
    return null;
  }
}

// AI-powered query understanding (kept for filter extraction)
async function understandQuery(query: string): Promise<{
  keywords: string[];
  city?: string;
  category?: string;
  filters?: {
    openNow?: boolean;
    priceLevel?: number;
    rating?: number;
    michelinStar?: number;
  };
}> {
  if (!GOOGLE_API_KEY) {
    return parseQueryFallback(query);
  }

  try {
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `Analyze this travel/dining search query and extract structured information. Return ONLY valid JSON with this exact structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "category": "category like restaurant/cafe/hotel or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null
  }
}

Query: "${query}"

Return only the JSON, no other text:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AI Search] Parsed intent:', parsed);
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
      }
    }
  } catch (error: any) {
    console.error('Gemini API error:', error);
  }

  return parseQueryFallback(query);
}

// Fallback parser if AI is unavailable
function parseQueryFallback(query: string): {
  keywords: string[];
  city?: string;
  category?: string;
  filters?: any;
} {
  const lowerQuery = query.toLowerCase();
  const words = query.split(/\s+/);

  const cities = ['tokyo', 'paris', 'new york', 'london', 'rome', 'barcelona', 'berlin', 'amsterdam', 'sydney', 'dubai'];
  const categories = ['restaurant', 'cafe', 'hotel', 'bar', 'shop', 'museum', 'park', 'temple', 'shrine'];
  
  let city: string | undefined;
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

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!city?.includes(lowerWord) && !category?.includes(lowerWord)) {
      if (word.length > 2) {
        keywords.push(word);
      }
    }
  }

  return { keywords, city, category };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, pageSize = 50, filters = {}, userId } = body;
    
    // Try to get userId from cookies/auth if not provided
    let authenticatedUserId = userId;
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

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        results: [], 
        searchTier: 'basic',
        error: 'Query too short' 
      });
    }

    // Extract structured filters using AI
    const intent = await understandQuery(query);
    
    // Map category synonyms to database categories
    const categorySynonyms: Record<string, string> = {
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

    // Strategy 2: Full-text search on search_text column (if vector search didn't return results or as fallback)
    if (results.length === 0) {
      try {
        let fullTextQuery = supabase
          .from('destinations')
          .select('slug, name, city, category, description, content, image, michelin_stars, crown, rating, price_level')
          .limit(pageSize);

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
    const rankedResults = results
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

    return NextResponse.json({
      results: rankedResults,
      searchTier: searchTier,
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