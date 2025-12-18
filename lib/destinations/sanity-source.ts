/**
 * Sanity Data Source for Destinations
 *
 * This module provides functions to fetch destination data directly from Sanity CMS.
 * It's the primary data source, with Supabase serving as a fallback.
 */

import { sanityFetch } from '@/lib/sanity/client';
import {
  allDestinationsQuery,
  destinationsByCityQuery,
  destinationsByCategoryQuery,
  featuredDestinationsQuery,
  getDestinationBySlugQuery,
  relatedDestinationsQuery,
  allCitiesQuery,
  allCategoriesQuery,
  destinationCardFields,
  destinationDetailFields,
} from '@/lib/sanity/queries';
import { groq } from 'next-sanity';
import type { Destination } from '@/types/destination';
import type {
  SanityDestinationCard,
  SanityDestinationDetail,
  FetchDestinationsOptions,
} from './types';
import {
  transformSanityCardToDestination,
  transformSanityDetailToDestination,
} from './types';

/**
 * Check if Sanity is properly configured
 */
export function isSanityConfigured(): boolean {
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
    process.env.SANITY_STUDIO_PROJECT_ID;

  return !!(projectId && projectId.length > 0);
}

/**
 * Fetch all destinations from Sanity
 */
export async function fetchDestinationsFromSanity(
  options: FetchDestinationsOptions = {}
): Promise<Destination[]> {
  const { limit = 200, city, category, featured, orderBy = 'rating' } = options;

  if (!isSanityConfigured()) {
    console.log('[Sanity] Not configured, skipping fetch');
    return [];
  }

  try {
    let query: string;
    let params: Record<string, any> = {};

    if (city) {
      query = destinationsByCityQuery;
      params = { city };
    } else if (category) {
      query = destinationsByCategoryQuery;
      params = { category };
    } else if (featured) {
      query = featuredDestinationsQuery;
    } else {
      // Build custom query with ordering
      const orderClause =
        orderBy === 'name'
          ? 'order(name asc)'
          : orderBy === 'created'
            ? 'order(_createdAt desc)'
            : 'order(rating desc)';

      query = groq`
        *[_type == "destination" && !(_id in path("drafts.**"))] | ${orderClause} [0...${limit}] {
          ${destinationCardFields}
        }
      `;
    }

    const data = await sanityFetch<SanityDestinationCard[]>({
      query,
      params,
      tags: ['destinations'],
    });

    if (!data || !Array.isArray(data)) {
      console.warn('[Sanity] No destinations returned');
      return [];
    }

    // Transform Sanity documents to Destination type
    const destinations = data.map(transformSanityCardToDestination);

    // Apply limit if not already applied in query
    return destinations.slice(0, limit);
  } catch (error) {
    console.error('[Sanity] Error fetching destinations:', error);
    throw error; // Re-throw to allow fallback handling
  }
}

/**
 * Fetch a single destination by slug from Sanity
 */
export async function fetchDestinationBySlugFromSanity(
  slug: string
): Promise<Destination | null> {
  if (!isSanityConfigured()) {
    console.log('[Sanity] Not configured, skipping fetch');
    return null;
  }

  try {
    const data = await sanityFetch<SanityDestinationDetail | null>({
      query: getDestinationBySlugQuery,
      params: { slug },
      tags: ['destinations', `destination-${slug}`],
    });

    if (!data) {
      // Try case-insensitive match
      const caseInsensitiveQuery = groq`
        *[_type == "destination" && lower(slug.current) == lower($slug)][0] {
          ${destinationDetailFields}
        }
      `;

      const caseInsensitiveData = await sanityFetch<SanityDestinationDetail | null>({
        query: caseInsensitiveQuery,
        params: { slug },
        tags: ['destinations'],
      });

      if (!caseInsensitiveData) {
        return null;
      }

      return transformSanityDetailToDestination(caseInsensitiveData);
    }

    return transformSanityDetailToDestination(data);
  } catch (error) {
    console.error('[Sanity] Error fetching destination by slug:', error);
    throw error;
  }
}

/**
 * Fetch related destinations from Sanity
 */
export async function fetchRelatedDestinationsFromSanity(
  city: string,
  currentSlug: string,
  limit: number = 6
): Promise<Destination[]> {
  if (!isSanityConfigured()) {
    return [];
  }

  try {
    const data = await sanityFetch<SanityDestinationCard[]>({
      query: relatedDestinationsQuery,
      params: { city, currentSlug },
      tags: ['destinations'],
    });

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.slice(0, limit).map(transformSanityCardToDestination);
  } catch (error) {
    console.error('[Sanity] Error fetching related destinations:', error);
    throw error;
  }
}

/**
 * Fetch filter options (cities and categories) from Sanity
 */
export async function fetchFilterOptionsFromSanity(): Promise<{
  cities: string[];
  categories: string[];
}> {
  if (!isSanityConfigured()) {
    return { cities: [], categories: [] };
  }

  try {
    const [cities, categories] = await Promise.all([
      sanityFetch<string[]>({
        query: allCitiesQuery,
        tags: ['destinations', 'filters'],
      }),
      sanityFetch<string[]>({
        query: allCategoriesQuery,
        tags: ['destinations', 'filters'],
      }),
    ]);

    return {
      cities: (cities || []).filter(Boolean).sort(),
      categories: (categories || []).filter(Boolean).sort(),
    };
  } catch (error) {
    console.error('[Sanity] Error fetching filter options:', error);
    throw error;
  }
}

/**
 * Fetch destinations by city from Sanity
 */
export async function fetchCityDestinationsFromSanity(
  city: string
): Promise<Destination[]> {
  return fetchDestinationsFromSanity({ city, limit: 500 });
}

/**
 * Fetch featured/crown destinations from Sanity
 */
export async function fetchFeaturedDestinationsFromSanity(
  limit: number = 12
): Promise<Destination[]> {
  return fetchDestinationsFromSanity({ featured: true, limit });
}

/**
 * Fetch nested destinations for a parent destination
 */
export async function fetchNestedDestinationsFromSanity(
  parentSlug: string
): Promise<Destination[]> {
  if (!isSanityConfigured()) {
    return [];
  }

  try {
    const query = groq`
      *[_type == "destination" && !(_id in path("drafts.**")) && parentDestination->slug.current == $parentSlug] {
        ${destinationCardFields}
      }
    `;

    const data = await sanityFetch<SanityDestinationCard[]>({
      query,
      params: { parentSlug },
      tags: ['destinations'],
    });

    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map(transformSanityCardToDestination);
  } catch (error) {
    console.error('[Sanity] Error fetching nested destinations:', error);
    return [];
  }
}

/**
 * City stats type
 */
export interface CityStats {
  city: string;
  country: string;
  count: number;
  featuredImage?: string;
}

/**
 * Fetch city statistics from Sanity
 */
export async function fetchCityStatsFromSanity(): Promise<CityStats[]> {
  if (!isSanityConfigured()) {
    return [];
  }

  try {
    const query = groq`
      *[_type == "destination" && !(_id in path("drafts.**"))] {
        city,
        country,
        "image": coalesce(heroImage.asset->url, imageUrl)
      }
    `;

    const data = await sanityFetch<Array<{ city: string; country?: string; image?: string }>>({
      query,
      tags: ['destinations', 'cities'],
    });

    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Aggregate by city
    const cityData = data.reduce(
      (acc, dest) => {
        const citySlug = (dest.city ?? '').toString().trim();
        if (!citySlug) return acc;

        if (!acc[citySlug]) {
          acc[citySlug] = {
            count: 0,
            featuredImage: dest.image || undefined,
            country: dest.country || 'Unknown',
          };
        }

        acc[citySlug].count += 1;

        if (!acc[citySlug].featuredImage && dest.image) {
          acc[citySlug].featuredImage = dest.image;
        }

        if (acc[citySlug].country === 'Unknown' && dest.country) {
          acc[citySlug].country = dest.country;
        }

        return acc;
      },
      {} as Record<string, { count: number; featuredImage?: string; country: string }>
    );

    return Object.entries(cityData)
      .map(([city, data]) => ({
        city,
        country: data.country,
        count: data.count,
        featuredImage: data.featuredImage,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[Sanity] Error fetching city stats:', error);
    throw error;
  }
}
