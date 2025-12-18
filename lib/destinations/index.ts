/**
 * Destination Service Layer
 *
 * Unified data access layer for destinations that:
 * 1. Queries Sanity CMS as the primary data source
 * 2. Falls back to Supabase if Sanity is unavailable
 * 3. Keeps the Supabase sync running in the background for backup
 *
 * Usage:
 * ```ts
 * import { getDestinations, getDestinationBySlug } from '@/lib/destinations';
 *
 * // Fetch all destinations (from Sanity with Supabase fallback)
 * const destinations = await getDestinations({ limit: 100 });
 *
 * // Fetch single destination
 * const destination = await getDestinationBySlug('le-bernardin');
 * ```
 */

import type { Destination } from '@/types/destination';
import type { FetchDestinationsOptions } from './types';

// Sanity (primary source)
import {
  isSanityConfigured,
  fetchDestinationsFromSanity,
  fetchDestinationBySlugFromSanity,
  fetchRelatedDestinationsFromSanity,
  fetchFilterOptionsFromSanity,
  fetchCityDestinationsFromSanity,
  fetchFeaturedDestinationsFromSanity,
  fetchNestedDestinationsFromSanity,
} from './sanity-source';

// Supabase (fallback)
import {
  isSupabaseConfigured,
  fetchDestinationsFromSupabase,
  fetchDestinationBySlugFromSupabase,
  fetchRelatedDestinationsFromSupabase,
  fetchFilterOptionsFromSupabase,
  fetchNestedDestinationsFromSupabase,
  fetchParentDestinationFromSupabase,
} from './supabase-fallback';

// Re-export types
export * from './types';

/**
 * Get destinations with Sanity as primary source, Supabase as fallback
 */
export async function getDestinations(
  options: FetchDestinationsOptions = {}
): Promise<Destination[]> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const destinations = await fetchDestinationsFromSanity(options);
      if (destinations.length > 0) {
        console.log(`[Destinations] Fetched ${destinations.length} from Sanity`);
        return destinations;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity fetch failed, falling back to Supabase:', error);
    }
  }

  // Fallback to Supabase
  if (isSupabaseConfigured()) {
    console.log('[Destinations] Falling back to Supabase');
    return fetchDestinationsFromSupabase(options);
  }

  console.warn('[Destinations] No data source configured');
  return [];
}

/**
 * Get a single destination by slug
 */
export async function getDestinationBySlug(
  slug: string
): Promise<Destination | null> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const destination = await fetchDestinationBySlugFromSanity(slug);
      if (destination) {
        console.log(`[Destinations] Fetched "${slug}" from Sanity`);
        return destination;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity fetch failed, falling back to Supabase:', error);
    }
  }

  // Fallback to Supabase
  if (isSupabaseConfigured()) {
    console.log(`[Destinations] Falling back to Supabase for "${slug}"`);
    return fetchDestinationBySlugFromSupabase(slug);
  }

  return null;
}

/**
 * Get related destinations (same city, different destination)
 */
export async function getRelatedDestinations(
  city: string,
  currentSlug: string,
  limit: number = 6
): Promise<Destination[]> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const destinations = await fetchRelatedDestinationsFromSanity(city, currentSlug, limit);
      if (destinations.length > 0) {
        return destinations;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity related fetch failed:', error);
    }
  }

  // Fallback to Supabase
  if (isSupabaseConfigured()) {
    return fetchRelatedDestinationsFromSupabase(city, currentSlug, limit);
  }

  return [];
}

/**
 * Get filter options (cities and categories)
 */
export async function getFilterOptions(): Promise<{
  cities: string[];
  categories: string[];
}> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const options = await fetchFilterOptionsFromSanity();
      if (options.cities.length > 0 || options.categories.length > 0) {
        return options;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity filter options fetch failed:', error);
    }
  }

  // Fallback to Supabase
  if (isSupabaseConfigured()) {
    return fetchFilterOptionsFromSupabase();
  }

  return { cities: [], categories: [] };
}

/**
 * Get destinations for a specific city
 */
export async function getCityDestinations(city: string): Promise<Destination[]> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const destinations = await fetchCityDestinationsFromSanity(city);
      if (destinations.length > 0) {
        return destinations;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity city fetch failed:', error);
    }
  }

  // Fallback to Supabase
  if (isSupabaseConfigured()) {
    return fetchDestinationsFromSupabase({ city, limit: 500 });
  }

  return [];
}

/**
 * Get featured/crown destinations
 */
export async function getFeaturedDestinations(limit: number = 12): Promise<Destination[]> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const destinations = await fetchFeaturedDestinationsFromSanity(limit);
      if (destinations.length > 0) {
        return destinations;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity featured fetch failed:', error);
    }
  }

  // Fallback to Supabase
  if (isSupabaseConfigured()) {
    return fetchDestinationsFromSupabase({ featured: true, limit });
  }

  return [];
}

/**
 * Get nested destinations for a parent
 */
export async function getNestedDestinations(
  parentSlug: string,
  parentId?: number
): Promise<Destination[]> {
  // Try Sanity first
  if (isSanityConfigured()) {
    try {
      const destinations = await fetchNestedDestinationsFromSanity(parentSlug);
      if (destinations.length > 0) {
        return destinations;
      }
    } catch (error) {
      console.warn('[Destinations] Sanity nested fetch failed:', error);
    }
  }

  // Fallback to Supabase (requires parent ID)
  if (isSupabaseConfigured() && parentId) {
    return fetchNestedDestinationsFromSupabase(parentId);
  }

  return [];
}

/**
 * Get parent destination
 */
export async function getParentDestination(
  parentId: number
): Promise<Destination | null> {
  // For parent lookup, we primarily use Supabase since it has the ID
  // Sanity uses document references which work differently
  if (isSupabaseConfigured()) {
    return fetchParentDestinationFromSupabase(parentId);
  }

  return null;
}

/**
 * Prefetch all homepage data
 * Used in server components for initial render
 */
export async function prefetchHomepageData(): Promise<{
  destinations: Destination[];
  cities: string[];
  categories: string[];
  trending: Destination[];
}> {
  const [destinationsResult, filterOptions, trending] = await Promise.all([
    getDestinations({ limit: 200 }),
    getFilterOptions(),
    getFeaturedDestinations(12),
  ]);

  return {
    destinations: destinationsResult,
    cities: filterOptions.cities,
    categories: filterOptions.categories,
    trending,
  };
}
