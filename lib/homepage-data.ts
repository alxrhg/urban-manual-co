/**
 * Server-side data fetching for the homepage
 * These functions are designed to be called from Server Components
 */

import { getHomepageDestinations, getFilterRows, type FilterRow } from '@/server/services/homepage-loaders';
import type { Destination } from '@/types/destination';
import { cache } from 'react';

export type { FilterRow };

/**
 * Extract unique cities and categories from filter rows
 */
function extractFilterOptions(rows: FilterRow[]): {
  cities: string[];
  categories: string[];
} {
  const citySet = new Set<string>();
  const categoryLowerSet = new Set<string>();
  const categoryArray: string[] = [];

  rows.forEach(row => {
    const city = (row.city ?? "").toString().trim();
    const category = (row.category ?? "").toString().trim();

    if (city) {
      citySet.add(city);
    }
    if (category) {
      const categoryLower = category.toLowerCase();
      if (!categoryLowerSet.has(categoryLower)) {
        categoryLowerSet.add(categoryLower);
        categoryArray.push(category);
      }
    }
  });

  return {
    cities: Array.from(citySet).sort(),
    categories: categoryArray.sort(),
  };
}

export interface HomepageData {
  destinations: Destination[];
  cities: string[];
  categories: string[];
}

/**
 * Fetch all homepage data server-side
 * This is the main data fetching function for the homepage
 * Cached using React's cache() to deduplicate requests
 */
export const getHomepageData = cache(async (): Promise<HomepageData> => {
  try {
    // Fetch destinations and filter rows in parallel
    const [destinations, filterRows] = await Promise.all([
      getHomepageDestinations(),
      getFilterRows(),
    ]);

    // Extract cities and categories from filter rows
    const { cities, categories } = extractFilterOptions(filterRows);

    return {
      destinations,
      cities,
      categories,
    };
  } catch (error) {
    console.error('[Homepage Data] Error fetching data:', error);
    // Return empty data on error - the client can handle this gracefully
    return {
      destinations: [],
      cities: [],
      categories: [],
    };
  }
});

/**
 * Get initial destinations (cached)
 */
export const getInitialDestinations = cache(async (): Promise<Destination[]> => {
  try {
    return await getHomepageDestinations();
  } catch (error) {
    console.error('[Homepage Data] Error fetching destinations:', error);
    return [];
  }
});

/**
 * Get filter options (cached)
 */
export const getFilterOptions = cache(async (): Promise<{ cities: string[]; categories: string[] }> => {
  try {
    const filterRows = await getFilterRows();
    return extractFilterOptions(filterRows);
  } catch (error) {
    console.error('[Homepage Data] Error fetching filter options:', error);
    return { cities: [], categories: [] };
  }
});
