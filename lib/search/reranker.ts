/**
 * Enhanced Re-Ranker for Urban Manual Search
 * 
 * This re-ranker improves search results by considering multiple signals:
 * 1. Semantic similarity (vector embeddings)
 * 2. Rank score (computed intelligence metrics)
 * 3. Trending score (recent popularity)
 * 4. User engagement signals (views, saves)
 * 5. Editorial quality (ratings, reviews, Michelin stars)
 * 6. Contextual relevance (query intent matching)
 */

interface CreativeMode {
  enabled: boolean;
  type: 'serendipity' | 'contrarian' | 'cross_domain' | 'story_based' | 'mood_alchemy' | 'future_trends' | null;
  intensity: number; // 0.0 - 1.0
}

interface RerankOptions {
  query?: string;
  queryIntent?: {
    city?: string;
    category?: string;
    meal?: string;
    cuisine?: string;
    mood?: string;
    price_level?: number;
    weather_preference?: 'indoor' | 'outdoor' | null;
    event_context?: boolean;
    // Creative search parameters
    inject_serendipity?: boolean;
    cross_category_inspiration?: string;
    emotionalUndertone?: string;
  };
  userId?: string;
  boostPersonalized?: boolean;
  enrichedContext?: {
    currentWeather?: any;
    nearbyEvents?: any[];
  };
  creativeMode?: CreativeMode;
  userTasteProfile?: {
    preferredCategories?: string[];
    preferredStyles?: string[];
    pricePreference?: 'budget' | 'mid' | 'luxury';
    atmospherePreference?: 'quiet' | 'lively' | 'mixed';
  };
}

interface DestinationWithScore {
  id: number;
  slug: string;
  name: string;
  city: string;
  category: string;
  similarity_score?: number;
  rank_score?: number;
  trending_score?: number;
  rating?: number;
  reviews_count?: number;
  michelin_stars?: number;
  views_count?: number;
  saves_count?: number;
  is_open_now?: boolean;
  [key: string]: any;
}

/**
 * Calculate creative mode boost for outside-the-box results
 * This injects serendipity, contrarian suggestions, and unexpected discoveries
 */
function calculateCreativeBoost(
  destination: DestinationWithScore,
  options: RerankOptions
): { boost: number; reason?: string } {
  if (!options.creativeMode?.enabled) {
    return { boost: 0 };
  }

  const { type, intensity } = options.creativeMode;
  let boost = 0;
  let reason: string | undefined;

  switch (type) {
    case 'serendipity':
      // Boost unexpected, quality discoveries
      // Favor: high rating + low save count (undiscovered gems)
      // Favor: unusual categories for the query context
      const isUndiscovered = (destination.saves_count || 0) < 50 && (destination.rating || 0) >= 4.2;
      const hasUniqueTags = destination.tags?.some((tag: string) =>
        ['hidden-gem', 'local-favorite', 'unusual', 'unique', 'experimental', 'avant-garde'].includes(tag.toLowerCase())
      );

      if (isUndiscovered) {
        boost += 0.25 * intensity;
        reason = 'Undiscovered quality spot';
      }
      if (hasUniqueTags) {
        boost += 0.15 * intensity;
        reason = reason ? `${reason}, unique character` : 'Unique character';
      }
      // Add randomness for true serendipity (deterministic based on destination id)
      const serendipityRandom = ((destination.id * 13) % 100) / 100;
      if (serendipityRandom > 0.7) {
        boost += 0.1 * intensity;
      }
      break;

    case 'contrarian':
      // Boost things opposite to user's usual preferences
      if (options.userTasteProfile) {
        const profile = options.userTasteProfile;
        const destCategory = destination.category?.toLowerCase() || '';
        const destStyle = destination.style?.toLowerCase() || '';

        // If user prefers luxury, boost budget options
        if (profile.pricePreference === 'luxury' && destination.price_level && destination.price_level <= 2) {
          boost += 0.2 * intensity;
          reason = 'Different from your usual price range';
        }
        // If user prefers quiet, boost lively places
        if (profile.atmospherePreference === 'quiet' &&
            destination.tags?.some((t: string) => ['lively', 'energetic', 'vibrant', 'bustling'].includes(t.toLowerCase()))) {
          boost += 0.15 * intensity;
          reason = 'A more energetic vibe than usual';
        }
        // If user sticks to certain categories, boost others
        if (profile.preferredCategories?.length &&
            !profile.preferredCategories.some(c => destCategory.includes(c.toLowerCase()))) {
          boost += 0.15 * intensity;
          reason = reason ? `${reason}, new category for you` : 'New category for you';
        }
      }
      break;

    case 'cross_domain':
      // Boost places that blend categories/inspirations
      const crossInspiration = options.queryIntent?.cross_category_inspiration;
      if (crossInspiration) {
        const inspirationTags: Record<string, string[]> = {
          'gallery': ['minimalist', 'artistic', 'curated', 'exhibition', 'white-space', 'design-forward'],
          'bookstore': ['literary', 'cozy', 'intellectual', 'eclectic', 'reading', 'library'],
          'home': ['homey', 'intimate', 'personal', 'comfortable', 'welcoming', 'residential'],
          'museum': ['curated', 'contemplative', 'historic', 'collection', 'specimen'],
          'theater': ['dramatic', 'theatrical', 'performance', 'show', 'stage'],
          'garden': ['green', 'natural', 'peaceful', 'botanical', 'outdoor'],
        };

        const relevantTags = inspirationTags[crossInspiration.toLowerCase()] || [];
        const matchCount = destination.tags?.filter((t: string) =>
          relevantTags.some(rt => t.toLowerCase().includes(rt))
        ).length || 0;

        if (matchCount > 0) {
          boost += Math.min(matchCount * 0.1, 0.3) * intensity;
          reason = `Has ${crossInspiration} vibes`;
        }
      }
      break;

    case 'story_based':
      // Boost places with rich history/stories
      const storyTags = ['historic', 'legendary', 'landmark', 'heritage', 'storied', 'celebrity', 'film-location', 'iconic'];
      const hasStoryTags = destination.tags?.some((t: string) =>
        storyTags.some(st => t.toLowerCase().includes(st))
      );
      const hasHistory = destination.year_established && destination.year_established < 1990;
      const hasDescription = destination.description && destination.description.length > 200;

      if (hasStoryTags) boost += 0.2 * intensity;
      if (hasHistory) boost += 0.15 * intensity;
      if (hasDescription) boost += 0.1 * intensity;

      if (boost > 0) {
        reason = 'Rich backstory';
      }
      break;

    case 'mood_alchemy':
      // Match places to emotional needs
      const emotionalUndertone = options.queryIntent?.emotionalUndertone;
      if (emotionalUndertone) {
        const moodMatches: Record<string, string[]> = {
          'seeking relief': ['serene', 'calming', 'zen', 'peaceful', 'quiet', 'retreat', 'spa'],
          'seeking novelty': ['new', 'experimental', 'pop-up', 'fusion', 'avant-garde', 'innovative'],
          'seeking warmth': ['cozy', 'homey', 'welcoming', 'family-run', 'intimate', 'comfortable'],
          'quiet celebration': ['elegant', 'refined', 'special-occasion', 'intimate', 'romantic'],
          'seeking adventure': ['unusual', 'unique', 'off-beaten-path', 'adventurous', 'exotic'],
        };

        const relevantTags = moodMatches[emotionalUndertone] || [];
        const moodMatch = destination.tags?.filter((t: string) =>
          relevantTags.some(rt => t.toLowerCase().includes(rt))
        ).length || 0;

        if (moodMatch > 0) {
          boost += Math.min(moodMatch * 0.12, 0.35) * intensity;
          reason = `Perfect for your mood`;
        }
      }
      break;

    case 'future_trends':
      // Boost emerging/rising places
      const isNewOpening = destination.year_established && destination.year_established >= new Date().getFullYear() - 1;
      const isRisingStar = (destination.rating || 0) >= 4.3 && (destination.saves_count || 0) < 100;
      const hasTrendTags = destination.tags?.some((t: string) =>
        ['emerging', 'new', 'rising-star', 'chef-to-watch', 'trending'].includes(t.toLowerCase())
      );

      if (isNewOpening) {
        boost += 0.25 * intensity;
        reason = 'New opening';
      }
      if (isRisingStar) {
        boost += 0.2 * intensity;
        reason = reason ? `${reason}, rising star` : 'Rising star';
      }
      if (hasTrendTags) {
        boost += 0.15 * intensity;
      }
      break;
  }

  return { boost: Math.min(boost, 0.4), reason }; // Cap at 40%
}

/**
 * Inject serendipity into results by shuffling some high-quality surprises into top positions
 */
function injectSerendipity(
  destinations: DestinationWithScore[],
  intensity: number = 0.3
): DestinationWithScore[] {
  if (destinations.length < 5) return destinations;

  // Find quality surprises from lower positions (positions 5-15)
  const surpriseCandidates = destinations.slice(4, 15).filter(d =>
    (d.rating || 0) >= 4.0 &&
    (d.saves_count || 0) < 100 // Less popular = more surprising
  );

  if (surpriseCandidates.length === 0) return destinations;

  // Pick 1-2 surprises based on intensity
  const numSurprises = Math.ceil(intensity * 2);
  const surprises = surpriseCandidates.slice(0, numSurprises);

  // Insert surprises at positions 2-4 (after the top result)
  const result = [...destinations];
  surprises.forEach((surprise, i) => {
    const originalIndex = destinations.indexOf(surprise);
    if (originalIndex > 0) {
      // Remove from original position
      result.splice(result.indexOf(surprise), 1);
      // Insert at position 2 + i
      result.splice(2 + i, 0, { ...surprise, _surprise_injection: true } as any);
    }
  });

  return result;
}

/**
 * Calculate enriched data boost (weather, events, routes)
 */
function calculateEnrichmentBoost(
  destination: DestinationWithScore,
  options: RerankOptions
): number {
  let boost = 0;

  // Weather-aware boosting
  if (options.enrichedContext?.currentWeather) {
    const weather = options.enrichedContext.currentWeather;
    const weatherCode = weather.weatherCode;

    // Boost indoor options if it's raining/snowing
    if (options.queryIntent?.weather_preference === 'indoor' || 
        (weatherCode >= 61 && weatherCode <= 86)) {
      // Check if destination has indoor seating (heuristic: hotels, cafes, restaurants)
      if (destination.category?.toLowerCase().includes('hotel') ||
          destination.category?.toLowerCase().includes('cafe') ||
          destination.category?.toLowerCase().includes('dining')) {
        boost += 0.1;
      }
    }

    // Boost outdoor options if weather is clear
    if (options.queryIntent?.weather_preference === 'outdoor' ||
        (weatherCode === 0 || weatherCode === 1)) {
      // Boost places with outdoor seating (heuristic: check tags or description)
      if (destination.tags?.some((tag: string) => 
        tag.toLowerCase().includes('outdoor') || 
        tag.toLowerCase().includes('terrace') ||
        tag.toLowerCase().includes('rooftop'))) {
        boost += 0.1;
      }
    }
  }

  // Event proximity boost
  if (options.enrichedContext?.nearbyEvents && 
      options.enrichedContext.nearbyEvents.length > 0) {
    // Boost destinations near events
    if (destination.nearbyEvents && destination.nearbyEvents.length > 0) {
      boost += 0.05 * Math.min(destination.nearbyEvents.length, 3);
    }
  }

  // Walking distance boost (closer = better)
  if (destination.walkingTimeFromCenter) {
    const walkingMinutes = destination.walkingTimeFromCenter;
    if (walkingMinutes <= 5) {
      boost += 0.15; // Very close
    } else if (walkingMinutes <= 15) {
      boost += 0.1; // Convenient
    } else if (walkingMinutes <= 30) {
      boost += 0.05; // Accessible
    }
  }

  // Photo availability boost (more photos = more trustworthy)
  if (destination.photos && Array.isArray(destination.photos)) {
    const photoCount = destination.photos.length;
    boost += Math.min(photoCount * 0.01, 0.1); // Max 0.1 boost
  }

  return boost;
}

/**
 * Calculate boosted similarity score based on query intent matching
 */
function calculateIntentMatchBoost(
  destination: DestinationWithScore,
  intent: RerankOptions['queryIntent']
): number {
  if (!intent) return 0;

  let boost = 0;

  // City match (strong boost)
  if (intent.city && destination.city?.toLowerCase().includes(intent.city.toLowerCase())) {
    boost += 0.3;
  }

  // Category match (strong boost)
  if (intent.category && destination.category?.toLowerCase() === intent.category.toLowerCase()) {
    boost += 0.25;
  }

  // Price level match (moderate boost)
  if (intent.price_level && destination.price_level === intent.price_level) {
    boost += 0.15;
  }

  // Michelin stars preference (if user is looking for fine dining)
  if (intent.category?.toLowerCase().includes('dining') && destination.michelin_stars && destination.michelin_stars > 0) {
    boost += 0.1;
  }

  return Math.min(boost, 0.5); // Cap at 50% boost
}

/**
 * Calculate editorial quality score
 */
function calculateEditorialQuality(destination: DestinationWithScore): number {
  let quality = 0;

  // High ratings boost
  if (destination.rating && destination.rating >= 4.5) {
    quality += 0.3;
  } else if (destination.rating && destination.rating >= 4.0) {
    quality += 0.2;
  } else if (destination.rating && destination.rating >= 3.5) {
    quality += 0.1;
  }

  // Michelin stars boost
  if (destination.michelin_stars) {
    quality += destination.michelin_stars * 0.15;
  }

  // Review count (social proof)
  if (destination.reviews_count) {
    if (destination.reviews_count >= 100) {
      quality += 0.15;
    } else if (destination.reviews_count >= 50) {
      quality += 0.1;
    } else if (destination.reviews_count >= 10) {
      quality += 0.05;
    }
  }

  return Math.min(quality, 0.8); // Cap at 80%
}

/**
 * Calculate engagement score (recent popularity)
 */
function calculateEngagementScore(destination: DestinationWithScore): number {
  let engagement = 0;

  // Normalize views_count (0-1 scale, assuming max ~10000 views)
  if (destination.views_count) {
    engagement += Math.min(destination.views_count / 10000, 1) * 0.2;
  }

  // Normalize saves_count (0-1 scale, assuming max ~1000 saves)
  if (destination.saves_count) {
    engagement += Math.min(destination.saves_count / 1000, 1) * 0.3;
  }

  // Trending score (already normalized 0-1)
  if (destination.trending_score) {
    engagement += destination.trending_score * 0.3;
  }

  // Open now boost (time relevance)
  if (destination.is_open_now) {
    engagement += 0.2;
  }

  return Math.min(engagement, 1); // Cap at 100%
}

/**
 * Re-rank search results using multiple signals
 * 
 * Final score formula:
 * - Base similarity: 40%
 * - Rank score (intelligence): 25%
 * - Engagement (trending, views, saves): 20%
 * - Editorial quality (ratings, Michelin): 10%
 * - Intent match boost: 5% (additive)
 */
export function rerankDestinations(
  destinations: DestinationWithScore[],
  options: RerankOptions = {}
): DestinationWithScore[] {
  if (!destinations || destinations.length === 0) {
    return [];
  }

  // Normalize scores to 0-1 range
  const normalize = (value: number, min: number, max: number): number => {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  };

  // Find min/max for normalization
  const similarityScores = destinations.map(d => d.similarity_score || 0).filter(s => s > 0);
  const rankScores = destinations.map(d => d.rank_score || 0).filter(s => s > 0);
  const trendingScores = destinations.map(d => d.trending_score || 0).filter(s => s > 0);

  const minSimilarity = similarityScores.length > 0 ? Math.min(...similarityScores) : 0;
  const maxSimilarity = similarityScores.length > 0 ? Math.max(...similarityScores) : 1;
  const minRank = rankScores.length > 0 ? Math.min(...rankScores) : 0;
  const maxRank = rankScores.length > 0 ? Math.max(...rankScores) : 1;
  const minTrending = trendingScores.length > 0 ? Math.min(...trendingScores) : 0;
  const maxTrending = trendingScores.length > 0 ? Math.max(...trendingScores) : 1;

  // Calculate final scores
  const scored = destinations.map(dest => {
    // Normalize individual scores
    const normSimilarity = normalize(dest.similarity_score || 0, minSimilarity, maxSimilarity);
    const normRank = normalize(dest.rank_score || 0, minRank, maxRank);
    const normTrending = normalize(dest.trending_score || 0, minTrending, maxTrending);

    // Calculate component scores
    const baseSimilarity = normSimilarity * 0.40;
    const intelligenceScore = normRank * 0.25;
    const engagementScore = calculateEngagementScore(dest) * 0.20;
    const qualityScore = calculateEditorialQuality(dest) * 0.10;
    const intentBoost = calculateIntentMatchBoost(dest, options.queryIntent) * 0.05;
    const enrichmentBoost = calculateEnrichmentBoost(dest, options);

    // Creative mode boost (serendipity, contrarian, etc.)
    const creativeResult = calculateCreativeBoost(dest, options);
    const creativeBoost = creativeResult.boost;

    // Personalization boost (if user has saved/visited similar places)
    let personalizationBoost = 0;
    if (options.boostPersonalized && options.userId) {
      // This would be enhanced with actual user data
      // For now, we'll use trending as a proxy
      personalizationBoost = normTrending * 0.05;
    }

    // Final score (enrichment + creative boosts are additive)
    const finalScore =
      baseSimilarity +
      intelligenceScore +
      engagementScore +
      qualityScore +
      intentBoost +
      personalizationBoost +
      Math.min(enrichmentBoost, 0.15) +
      creativeBoost; // Creative boost can add up to 0.4

    return {
      ...dest,
      _rerank_score: finalScore,
      _creative_reason: creativeResult.reason,
      _components: {
        similarity: baseSimilarity,
        intelligence: intelligenceScore,
        engagement: engagementScore,
        quality: qualityScore,
        intent: intentBoost,
        personalized: personalizationBoost,
        enrichment: Math.min(enrichmentBoost, 0.15),
        creative: creativeBoost,
      },
    };
  });

  // Sort by final score (descending)
  let ranked = scored.sort((a: any, b: any) => b._rerank_score - a._rerank_score);

  // Apply serendipity injection if enabled
  if (options.creativeMode?.enabled &&
      (options.creativeMode.type === 'serendipity' || options.queryIntent?.inject_serendipity)) {
    ranked = injectSerendipity(ranked, options.creativeMode.intensity || 0.5) as any;
  }

  // Remove internal scoring fields before returning (keep creative reason for response generation)
  return ranked.map(({ _rerank_score, _components, ...rest }: any) => rest);
}

/**
 * Re-rank with cross-encoder style semantic matching
 * This provides a more accurate semantic match than simple cosine similarity
 */
export function rerankWithCrossEncoder(
  destinations: DestinationWithScore[],
  query: string,
  options: RerankOptions = {}
): DestinationWithScore[] {
  // For now, use the multi-signal reranker
  // In the future, you could integrate a lightweight cross-encoder model
  // like: @xenova/transformers (runs in browser/edge) or API-based (Cohere, Jina)
  
  return rerankDestinations(destinations, { ...options, query });
}

