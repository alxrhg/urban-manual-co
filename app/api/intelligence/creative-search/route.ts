/**
 * Creative Search API
 *
 * An enhanced search endpoint that thinks outside the box.
 * Goes beyond keyword matching to understand mood, make unexpected connections,
 * and offer proactive suggestions.
 *
 * Features:
 * - Mood/emotion-based search ("I need to escape", "feeling adventurous")
 * - Serendipity mode ("surprise me", "something unexpected")
 * - Cross-domain connections (architecture lovers → notable restaurant spaces)
 * - Experiential narratives ("perfect Sunday morning")
 * - Proactive suggestions (what you didn't ask for but might love)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { creativeIntelligenceService, CreativeIntent } from '@/services/intelligence/creative-intelligence';
import { crossDomainIntelligenceService } from '@/services/intelligence/cross-domain-intelligence';
import { proactiveSuggestionsEngine, ProactiveContext } from '@/services/intelligence/proactive-suggestions';
import { getCreativeSystemPrompt } from '@/lib/ai/systemPrompts';
import { generateText } from '@/lib/llm';
import { getSeasonalContext } from '@/services/seasonality';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key';

  return createClient(url, key);
}

interface CreativeSearchRequest {
  query: string;
  userId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  enableProactiveSuggestions?: boolean;
  enableCrossDomain?: boolean;
  serendipityLevel?: 'low' | 'medium' | 'high';
}

interface CreativeSearchResponse {
  // The creative interpretation of their query
  interpretation: string;

  // What we detected about their intent
  creativeIntent: CreativeIntent;

  // Primary results matching their query
  results: any[];

  // Context string (AI-generated narrative)
  context: string;

  // Proactive suggestions (things they didn't ask for)
  proactiveSuggestions?: any[];

  // Cross-domain discoveries
  crossDomainDiscoveries?: any[];

  // Exploration vectors (directions they could explore)
  explorationVectors: string[];

  // Whether we went into creative mode
  creativeMode: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreativeSearchRequest = await request.json();
    const {
      query,
      userId,
      conversationHistory = [],
      enableProactiveSuggestions = true,
      enableCrossDomain = true,
      serendipityLevel = 'medium',
    } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        interpretation: 'What are you in the mood for?',
        creativeIntent: { type: 'standard', confidence: 0, explorationVectors: [], interpretation: '' },
        results: [],
        context: 'Tell me what kind of experience you\'re looking for, and I\'ll find something special.',
        explorationVectors: [],
        creativeMode: false,
      });
    }

    // Step 1: Analyze creative intent
    const creativeIntent = await creativeIntelligenceService.analyzeCreativeIntent(
      query,
      conversationHistory,
      userId
    );

    const isCreativeQuery = creativeIntent.type !== 'standard';

    // Step 2: Get base results using creative scoring
    const supabase = getSupabaseClient();

    let baseQuery = supabase
      .from('destinations')
      .select('id, slug, name, city, country, category, micro_description, description, image, michelin_stars, crown, rating, price_level, tags, style_tags, ambience_tags, experience_tags, architect, latitude, longitude')
      .limit(200);

    // Apply city filter if detected
    if (creativeIntent.structured?.city) {
      baseQuery = baseQuery.ilike('city', `%${creativeIntent.structured.city}%`);
    }

    // For non-serendipity queries, apply category filter
    if (creativeIntent.type !== 'serendipity' && creativeIntent.structured?.category) {
      const categoryMap: Record<string, string> = {
        'restaurant': 'Restaurant',
        'hotel': 'Hotel',
        'cafe': 'Cafe',
        'bar': 'Bar',
      };
      const normalizedCategory = categoryMap[creativeIntent.structured.category.toLowerCase()] || creativeIntent.structured.category;
      baseQuery = baseQuery.ilike('category', `%${normalizedCategory}%`);
    }

    const { data: baseResults, error } = await baseQuery;

    if (error) {
      console.error('[Creative Search] Error fetching results:', error);
      return NextResponse.json({
        interpretation: 'Something went wrong',
        creativeIntent,
        results: [],
        context: 'We encountered an error. Please try again.',
        explorationVectors: [],
        creativeMode: false,
      }, { status: 500 });
    }

    // Step 3: Score and rank results based on creative intent
    let scoredResults = await scoreResultsCreatively(baseResults || [], creativeIntent, serendipityLevel);

    // Step 4: Apply serendipity shuffle if needed
    if (creativeIntent.type === 'serendipity' || serendipityLevel === 'high') {
      scoredResults = applySerendipityShuffle(scoredResults);
    }

    // Take top results
    const topResults = scoredResults.slice(0, 30);

    // Step 5: Generate creative context using enhanced prompts
    const context = await generateCreativeContext(
      query,
      creativeIntent,
      topResults.slice(0, 5),
      creativeIntent.structured?.city
    );

    // Step 6: Get proactive suggestions if enabled
    let proactiveSuggestions: any[] = [];
    if (enableProactiveSuggestions && topResults.length > 0) {
      const proactiveContext: ProactiveContext = {
        currentFocus: {
          destination: topResults[0],
          category: creativeIntent.structured?.category,
          city: creativeIntent.structured?.city,
          query,
        },
        userProfile: userId ? await getUserProfile(userId, supabase) : undefined,
        temporalContext: getTemporalContext(),
      };

      const suggestions = await proactiveSuggestionsEngine.generateSuggestions(
        proactiveContext,
        3
      );
      proactiveSuggestions = suggestions;
    }

    // Step 7: Get cross-domain discoveries if enabled
    let crossDomainDiscoveries: any[] = [];
    if (enableCrossDomain && userId) {
      const userInterests = await crossDomainIntelligenceService.detectDomainInterests(
        query,
        userId,
        conversationHistory
      );

      if (userInterests.length > 0) {
        const discoveries = await crossDomainIntelligenceService.getCrossDomainRecommendations(
          userInterests,
          undefined,
          creativeIntent.structured?.city,
          3
        );
        crossDomainDiscoveries = discoveries;
      }
    }

    // Step 8: Build response
    const response: CreativeSearchResponse = {
      interpretation: creativeIntent.interpretation,
      creativeIntent,
      results: topResults.map(r => ({
        ...r,
        _creativeScore: r._creativeScore,
        _creativeReason: r._creativeReason,
      })),
      context,
      proactiveSuggestions: proactiveSuggestions.length > 0 ? proactiveSuggestions : undefined,
      crossDomainDiscoveries: crossDomainDiscoveries.length > 0 ? crossDomainDiscoveries : undefined,
      explorationVectors: creativeIntent.explorationVectors,
      creativeMode: isCreativeQuery,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[Creative Search] Error:', error);
    return NextResponse.json({
      interpretation: 'Something unexpected happened',
      creativeIntent: { type: 'standard', confidence: 0, explorationVectors: [], interpretation: '' },
      results: [],
      context: 'We encountered an error processing your search.',
      explorationVectors: [],
      creativeMode: false,
      error: error.message,
    }, { status: 500 });
  }
}

/**
 * Score results based on creative intent
 */
async function scoreResultsCreatively(
  destinations: any[],
  intent: CreativeIntent,
  serendipityLevel: string
): Promise<any[]> {
  const scored = destinations.map(dest => {
    let score = 0;
    let reason = '';

    const allTags = [
      ...(dest.tags || []),
      ...(dest.style_tags || []),
      ...(dest.ambience_tags || []),
      ...(dest.experience_tags || []),
    ].map(t => t.toLowerCase());

    const description = (dest.description || '').toLowerCase();
    const microDesc = (dest.micro_description || '').toLowerCase();

    // Base quality signals
    if (dest.michelin_stars && dest.michelin_stars > 0) {
      score += dest.michelin_stars * 5;
    }
    if (dest.crown) {
      score += 10;
    }
    if (dest.rating && dest.rating >= 4.5) {
      score += 5;
    }

    // Score based on intent type
    switch (intent.type) {
      case 'mood_based':
        if (intent.mood) {
          for (const seeking of intent.mood.seeking) {
            if (allTags.some(t => t.includes(seeking)) || description.includes(seeking)) {
              score += 15;
              reason = `Matches your ${intent.mood.primary} mood`;
            }
          }
          // Boost for strong mood matches
          if (allTags.includes(intent.mood.primary)) {
            score += 20;
            reason = `Perfect for when you're feeling ${intent.mood.primary}`;
          }
        }
        break;

      case 'serendipity':
        // For serendipity, prioritize hidden gems and add randomness
        if (allTags.includes('hidden gem') || allTags.includes('local favorite')) {
          score += 25;
          reason = 'A hidden gem';
        }
        if (dest.crown && !dest.michelin_stars) {
          score += 15;
          reason = 'Editor\'s secret pick';
        }
        // Add randomness for true serendipity
        score += Math.random() * 20;
        break;

      case 'experiential':
        if (intent.experience) {
          // Time context matching
          if (intent.experience.timeContext === 'morning' &&
              allTags.some(t => ['breakfast', 'brunch', 'coffee', 'morning'].includes(t))) {
            score += 20;
            reason = 'Perfect for mornings';
          }
          if (intent.experience.timeContext === 'evening' &&
              allTags.some(t => ['dinner', 'cocktails', 'romantic', 'evening'].includes(t))) {
            score += 20;
            reason = 'Ideal for evenings';
          }
          // Companion matching
          if (intent.experience.companions === 'couple' && allTags.includes('romantic')) {
            score += 25;
            reason = 'Made for couples';
          }
          if (intent.experience.companions === 'solo' &&
              (allTags.includes('counter') || allTags.includes('solo-friendly'))) {
            score += 20;
            reason = 'Great for solo dining';
          }
        }
        break;

      case 'cross_domain':
        if (intent.crossDomain) {
          if (dest.architect) {
            score += 30;
            reason = `Designed by ${dest.architect}`;
          }
          if (allTags.some(t => t.includes(intent.crossDomain!.sourceInterest))) {
            score += 20;
            reason = `Notable ${intent.crossDomain.sourceInterest}`;
          }
        }
        break;

      case 'time_capsule':
        if (intent.timeCapsule) {
          for (const essence of intent.timeCapsule.essence) {
            if (allTags.some(t => t.includes(essence.toLowerCase())) ||
                description.includes(essence.toLowerCase())) {
              score += 15;
              reason = `${intent.timeCapsule.era} vibes`;
            }
          }
        }
        break;

      case 'sensory':
        if (intent.sensory) {
          for (const seek of intent.sensory.seeking) {
            if (allTags.includes(seek) || description.includes(seek)) {
              score += 15;
              reason = `${seek.charAt(0).toUpperCase() + seek.slice(1)} atmosphere`;
            }
          }
          // Penalize what they're avoiding
          for (const avoid of intent.sensory.avoiding) {
            if (allTags.includes(avoid) || description.includes(avoid)) {
              score -= 30;
            }
          }
        }
        break;

      default:
        // Standard scoring - just use base quality signals
        break;
    }

    // Match exploration vectors
    for (const vector of intent.explorationVectors) {
      const lowerVector = vector.toLowerCase();
      if (allTags.some(t => t.includes(lowerVector)) ||
          description.includes(lowerVector) ||
          microDesc.includes(lowerVector)) {
        score += 10;
        if (!reason) {
          reason = `Matches "${vector}"`;
        }
      }
    }

    return {
      ...dest,
      _creativeScore: score,
      _creativeReason: reason || 'Curated selection',
    };
  });

  // Sort by creative score
  return scored.sort((a, b) => b._creativeScore - a._creativeScore);
}

/**
 * Apply serendipity shuffle for surprise factor
 */
function applySerendipityShuffle(results: any[]): any[] {
  // Take top results but shuffle them a bit for serendipity
  const top = results.slice(0, 10);
  const rest = results.slice(10);

  // Fisher-Yates shuffle on top results
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }

  return [...top, ...rest];
}

/**
 * Generate creative context narrative
 */
async function generateCreativeContext(
  query: string,
  intent: CreativeIntent,
  topResults: any[],
  city?: string
): Promise<string> {
  try {
    const systemPrompt = getCreativeSystemPrompt(intent.type);
    const seasonality = city ? getSeasonalContext(city) : undefined;

    const destinationList = topResults
      .slice(0, 5)
      .map(d => `${d.name} (${d.category}): ${d.micro_description || d.description?.slice(0, 100) || ''}`)
      .join('\n');

    const fullPrompt = `${systemPrompt}

Query: "${query}"
Intent: ${intent.type} - ${intent.interpretation}
${seasonality ? `Season: ${seasonality}` : ''}

Top destinations found:
${destinationList}

Generate a brief, evocative context (2-3 sentences max) that:
1. Acknowledges what they're looking for (mood, experience, etc.)
2. Hints at what they'll discover
3. Creates intrigue without overselling

Be conversational and warm, like a knowledgeable friend sharing a secret.
Don't list places - weave them into a narrative if you mention any.`;

    const context = await generateText(fullPrompt, { maxTokens: 200 });

    if (context) {
      return context;
    }
  } catch (error) {
    console.error('Error generating creative context:', error);
  }

  // Fallback context based on intent
  const fallbacks: Record<string, string> = {
    mood_based: `We found places that match your mood. These spots understand what you're feeling.`,
    serendipity: `Here's something unexpected. Trust us on this one.`,
    experiential: `We've curated experiences that tell the story you're looking for.`,
    cross_domain: `These places share the sensibility you appreciate. The connection might surprise you.`,
    time_capsule: `Step into another era. These places have kept their soul.`,
    sensory: `Atmospheres that deliver exactly what you're craving.`,
    standard: `Our curated selection for you.`,
  };

  return fallbacks[intent.type] || fallbacks.standard;
}

/**
 * Get user profile for personalization
 */
async function getUserProfile(userId: string, supabase: any): Promise<any> {
  try {
    const { data: profile } = await supabase
      .from('user_preferences')
      .select('interests, favorite_cities, favorite_categories, travel_style')
      .eq('user_id', userId)
      .single();

    if (profile) {
      return {
        interests: profile.interests || [],
        favoriteCities: profile.favorite_cities || [],
        favoriteCategories: profile.favorite_categories || [],
        travelStyle: profile.travel_style,
      };
    }
  } catch (error) {
    // Silent fail - profile is optional
  }

  return undefined;
}

/**
 * Get temporal context for time-aware suggestions
 */
function getTemporalContext(): ProactiveContext['temporalContext'] {
  const now = new Date();
  const hour = now.getHours();

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = days[now.getDay()];

  const month = now.getMonth();
  let season: string;
  if (month >= 2 && month <= 4) {
    season = 'spring';
  } else if (month >= 5 && month <= 7) {
    season = 'summer';
  } else if (month >= 8 && month <= 10) {
    season = 'autumn';
  } else {
    season = 'winter';
  }

  return { timeOfDay, dayOfWeek, season };
}
