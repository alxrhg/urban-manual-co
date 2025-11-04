import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai, OPENAI_EMBEDDING_MODEL } from '@/lib/openai';
import { embedText } from '@/lib/llm';
import { intentAnalysisService } from '@/services/intelligence/intent-analysis';
import { forecastingService } from '@/services/intelligence/forecasting';
import { opportunityDetectionService } from '@/services/intelligence/opportunity-detection';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;

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

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openai) {
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
  if (!openai) {
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
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style, interests')
          .eq('user_id', userId)
          .single();
        
        if (profile) {
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

    // Use enhanced intent analysis for deeper understanding
    const enhancedIntent = await intentAnalysisService.analyzeIntent(
      query,
      conversationHistory,
      userId
    );

    // Also get basic intent for backward compatibility
    const intent = await understandQuery(query, conversationHistory, userId);
    
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
          match_count: 1000, // Increased from 100 to 1000 per request
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
          .limit(1000); // Increased from 100 to 1000

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
          .limit(50);

        if (cityResults && cityResults.length > 0) {
          results = cityResults;
          console.log('[AI Chat] City fallback found', results.length, 'results');
        }
      } catch (error: any) {
        console.error('[AI Chat] City fallback exception:', error);
      }
    }

    // Return all results (no artificial limit)
    // Frontend pagination will handle display limits

    // Generate natural language response
    const response = generateResponse(results.length, intent.city, intent.category);

    // Generate enhanced response with context if needed
    let enhancedContent = response;
    if (intent.clarifications && intent.clarifications.length > 0 && results.length === 0) {
      enhancedContent = `${response}\n\n💡 ${intent.clarifications[0]}`;
    }

    // Get intelligence insights if city detected
    let intelligenceInsights = null;
    if (intent.city) {
      try {
        const [forecast, opportunities] = await Promise.all([
          forecastingService.forecastDemand(intent.city, undefined, 30),
          opportunityDetectionService.detectOpportunities(userId, intent.city, 3),
        ]);

        intelligenceInsights = {
          forecast,
          opportunities: opportunities.slice(0, 3),
        };
      } catch (error) {
        // Silently fail - insights are optional
      }
    }

    return NextResponse.json({
      content: enhancedContent,
      destinations: results,
      intent: {
        ...intent,
        resultCount: results.length,
        hasResults: results.length > 0
      },
      enhancedIntent, // Include full enhanced intent
      intelligence: intelligenceInsights,
    });

  } catch (error: any) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({
      content: 'Sorry, I encountered an error. Please try again.',
      destinations: []
    }, { status: 500 });
  }
}

