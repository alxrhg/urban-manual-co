/**
 * Server-side data fetching utilities for destinations
 *
 * These functions fetch data on the server and can be used in Server Components
 * to provide initial data, reducing client-side loading time.
 *
 * Data Source Priority:
 * 1. Sanity CMS (primary source for editorial content)
 * 2. Supabase (fallback, kept in sync via Sanity Functions)
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { Destination } from '@/types/destination';
import { unstable_cache } from 'next/cache';
import {
  getDestinations,
  getFilterOptions as getFilterOptionsFromService,
  getCityDestinations as getCityDestinationsFromService,
  getFeaturedDestinations as getFeaturedDestinationsFromService,
  getCityStats as getCityStatsFromService,
} from '@/lib/destinations';

/**
 * Check if Supabase is properly configured for server-side use
 */
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  // Check that both are present and have valid lengths
  return !!(url && url.includes('supabase') && key && key.length >= 50);
}

/**
 * Fetch initial destinations for the homepage
 * Uses Sanity as primary source with Supabase fallback
 * Cached for 5 minutes to reduce API load
 */
export const fetchInitialDestinations = unstable_cache(
  async (limit: number = 100): Promise<Destination[]> => {
    try {
      // Use the new destination service (Sanity-first with Supabase fallback)
      const destinations = await getDestinations({ limit, orderBy: 'rating' });
      console.log(`[SSR] Fetched ${destinations.length} destinations`);
      return destinations;
    } catch (error) {
      console.error('[SSR] Exception fetching destinations:', error);
      return [];
    }
  },
  ['initial-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations'],
  }
);

/**
 * Fetch unique cities and categories for filters
 * Uses Sanity as primary source with Supabase fallback
 * Cached for 10 minutes since this data changes infrequently
 */
export const fetchFilterOptions = unstable_cache(
  async (): Promise<{ cities: string[]; categories: string[] }> => {
    try {
      // Use the new destination service (Sanity-first with Supabase fallback)
      return await getFilterOptionsFromService();
    } catch (error) {
      console.error('[SSR] Exception fetching filter options:', error);
      return { cities: [], categories: [] };
    }
  },
  ['filter-options'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations', 'filters'],
  }
);

/**
 * Fetch destinations for a specific city
 * Uses Sanity as primary source with Supabase fallback
 * Cached per city for 5 minutes
 */
export const fetchCityDestinations = unstable_cache(
  async (citySlug: string): Promise<Destination[]> => {
    try {
      // Use the new destination service (Sanity-first with Supabase fallback)
      const destinations = await getCityDestinationsFromService(citySlug);
      console.log(`[SSR] Fetched ${destinations.length} destinations for city ${citySlug}`);
      return destinations;
    } catch (error) {
      console.error(`[SSR] Exception fetching destinations for city ${citySlug}:`, error);
      return [];
    }
  },
  ['city-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations'],
  }
);

/**
 * Fetch city statistics for the cities listing page
 * Uses Sanity as primary source with Supabase fallback
 * Cached for 10 minutes
 */
export const fetchCityStats = unstable_cache(
  async (): Promise<Array<{
    city: string;
    country: string;
    count: number;
    featuredImage?: string;
  }>> => {
    try {
      // Use the new destination service (Sanity-first with Supabase fallback)
      const stats = await getCityStatsFromService();
      console.log(`[SSR] Fetched ${stats.length} city stats`);
      return stats;
    } catch (error) {
      console.error('[SSR] Exception fetching city stats:', error);
      return [];
    }
  },
  ['city-stats'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations', 'cities'],
  }
);

/**
 * Fetch trending/featured destinations
 * Uses Sanity as primary source with Supabase fallback
 * Cached for 5 minutes
 */
export const fetchTrendingDestinations = unstable_cache(
  async (limit: number = 12): Promise<Destination[]> => {
    try {
      // Use the new destination service (Sanity-first with Supabase fallback)
      const destinations = await getFeaturedDestinationsFromService(limit);
      console.log(`[SSR] Fetched ${destinations.length} trending destinations`);
      return destinations;
    } catch (error) {
      console.error('[SSR] Exception fetching trending destinations:', error);
      return [];
    }
  },
  ['trending-destinations'],
  {
    revalidate: 300, // 5 minutes
    tags: ['destinations', 'trending'],
  }
);

/**
 * Prefetch all homepage data in parallel
 * Returns all data needed for initial render
 */
export async function prefetchHomepageData() {
  const [
    destinations,
    filterOptions,
    trending,
  ] = await Promise.all([
    fetchInitialDestinations(200),
    fetchFilterOptions(),
    fetchTrendingDestinations(12),
  ]);

  return {
    destinations,
    cities: filterOptions.cities,
    categories: filterOptions.categories,
    trending,
  };
}

/**
 * Fetch brand statistics for the brands listing page
 * Cached for 10 minutes
 */
export const fetchBrandStats = unstable_cache(
  async (): Promise<Array<{
    brand: string;
    count: number;
    featuredImage?: string;
    categories: string[];
  }>> => {
    // Skip database queries during build if Supabase isn't configured
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const supabase = createServiceRoleClient();

      const { data, error } = await supabase
        .from('destinations')
        .select('brand, category, image')
        .not('brand', 'is', null);

      if (error) {
        console.error('[SSR] Error fetching brand stats:', error.message);
        return [];
      }

      const destinations = data || [];

      // Count brands and get featured image
      const brandData = destinations.reduce((acc, dest: { brand?: string | null; category?: string | null; image?: string | null }) => {
        const brand = (dest.brand ?? '').toString().trim();
        if (!brand) return acc;

        if (!acc[brand]) {
          acc[brand] = {
            count: 0,
            featuredImage: dest.image || undefined,
            categories: new Set<string>(),
          };
        }

        acc[brand].count += 1;

        // Update featured image if current one doesn't have image but this one does
        if (!acc[brand].featuredImage && dest.image) {
          acc[brand].featuredImage = dest.image;
        }

        // Track unique categories
        if (dest.category) {
          acc[brand].categories.add(dest.category);
        }

        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string; categories: Set<string> }>);

      const stats = Object.entries(brandData)
        .map(([brand, data]) => ({
          brand,
          count: data.count,
          featuredImage: data.featuredImage,
          categories: Array.from(data.categories) as string[],
        }))
        .sort((a, b) => b.count - a.count);

      return stats;
    } catch (error) {
      console.error('[SSR] Exception fetching brand stats:', error);
      return [];
    }
  },
  ['brand-stats'],
  {
    revalidate: 600, // 10 minutes
    tags: ['destinations', 'brands'],
  }
);
