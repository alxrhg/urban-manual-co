/**
 * Enhanced Search & Ranking Algorithm
 * Comprehensive ranking system with Manual Score integration
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { richQueryContextService, RichQueryContext } from '@/services/intelligence/rich-query-context';
import { tasteProfileEvolutionService, TasteProfile } from '@/services/intelligence/taste-profile-evolution';
import type { Destination } from '@/types/destination';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Search result extending Destination with search-specific fields */
export interface SearchResultDestination extends Destination {
  similarity?: number;
  trending_score?: number;
  recent_views_count?: number;
  recent_saves_count?: number;
  current_weather_json?: Record<string, unknown>;
  nearby_events_json?: Record<string, unknown>;
  route_from_city_center_json?: Record<string, unknown>;
  realtime_status?: string;
  updated_at?: string;
  style_tags?: string[] | null;
  ambience_tags?: string[] | null;
  vibe_tags?: string[] | null;
}

/** Search intent parameters */
export interface SearchIntent {
  city?: string;
  category?: string;
  modifiers?: string[];
  timeframe?: string;
}

/** Category preference from taste profile */
interface CategoryPreference {
  category?: string;
}

/** City preference from taste profile */
interface CityPreference {
  city?: string;
}

/** Visited destination from user context */
interface VisitedDestination {
  id: number;
  category?: string;
  city?: string;
}

export interface RankingFactors {
  similarity: number; // Vector similarity (0-1)
  quality: number; // Editorial quality (rating, Michelin stars, etc.)
  popularity: number; // Engagement metrics (views, saves, visits)
  personalization: number; // User-specific relevance (0-1)
  trending: number; // Trending score (0-1)
  intentMatch: number; // Query intent match (0-1)
  enrichment: number; // Real-time data boost (weather, events)
  recency: number; // Recency boost for new/updated content
}

export interface RankingWeights {
  similarity: number;
  quality: number;
  popularity: number;
  personalization: number;
  trending: number;
  intentMatch: number;
  enrichment: number;
  recency: number;
}

export interface RankedResult {
  destination: SearchResultDestination;
  score: number;
  factors: RankingFactors;
  explanation: string;
}

export class SearchRankingAlgorithm {
  private supabase: SupabaseClient | null;
  private defaultWeights: RankingWeights = {
    similarity: 0.30,
    quality: 0.20,
    popularity: 0.15,
    personalization: 0.15,
    trending: 0.10,
    intentMatch: 0.05,
    enrichment: 0.03,
    recency: 0.02,
  };

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  /**
   * Rank search results with comprehensive scoring
   */
  async rankResults(
    results: SearchResultDestination[],
    query: string,
    userId?: string,
    intent?: SearchIntent,
    customWeights?: Partial<RankingWeights>
  ): Promise<RankedResult[]> {
    if (!results || results.length === 0) {
      return [];
    }

    const weights = { ...this.defaultWeights, ...customWeights };

    // Get user context for personalization
    let userContext: RichQueryContext | null = null;
    let tasteProfile: TasteProfile | null = null;
    if (userId) {
      try {
        userContext = await richQueryContextService.buildContext(userId);
        tasteProfile = await tasteProfileEvolutionService.getTasteProfile(userId);
      } catch (error) {
        console.error('Error fetching user context:', error);
      }
    }

    // Calculate scores for each result
    const ranked = await Promise.all(
      results.map(async (dest) => {
        const factors = await this.calculateFactors(
          dest,
          query,
          intent,
          userContext,
          tasteProfile
        );

        const score = this.combineScores(factors, weights);
        const explanation = this.generateExplanation(factors, weights, dest);

        return {
          destination: dest,
          score,
          factors,
          explanation,
        };
      })
    );

    // Sort by score (descending)
    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate all ranking factors for a destination
   */
  private async calculateFactors(
    dest: SearchResultDestination,
    query: string,
    intent?: SearchIntent,
    userContext?: RichQueryContext | null,
    tasteProfile?: TasteProfile | null
  ): Promise<RankingFactors> {
    const factors: RankingFactors = {
      similarity: this.calculateSimilarity(dest, query),
      quality: this.calculateQuality(dest),
      popularity: this.calculatePopularity(dest),
      personalization: this.calculatePersonalization(dest, userContext, tasteProfile),
      trending: this.calculateTrending(dest),
      intentMatch: this.calculateIntentMatch(dest, intent),
      enrichment: this.calculateEnrichment(dest),
      recency: this.calculateRecency(dest),
    };

    return factors;
  }

  private calculateSimilarity(dest: SearchResultDestination, query: string): number {
    // Use vector similarity if available
    if (dest.similarity !== undefined) {
      return Math.max(0, Math.min(1, dest.similarity));
    }

    // Fallback to text matching
    const lowerQuery = query.toLowerCase();
    const lowerName = (dest.name || '').toLowerCase();
    const lowerDesc = (dest.description || '').toLowerCase();

    let score = 0;
    if (lowerName.includes(lowerQuery)) score += 0.5;
    if (lowerDesc.includes(lowerQuery)) score += 0.3;

    // Exact match boost
    if (lowerName === lowerQuery) score = 1.0;

    return Math.min(1, score);
  }

  private calculateQuality(dest: SearchResultDestination): number {
    let score = 0;

    // Rating (0-5 scale, normalized to 0-1)
    if (dest.rating) {
      score += (dest.rating / 5) * 0.4;
    }

    // Michelin stars (0-3 scale, normalized to 0-1)
    if (dest.michelin_stars) {
      score += (dest.michelin_stars / 3) * 0.3;
    }

    // Crown (editorial quality indicator)
    if (dest.crown) {
      score += 0.2;
    }

    // Price level (higher price often indicates quality)
    if (dest.price_level) {
      score += (dest.price_level / 4) * 0.1;
    }

    return Math.min(1, score);
  }

  private calculatePopularity(dest: SearchResultDestination): number {
    let score = 0;

    // Views (normalized, assuming max ~10000 views)
    const views = dest.views_count || 0;
    score += Math.min(1, views / 10000) * 0.4;

    // Saves (normalized, assuming max ~1000 saves)
    const saves = dest.saves_count || 0;
    score += Math.min(1, saves / 1000) * 0.4;

    // Visits (normalized, assuming max ~500 visits)
    const visits = dest.visits_count || 0;
    score += Math.min(1, visits / 500) * 0.2;

    return Math.min(1, score);
  }

  private calculatePersonalization(
    dest: SearchResultDestination,
    userContext?: RichQueryContext | null,
    tasteProfile?: TasteProfile | null
  ): number {
    if (!userContext && !tasteProfile) {
      return 0;
    }

    let score = 0;

    // Match favorite categories
    if (tasteProfile?.preferences?.categories) {
      const favoriteCategories = tasteProfile.preferences.categories.map(
        (c: CategoryPreference) => c.category?.toLowerCase()
      );
      const destCategory = dest.category?.toLowerCase();
      if (favoriteCategories.includes(destCategory)) {
        score += 0.3;
      }
    }

    // Match favorite cities
    if (tasteProfile?.preferences?.cities) {
      const favoriteCities = tasteProfile.preferences.cities.map(
        (c: CityPreference) => c.city?.toLowerCase()
      );
      const destCity = dest.city?.toLowerCase();
      if (favoriteCities.includes(destCity)) {
        score += 0.2;
      }
    }

    // Match price preference
    if (tasteProfile?.preferences?.priceRange && dest.price_level) {
      const { min, max } = tasteProfile.preferences.priceRange;
      if (dest.price_level >= min && dest.price_level <= max) {
        score += 0.2;
      }
    }

    // Boost if user has visited similar places
    if (userContext?.user?.history?.visitedDestinations) {
      const _visitedIds = userContext.user.history.visitedDestinations.map(
        (v: VisitedDestination) => v.id
      );
      // Check if similar destinations were visited (same category/city)
      const similarVisited = userContext.user.history.visitedDestinations.filter(
        (v: VisitedDestination) =>
          v.category === dest.category || v.city === dest.city
      );
      if (similarVisited.length > 0) {
        score += Math.min(0.3, similarVisited.length * 0.1);
      }
    }

    return Math.min(1, score);
  }

  private calculateTrending(dest: SearchResultDestination): number {
    // Use trending_score if available
    if (dest.trending_score !== undefined && dest.trending_score !== null) {
      return Math.max(0, Math.min(1, dest.trending_score));
    }

    // Fallback: calculate from recent activity
    const recentViews = dest.recent_views_count || 0;
    const recentSaves = dest.recent_saves_count || 0;

    // Normalize (assuming max 1000 recent views)
    const score = Math.min(1, (recentViews + recentSaves * 2) / 1000);
    return score;
  }

  private calculateIntentMatch(dest: SearchResultDestination, intent?: SearchIntent): number {
    if (!intent) return 0.5; // Neutral if no intent

    let score = 0;
    let matches = 0;
    let total = 0;

    // City match
    if (intent.city) {
      total++;
      if (dest.city?.toLowerCase().includes(intent.city.toLowerCase())) {
        score += 0.4;
        matches++;
      }
    }

    // Category match
    if (intent.category) {
      total++;
      if (dest.category?.toLowerCase().includes(intent.category.toLowerCase())) {
        score += 0.4;
        matches++;
      }
    }

    // Modifiers match (tags, style, etc.)
    if (intent.modifiers && intent.modifiers.length > 0) {
      total++;
      const destTags = [
        ...(dest.tags || []),
        ...(dest.style_tags || []),
        ...(dest.ambience_tags || []),
      ].map((t: string) => String(t).toLowerCase());

      const modifierMatches = intent.modifiers.filter((m: string) =>
        destTags.some((t: string) => t.includes(m.toLowerCase()))
      );

      if (modifierMatches.length > 0) {
        score += (modifierMatches.length / intent.modifiers.length) * 0.2;
        matches++;
      }
    }

    // Normalize by total intent factors
    return total > 0 ? score / total : 0.5;
  }

  private calculateEnrichment(dest: SearchResultDestination): number {
    let score = 0;

    // Weather data available
    if (dest.current_weather_json) {
      score += 0.2;
    }

    // Events data available
    if (dest.nearby_events_json) {
      score += 0.2;
    }

    // Route data available
    if (dest.route_from_city_center_json) {
      score += 0.2;
    }

    // Real-time status available
    if (dest.realtime_status) {
      score += 0.4;
    }

    return Math.min(1, score);
  }

  private calculateRecency(dest: SearchResultDestination): number {
    // Boost recently updated or new destinations
    if (dest.updated_at) {
      const daysSinceUpdate =
        (Date.now() - new Date(dest.updated_at).getTime()) / (1000 * 60 * 60 * 24);

      // Decay: 1.0 for today, 0.5 for 30 days, 0.0 for 90+ days
      if (daysSinceUpdate < 1) return 1.0;
      if (daysSinceUpdate < 30) return 1.0 - (daysSinceUpdate / 30) * 0.5;
      if (daysSinceUpdate < 90) return 0.5 - ((daysSinceUpdate - 30) / 60) * 0.5;
      return 0;
    }

    return 0;
  }

  /**
   * Combine factors with weights
   */
  private combineScores(factors: RankingFactors, weights: RankingWeights): number {
    return (
      factors.similarity * weights.similarity +
      factors.quality * weights.quality +
      factors.popularity * weights.popularity +
      factors.personalization * weights.personalization +
      factors.trending * weights.trending +
      factors.intentMatch * weights.intentMatch +
      factors.enrichment * weights.enrichment +
      factors.recency * weights.recency
    );
  }

  /**
   * Generate human-readable explanation for ranking
   */
  private generateExplanation(
    factors: RankingFactors,
    _weights: RankingWeights,
    dest: SearchResultDestination
  ): string {
    const explanations: string[] = [];

    if (factors.personalization > 0.5) {
      explanations.push('Matches your preferences');
    }

    if (factors.quality > 0.7) {
      explanations.push('Highly rated');
    }

    if (factors.trending > 0.6) {
      explanations.push('Trending now');
    }

    if (factors.intentMatch > 0.7) {
      explanations.push('Perfect match for your search');
    }

    if (dest.michelin_stars && dest.michelin_stars > 0) {
      explanations.push(`${dest.michelin_stars} Michelin star${dest.michelin_stars > 1 ? 's' : ''}`);
    }

    return explanations.length > 0
      ? explanations.join(' • ')
      : 'Recommended for you';
  }
}

export const searchRankingAlgorithm = new SearchRankingAlgorithm();

