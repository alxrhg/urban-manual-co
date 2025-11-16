/**
 * Integration utilities for Discovery Engine
 * Provides helper functions for integrating Discovery Engine into existing components
 */

import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { getFeatureFlags, getABTestVariant } from '@/lib/discovery-engine/feature-flags';
import { withCache, getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { semanticBlendSearch } from '@/lib/search/semanticSearch';
import { advancedRecommendationEngine } from '@/services/intelligence/recommendations-advanced';
import { createServiceRoleClient } from '@/lib/supabase-server';

export interface SearchOptions {
  query: string;
  userId?: string;
  city?: string;
  category?: string;
  priceLevel?: number;
  minRating?: number;
  pageSize?: number;
  pageToken?: string;
  useCache?: boolean;
}

export interface SearchResult {
  results: any[];
  totalSize: number;
  nextPageToken?: string;
  query: string;
  source: 'discovery_engine' | 'supabase' | 'fallback';
}

/**
 * Unified search function that handles Discovery Engine with fallback
 */
export async function unifiedSearch(options: SearchOptions): Promise<SearchResult> {
  const {
    query,
    userId,
    city,
    category,
    priceLevel,
    minRating,
    pageSize = 20,
    pageToken,
    useCache = true,
  } = options;

  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();

  // Check A/B test assignment
  let useDiscoveryEngine = flags.useDiscoveryEngine;
  if (userId && flags.abTests.some((t) => t.name === 'search_quality' && t.enabled)) {
    const variant = getABTestVariant(userId, 'search_quality');
    useDiscoveryEngine = variant === 'discovery_engine';
  }

  const cache = getDiscoveryEngineCache();

  // Try Discovery Engine if enabled and available
  if (useDiscoveryEngine && discoveryEngine.isAvailable()) {
    try {
      const cacheKey = cache.generateSearchKey(
        query,
        { city, category, priceLevel, minRating, backend: 'discovery_engine' },
        userId
      );

      const searchFn = () =>
        discoveryEngine.search(query, {
          userId,
          pageSize,
          pageToken,
          filters: {
            city,
            category,
            priceLevel,
            minRating,
          },
          boostSpec: [
            {
              condition: 'michelin_stars > 0',
              boost: 1.5,
            },
            {
              condition: 'rating >= 4.5',
              boost: 1.2,
            },
          ],
        });

      const results = useCache
        ? await withCache(cacheKey, searchFn, 5 * 60 * 1000)
        : await searchFn();

      if (results.results?.length) {
        return {
          results: results.results,
          totalSize: results.totalSize,
          nextPageToken: results.nextPageToken,
          query,
          source: 'discovery_engine',
        };
      }

      console.debug('[Discovery Engine] No results returned, trying fallback');
    } catch (error: any) {
      console.warn('Discovery Engine search failed, falling back:', error);
      // Fall through to fallback
    }
  }

  // Fallback to Supabase search
  const fallbackKey = cache.generateSearchKey(
    query,
    { city, category, priceLevel, minRating, backend: 'supabase' },
    userId
  );

  const fallbackResult = useCache
    ? await withCache(
        fallbackKey,
        () =>
          runSupabaseSearchFallback({
            query,
            city,
            category,
            priceLevel,
            minRating,
            pageSize,
          }),
        60 * 1000
      )
    : await runSupabaseSearchFallback({
        query,
        city,
        category,
        priceLevel,
        minRating,
        pageSize,
      });

  if (fallbackResult.results.length > 0) {
    return fallbackResult;
  }

  return {
    results: [],
    totalSize: 0,
    query,
    source: 'fallback',
  };
}

/**
 * Get recommendations with fallback
 */
export async function unifiedRecommendations(
  userId: string,
  options: {
    city?: string;
    category?: string;
    pageSize?: number;
    useCache?: boolean;
  } = {}
): Promise<any[]> {
  const { city, category, pageSize = 10, useCache = true } = options;

  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();

  if (!flags.enablePersonalization || !discoveryEngine.isAvailable()) {
    return runRecommendationsFallback(userId, { city, category, pageSize });
  }

  try {
    const cache = getDiscoveryEngineCache();
    const cacheKey = cache.generateRecommendationKey(userId, { city, category, backend: 'discovery_engine' });

    const recommendFn = () =>
      discoveryEngine.recommend(userId, {
        pageSize,
        filters: {
          city,
          category,
        },
      });

    const recommendations = useCache
      ? await withCache(cacheKey, recommendFn, 10 * 60 * 1000) // 10 minute cache for recommendations
      : await recommendFn();

    if (Array.isArray(recommendations) && recommendations.length > 0) {
      return recommendations;
    }

    console.debug('[Discovery Engine] No recommendations returned, trying fallback');
  } catch (error: any) {
    console.warn('Discovery Engine recommendations failed:', error);
  }

  return runRecommendationsFallback(userId, { city, category, pageSize });
}

/**
 * Track user event with automatic fallback handling
 */
export async function trackUserEvent(event: {
  userId: string;
  eventType: 'search' | 'view' | 'click' | 'save' | 'visit';
  documentId?: string;
  searchQuery?: string;
}): Promise<void> {
  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();

  if (!flags.enablePersonalization || !discoveryEngine.isAvailable()) {
    return; // Silently fail if not configured
  }

  try {
    await discoveryEngine.trackEvent(event);
  } catch (error: any) {
    console.warn('Failed to track user event:', error);
    // Don't throw - event tracking shouldn't break the app
  }
}

/**
 * Check if Discovery Engine features are available
 */
export function isDiscoveryEngineAvailable(): boolean {
  const discoveryEngine = getDiscoveryEngineService();
  const flags = getFeatureFlags();
  return flags.useDiscoveryEngine && discoveryEngine.isAvailable();
}

/**
 * Get feature availability status
 */
export function getFeatureAvailability(): {
  search: boolean;
  recommendations: boolean;
  personalization: boolean;
  conversational: boolean;
  multimodal: boolean;
  naturalLanguage: boolean;
} {
  const flags = getFeatureFlags();
  const discoveryEngine = getDiscoveryEngineService();
  const isAvailable = discoveryEngine.isAvailable();

  return {
    search: flags.useDiscoveryEngine && isAvailable,
    recommendations: flags.enablePersonalization && isAvailable,
    personalization: flags.enablePersonalization && isAvailable,
    conversational: flags.useConversationalSearch && isAvailable,
    multimodal: flags.useMultimodalSearch && isAvailable,
    naturalLanguage: flags.useNaturalLanguageFilters && isAvailable,
  };
}

type SearchFallbackOptions = Pick<
  SearchOptions,
  'query' | 'city' | 'category' | 'priceLevel' | 'minRating' | 'pageSize'
>;

async function runSupabaseSearchFallback(options: SearchFallbackOptions): Promise<SearchResult> {
  const { query, city, category, priceLevel, minRating, pageSize = 20 } = options;

  try {
    const filters: { city?: string; category?: string } = {};
    if (city) filters.city = city;
    if (category) filters.category = category;

    const candidates = await semanticBlendSearch(query, filters);

    const filtered = (candidates || []).filter((result: any) => {
      const priceValue = result.price_level ?? result.priceLevel ?? null;
      const ratingValue = result.rating ?? result.average_rating ?? result.score ?? null;

      const pricePass =
        typeof priceLevel === 'number'
          ? typeof priceValue === 'number'
            ? priceValue <= priceLevel
            : true
          : true;

      const ratingPass =
        typeof minRating === 'number'
          ? typeof ratingValue === 'number'
            ? ratingValue >= minRating
            : true
          : true;

      return pricePass && ratingPass;
    });

    const limited = filtered.slice(0, pageSize);

    return {
      results: limited,
      totalSize: filtered.length,
      query,
      source: limited.length > 0 ? 'supabase' : 'fallback',
    };
  } catch (error) {
    console.warn('[Discovery Engine] Supabase fallback search failed:', error);
    return {
      results: [],
      totalSize: 0,
      query,
      source: 'fallback',
    };
  }
}

async function runRecommendationsFallback(
  userId: string,
  options: { city?: string; category?: string; pageSize: number }
): Promise<any[]> {
  try {
    const recommendations = await advancedRecommendationEngine.getRecommendations(
      userId,
      options.pageSize,
      {
        city: options.city,
        category: options.category,
        excludeVisited: true,
      }
    );

    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    let supabase: ReturnType<typeof createServiceRoleClient> | null = null;
    try {
      supabase = createServiceRoleClient();
    } catch (clientError) {
      console.warn('[Discovery Engine] Unable to create Supabase client for recommendation fallback:', clientError);
    }

    if (!supabase) {
      return [];
    }

    const destinationIds = recommendations.map((rec) => rec.destination_id);
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .in('id', destinationIds);

    if (error) {
      console.warn('[Discovery Engine] Failed to fetch destinations for fallback recommendations:', error);
      return [];
    }

    const destinationMap = new Map<string, any>();
    (destinations || []).forEach((dest: any) => {
      destinationMap.set(String(dest.id), dest);
    });

    return recommendations
      .map((rec) => {
        const destination = destinationMap.get(String(rec.destination_id));
        if (!destination) {
          return null;
        }
        return {
          destination,
          score: rec.score,
          reason: rec.reason,
          factors: rec.factors,
        };
      })
      .filter((value): value is { destination: any; score: number; reason: string; factors: any } => Boolean(value));
  } catch (error) {
    console.warn('[Discovery Engine] Recommendation fallback failed:', error);
    return [];
  }
}

