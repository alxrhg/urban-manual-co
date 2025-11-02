import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Generate embedding using Google's text-embedding-004 model
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!GOOGLE_API_KEY) {
    console.error('[AI Chat] No Google API key available');
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
          content: { parts: [{ text }] }
        })
      }
    );

    const data = await response.json();
    
    if (data.embedding?.values) {
      return data.embedding.values;
    }
    
    console.error('[AI Chat] Unexpected embedding response format:', data);
    return null;
  } catch (error) {
    console.error('[AI Chat] Error generating embedding:', error);
    return null;
  }
}

// AI-powered query understanding
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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
        console.log('[AI Chat] Parsed intent:', parsed);
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

  return { keywords, city, category };
}

// Generate natural language response
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

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        content: 'Please enter a search query.',
        destinations: []
      });
    }

    // Extract structured filters using AI
    const intent = await understandQuery(query);
    
    // Normalize category using synonyms
    if (intent.category) {
      const normalized = CATEGORY_SYNONYMS[intent.category.toLowerCase()];
      if (normalized) {
        intent.category = normalized;
      }
    }
    
    console.log('[AI Chat] Query:', query, 'Intent:', JSON.stringify(intent, null, 2));

    // Generate embedding for vector search
    const queryEmbedding = await generateEmbedding(query);

    let results: any[] = [];

    // Strategy 1: Vector similarity search (if embeddings available)
    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_destinations', {
          query_embedding: queryEmbedding,
          match_threshold: 0.6, // Lower threshold for more results
          match_count: 50,
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

    // Strategy 2: Fallback to filtered search if vector search returns no results
    if (results.length === 0) {
      try {
        let fallbackQuery = supabase
          .from('destinations')
          .select('*')
          .limit(50);

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

        const { data: fallbackResults, error: fallbackError } = await fallbackQuery;

        if (!fallbackError && fallbackResults) {
          results = fallbackResults;
          console.log('[AI Chat] Fallback search found', results.length, 'results');
        }
      } catch (error: any) {
        console.error('[AI Chat] Fallback search exception:', error);
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
          .limit(12);

        if (cityResults && cityResults.length > 0) {
          results = cityResults;
          console.log('[AI Chat] City fallback found', results.length, 'results');
        }
      } catch (error: any) {
        console.error('[AI Chat] City fallback exception:', error);
      }
    }

    // Limit to 12 results for display
    const limitedResults = results.slice(0, 12);

    // Generate natural language response
    const response = generateResponse(limitedResults.length, intent.city, intent.category);

    return NextResponse.json({
      content: response,
      destinations: limitedResults,
      searchParams: intent
    });

  } catch (error: any) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: []
    }, { status: 500 });
  }
}

