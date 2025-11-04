/**
 * Travel Intelligence System Configuration
 *
 * Centralized configuration for all ML/AI features with intelligent defaults
 * optimized for travel discovery and personalized recommendations.
 */

export const TravelIntelligenceConfig = {
  // ============================================================================
  // EMBEDDING & VECTOR SEARCH
  // ============================================================================
  embeddings: {
    model: 'text-embedding-3-large',
    dimensions: 1536, // OpenAI standard for this model
    batchSize: 100, // Max embeddings per batch request
    cacheEnabled: true,
    cacheTTL: 3600, // 1 hour in seconds
    retryAttempts: 3,
    retryBackoffMs: 1000, // Exponential: 1s, 2s, 4s
  },

  vectorSearch: {
    similarityThreshold: 0.65, // Minimum cosine similarity for relevance
    maxResults: 100,
    semanticWeight: 0.7, // 70% semantic similarity
    rankWeight: 0.3, // 30% rank score
  },

  // ============================================================================
  // RECOMMENDATION ENGINE
  // ============================================================================
  recommendations: {
    // Hybrid recommendation weights (must sum to 1.0)
    weights: {
      collaborative: 0.30, // User similarity
      contentBased: 0.30, // Attribute matching
      aiPersonalization: 0.25, // AI-powered user embeddings
      popularity: 0.15, // Trending & engagement
    },

    // Caching strategy
    cacheHours: 24, // Refresh recommendations daily for freshness
    minRecommendations: 10, // Trigger refresh if below threshold
    maxCandidates: 150, // Candidates to score

    // Filters
    excludeVisited: true,
    excludeSaved: false, // Include saved for re-ranking
    minRating: 3.5, // Minimum quality threshold
  },

  // ============================================================================
  // SEARCH RE-RANKING
  // ============================================================================
  reranking: {
    // Multi-signal weights (must sum to 1.0)
    signals: {
      semanticSimilarity: 0.35,
      rankScore: 0.25,
      engagement: 0.20,
      editorialQuality: 0.12,
      intentMatch: 0.08,
    },

    // Quality thresholds
    highRatingThreshold: 4.5,
    minReviewsForTrust: 10,
    michelinBoost: 0.15, // Per star

    // Context boosts
    openNowBoost: 0.2,
    trendingBoost: 0.15,
  },

  // ============================================================================
  // INTENT ANALYSIS & NLU
  // ============================================================================
  intentAnalysis: {
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    maxConversationHistory: 6, // Last N messages for context
    confidenceThreshold: 0.6, // Below this, ask clarifying questions
    enableUserContext: true, // Use profile data
  },

  // ============================================================================
  // PERSONALIZATION
  // ============================================================================
  personalization: {
    // User profile enrichment
    minInteractionsForProfile: 3,
    profileUpdateFrequency: 'daily',

    // Embedding-based personalization
    userEmbedding: {
      enabled: true,
      weightRecent: 0.6, // Recent behavior more important
      weightSaved: 0.3,
      weightPreferences: 0.1,
      refreshAfterInteractions: 5, // Update after N new interactions
    },

    // Cold start handling
    coldStart: {
      usePopular: true,
      useCityDefaults: true,
      useCollaborative: false, // Not useful for new users
    },
  },

  // ============================================================================
  // TRAVEL CONTEXT
  // ============================================================================
  travelContext: {
    // Time-aware recommendations
    temporal: {
      breakfastHours: [6, 11],
      lunchHours: [11, 15],
      dinnerHours: [17, 23],
      lateNightHours: [23, 4],
      considerTimeOfDay: true,
    },

    // Seasonal adjustments
    seasonal: {
      enabled: true,
      boostSeasonalEvents: 0.2,
      considerWeather: false, // Future: weather API integration
    },

    // Social context
    social: {
      dateSpotBoost: 0.25,
      groupFriendlyBoost: 0.15,
      soloFriendlyBoost: 0.1,
    },
  },

  // ============================================================================
  // INTELLIGENCE SERVICES
  // ============================================================================
  forecasting: {
    enabled: true,
    forecastDays: 30,
    updateFrequency: 'weekly',
    confidenceThreshold: 0.7,
  },

  opportunityDetection: {
    enabled: true,
    priceDropThreshold: 0.15, // 15% price drop
    newPlaceBoost: 0.3, // Boost new (<30 days) places
    trendingThreshold: 1.5, // 1.5x normal traffic
  },

  knowledgeGraph: {
    enabled: true,
    relationshipTypes: [
      'similar',
      'nearby',
      'complementary',
      'alternative',
      'sequential',
    ],
    minStrength: 0.6, // Minimum relationship strength
    maxRelated: 10, // Max related destinations
  },

  // ============================================================================
  // CACHING & PERFORMANCE
  // ============================================================================
  cache: {
    enabled: true,
    strategy: 'lru', // Least Recently Used
    maxSize: 1000, // Max cached items
    ttls: {
      embeddings: 3600, // 1 hour
      searches: 1800, // 30 minutes
      recommendations: 86400, // 24 hours
      profiles: 43200, // 12 hours
    },
  },

  // ============================================================================
  // RATE LIMITING
  // ============================================================================
  rateLimits: {
    openai: {
      requestsPerMinute: 500,
      tokensPerMinute: 150000,
    },
    gemini: {
      requestsPerMinute: 60,
    },
  },

  // ============================================================================
  // EXPLAINABILITY
  // ============================================================================
  explainability: {
    enabled: true,
    includeScores: true,
    includeFactors: true,
    humanReadableReasons: true,
    maxReasonLength: 200,
  },

  // ============================================================================
  // MONITORING & TELEMETRY
  // ============================================================================
  monitoring: {
    enabled: true,
    logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
    trackMetrics: {
      apiLatency: true,
      cacheHitRate: true,
      recommendationQuality: true,
      searchRelevance: true,
    },
  },
} as const;

// Type-safe config access
export type TravelIntelligenceConfigType = typeof TravelIntelligenceConfig;

// Helper to get nested config values
export function getConfig<T extends keyof TravelIntelligenceConfigType>(
  section: T
): TravelIntelligenceConfigType[T] {
  return TravelIntelligenceConfig[section];
}

// Validation functions
export function validateWeights(weights: Record<string, number>): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.001; // Allow for floating point errors
}

// Initialize config on startup
export function initializeTravelIntelligence() {
  // Validate recommendation weights
  if (!validateWeights(TravelIntelligenceConfig.recommendations.weights)) {
    console.warn('⚠️ [Travel Intelligence] Recommendation weights do not sum to 1.0');
  }

  // Validate reranking weights
  if (!validateWeights(TravelIntelligenceConfig.reranking.signals)) {
    console.warn('⚠️ [Travel Intelligence] Reranking signal weights do not sum to 1.0');
  }

  console.log('✅ [Travel Intelligence] Configuration initialized');

  return TravelIntelligenceConfig;
}
