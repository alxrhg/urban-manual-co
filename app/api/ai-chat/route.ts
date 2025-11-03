import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { embedText } from '@/lib/llm';
import { openai, OPENAI_MODEL } from '@/lib/openai';
import { intentAnalysisService } from '@/services/intelligence/intent-analysis';
import { forecastingService } from '@/services/intelligence/forecasting';
import { opportunityDetectionService } from '@/services/intelligence/opportunity-detection';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co') as string;
const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key') as string;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const ENABLE_GEMINI_FALLBACK = (process.env.ENABLE_GEMINI_FALLBACK || 'false').toLowerCase() === 'true';

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

async function callMatchDestinations(params: MatchDestinationParams) {
  const { data, error } = await supabase.rpc('match_destinations', params);

  if (error && error.code === 'PGRST202' && 'filter_cuisine' in params) {
    const { filter_cuisine, ...legacyParams } = params;
    if (filter_cuisine !== undefined) {
      console.warn('[AI Chat] match_destinations missing cuisine filter, retrying without it');
      return supabase.rpc('match_destinations', legacyParams);
    }
  }

  return { data, error };
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

// Generate embedding using OpenAI (fallback to null if unavailable)
async function generateEmbedding(text: string): Promise<number[] | null> {
  return await embedText(text);
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
    cuisine?: string;
  };
  intent?: string; // User's apparent intent (e.g., "find", "compare", "recommend")
  confidence?: number; // 0-1 confidence score
  clarifications?: string[]; // Questions to clarify ambiguous queries
}> {
  // Prefer OpenAI if available
  if (openai) {
    try {
      console.log('[AI Chat] Using OpenAI to understand query:', query);

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

      const prompt = `Analyze this travel/dining search query with full context. Extract structured information and understand the user's intent deeply. Return ONLY valid JSON with this exact structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "category": "category like restaurant/cafe/hotel or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null,
    "cuisine": "cuisine type like french/italian/japanese or null"
  },
  "intent": "brief description of user intent (e.g., 'finding romantic dinner spots', 'comparing hotels', 'discovering hidden gems')",
  "confidence": 0.0-1.0,
  "clarifications": ["array", "of", "suggested", "questions", "if", "query", "is", "ambiguous"]
}

Query: "${query}"${conversationContext}${userContext}

Guidelines:
- Use conversation history to resolve pronouns and references (e.g., "show me more like this" refers to previous results)
- Use "more", "another", "similar" to expand on previous queries
- If query is ambiguous (e.g., just "hotels" without city), set clarifications with helpful questions
- Extract descriptive modifiers: romantic, cozy, luxury, budget, hidden, trendy, etc. as keywords
- Confidence should reflect how clear the query intent is
- For relative queries ("more", "another", "different"), infer intent from conversation history

Return only the JSON, no other text:`;

      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a travel search query analyzer. Extract structured information from user queries and return ONLY valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const text = response.choices?.[0]?.message?.content || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Guard: if the raw query mentions michelin, enforce michelin >= 1
          const lowerQuery = query.toLowerCase();
          if (lowerQuery.includes('michelin')) {
            parsed.filters = parsed.filters || {};
            if (!parsed.filters.michelinStar || parsed.filters.michelinStar < 1) {
              parsed.filters.michelinStar = 1;
            }
          }
          
          // Guard: if the raw query includes cuisine keywords, set cuisine filter
          const cuisineWords = ['french','italian','japanese','sushi','ramen','izakaya','yakitori','bbq','steak','seafood','indian','thai','vietnamese','korean','mexican','spanish','mediterranean','greek','lebanese','turkish','chinese','cantonese','sichuan','taiwanese','hotpot','shabu','noodle','pasta','bistro'];
          for (const cw of cuisineWords) {
            if (lowerQuery.includes(cw)) {
              parsed.filters = parsed.filters || {};
              parsed.filters.cuisine = cw;
              break;
            }
          }
          
          console.log('[AI Chat] Enhanced parsed intent:', parsed);
          
          // If query contains relative terms, enhance intent from conversation
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
              if (!parsed.category && lastContent.includes('place') || lastContent.includes('restaurant') || lastContent.includes('hotel')) {
                if (lastContent.includes('restaurant')) parsed.category = 'Dining';
                else if (lastContent.includes('hotel')) parsed.category = 'Hotel';
                else if (lastContent.includes('cafe')) parsed.category = 'Cafe';
              }
            }
          }
          
          return parsed;
        } catch (parseError) {
          console.error('[AI Chat] Failed to parse OpenAI response:', parseError);
        }
      }
    } catch (error) {
      console.error('[AI Chat] OpenAI error:', error);
    }
  }

  // Fallback to Gemini if enabled and OpenAI failed
  if (ENABLE_GEMINI_FALLBACK && GOOGLE_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      
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

      const prompt = `Analyze this travel/dining search query with full context. Extract structured information and understand the user's intent deeply. Return ONLY valid JSON with this exact structure:
{
  "keywords": ["array", "of", "main", "keywords"],
  "city": "city name or null",
  "category": "category like restaurant/cafe/hotel or null",
  "filters": {
    "openNow": true/false/null,
    "priceLevel": 1-4 or null,
    "rating": 4-5 or null,
    "michelinStar": 1-3 or null,
    "cuisine": "cuisine type like french/italian/japanese or null"
  },
  "intent": "brief description of user intent (e.g., 'finding romantic dinner spots', 'comparing hotels', 'discovering hidden gems')",
  "confidence": 0.0-1.0,
  "clarifications": ["array", "of", "suggested", "questions", "if", "query", "is", "ambiguous"]
}

Query: "${query}"${conversationContext}${userContext}

Return only the JSON, no other text:`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('[AI Chat] Gemini fallback parsed intent:', parsed);
          return parsed;
        } catch (parseError) {
          console.error('[AI Chat] Failed to parse Gemini response:', parseError);
        }
      }
    } catch (error) {
      console.error('[AI Chat] Gemini fallback error:', error);
    }
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

    if (queryEmbedding) {
      try {
        const { data: vectorResults, error: vectorError } = await callMatchDestinations({
          query_embedding: queryEmbedding,
          match_threshold: 0.55,
          match_count: 200,
          filter_city: intent.city || null,
          filter_category: intent.category || null,
          filter_michelin_stars: intent.filters?.michelinStar || null,
          filter_min_rating: intent.filters?.rating || null,
          filter_max_price_level: intent.filters?.priceLevel || null,
          filter_cuisine: intent.filters?.cuisine || null,
          search_query: query
        });

        if (!vectorError && Array.isArray(vectorResults) && vectorResults.length > 0) {
          results = vectorResults;
        } else if (vectorError) {
          console.warn('[AI Chat] Vector search error:', vectorError);
        }
      } catch (error) {
        console.error('[AI Chat] Vector search exception:', error);
      }
    }

    if (results.length === 0) {
      try {
        const keywords = intent.keywords?.length
          ? intent.keywords
          : query.split(/\s+/).filter((w: string) => w.length > 2);

        const applyFilters = (queryBuilder: any) => {
          let qb = queryBuilder;
          if (intent.city) {
            qb = qb.ilike('city', `%${intent.city}%`);
          }
          if (intent.category) {
            qb = qb.ilike('category', `%${intent.category}%`);
          }
          if (intent.filters?.rating) {
            qb = qb.gte('rating', intent.filters.rating);
          }
          if (intent.filters?.priceLevel) {
            qb = qb.lte('price_level', intent.filters.priceLevel);
          }
          if (intent.filters?.michelinStar) {
            qb = qb.gte('michelin_stars', intent.filters.michelinStar);
          }
          if (intent.filters?.cuisine) {
            qb = qb.contains('tags', [intent.filters.cuisine.toLowerCase()]);
          }
          if (keywords.length > 0) {
            const conditions = keywords
              .map((keyword: string) => [
                `name.ilike.%${keyword}%`,
                `description.ilike.%${keyword}%`,
                `content.ilike.%${keyword}%`,
                `search_text.ilike.%${keyword}%`
              ])
              .flat();
            qb = qb.or(conditions.join(','));
          }
          return qb;
        };

        const buildFallbackQuery = (omitRankingColumns = false) => {
          const selectColumns = omitRankingColumns
            ? 'id, slug, name, city, country, category, description, content, image, michelin_stars, crown, rating, price_level, tags'
            : 'id, slug, name, city, country, category, description, content, image, michelin_stars, crown, rating, price_level, rank_score, trending_score, tags';

          let qb = supabase
            .from('destinations')
            .select(selectColumns)
            .limit(200);

          qb = omitRankingColumns
            ? qb.order('rating', { ascending: false })
            : qb.order('rank_score', { ascending: false });

          return applyFilters(qb);
        };

        let fallbackUsedMinimal = false;
        let { data: fallbackResults, error: fallbackError } = await buildFallbackQuery(false);

        if (fallbackError && fallbackError.code === '42703') {
          console.warn('[AI Chat] rank_score not available, retrying fallback without ranking columns');
          const retryQuery = buildFallbackQuery(true);
          const { data: minimalResults, error: minimalError } = await retryQuery;
          fallbackResults = minimalResults;
          fallbackError = minimalError;
          fallbackUsedMinimal = !minimalError;
        }

        if (!fallbackError && Array.isArray(fallbackResults)) {
          results = fallbackResults.map((d: any) => ({
            ...d,
            blended_rank: fallbackUsedMinimal
              ? (typeof d.rating === 'number' ? d.rating : 0)
              : (d.rank_score || 0) * 0.7 + (d.trending_score || 0) * 0.3,
            vector_similarity: 0,
            full_text_rank: 0
          }));
        } else if (fallbackError) {
          console.error('[AI Chat] Full-text fallback error:', fallbackError);
        }
      } catch (error) {
        console.error('[AI Chat] Full-text fallback exception:', error);
      }
    }

    if (results.length > 0) {
      results = results
        .map((d: any) => ({
          ...d,
          blended_rank: typeof d.blended_rank === 'number' ? d.blended_rank : (typeof d.vector_similarity === 'number' ? d.vector_similarity : 0)
        }))
        .sort((a: any, b: any) => (b.blended_rank || 0) - (a.blended_rank || 0));
    }

    // Frontend pagination will handle display limits

    // Generate conversational response powered by GPT-4.1 when available
    let enhancedContent = generateResponse(results.length, intent.city, intent.category);

    if (openai && results.length > 0) {
      try {
        const topPicks = results.slice(0, 6).map((d: any, index: number) => {
          const highlightTags = Array.isArray(d.tags) ? d.tags.slice(0, 4).join(', ') : '';
          const description = (d.description || d.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
          const summaryParts = [
            `${index + 1}. ${d.name}`,
            d.city ? `(${d.city}${d.country ? `, ${d.country}` : ''})` : '',
            d.category ? `Category: ${d.category}` : '',
            d.rating ? `Rating: ${d.rating}` : '',
            d.michelin_stars ? `${d.michelin_stars}★ Michelin` : '',
            highlightTags ? `Tags: ${highlightTags}` : '',
            description ? `Notes: ${description}` : ''
          ].filter(Boolean);
          return summaryParts.join(' · ');
        }).join('\n');

        const completion = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are The Urban Manual\'s travel curator. Provide concise, evocative suggestions grounded in the provided destinations. Highlight unique qualities without sounding generic. Keep the tone modern, sophisticated, and helpful. Avoid inventing details that are not provided.'
            },
            {
              role: 'user',
              content: `Query: ${query}\nStructured intent: ${JSON.stringify(intent)}\nTop matches:\n${topPicks}\n\nCraft a short (2-3 sentences) reply summarizing why these places fit, then recommend how to explore them next.`
            }
          ],
          temperature: 0.6,
          max_tokens: 220
        });

        const narrative = completion.choices?.[0]?.message?.content?.trim();
        if (narrative) {
          enhancedContent = narrative;
        }
      } catch (error) {
        console.warn('[AI Chat] Failed to generate GPT summary:', error);
      }
    }

    if (intent.clarifications && intent.clarifications.length > 0 && results.length === 0) {
      enhancedContent = `${enhancedContent}\n\n💡 ${intent.clarifications[0]}`;
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

