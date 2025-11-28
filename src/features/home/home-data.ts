import type { Destination } from '@/types/destination';
import { getHomepageDestinations, getFilterRows, type FilterRow } from '@/server/services/homepage-loaders';

/**
 * Server-side data loader for homepage
 *
 * Note: We intentionally do NOT use React's cache() here because it memoizes
 * for the lifetime of the server process, not per-request. This would cause
 * stale data where newly created/edited POIs never appear on the homepage
 * until server restart, even with dynamic = 'force-dynamic'.
 */

export type HomepageData = {
  destinations: Destination[];
  cities: string[];
  categories: string[];
};

/**
 * Extract unique cities and categories from filter rows
 */
function extractFilters(rows: FilterRow[]): { cities: string[]; categories: string[] } {
  const citySet = new Set<string>();
  const categorySet = new Set<string>();
  const categoryLowerSet = new Set<string>();

  for (const row of rows) {
    const city = row.city?.trim() ?? '';
    const category = row.category?.trim() ?? '';

    if (city) {
      citySet.add(city);
    }
    if (category) {
      const categoryLower = category.toLowerCase();
      if (!categoryLowerSet.has(categoryLower)) {
        categoryLowerSet.add(categoryLower);
        categorySet.add(category);
      }
    }
  }

  return {
    cities: Array.from(citySet).sort(),
    categories: Array.from(categorySet).sort(),
  };
}

/**
 * Load homepage destinations fresh on each request
 *
 * Note: Errors are NOT caught here. Expected errors (connection issues) are handled
 * by getHomepageDestinations(). Unexpected errors are intentionally thrown to trigger
 * the error boundary (error.tsx) so users see an error page instead of a blank homepage.
 */
export async function getDestinations(): Promise<Destination[]> {
  return getHomepageDestinations(5000);
}

/**
 * Load filter options fresh on each request
 *
 * Note: Errors are NOT caught here. Expected errors (connection issues) are handled
 * by getFilterRows(). Unexpected errors are intentionally thrown to trigger
 * the error boundary (error.tsx) so users see an error page instead of a blank homepage.
 */
export async function getFilters(): Promise<{ cities: string[]; categories: string[] }> {
  const rows = await getFilterRows(1000);
  return extractFilters(rows);
}

/**
 * Load all homepage data in parallel
 * This is the main entry point for server-side data fetching
 */
export async function getHomepageData(): Promise<HomepageData> {
  const [destinations, filters] = await Promise.all([
    getDestinations(),
    getFilters(),
  ]);

  // If we have destinations but no filters, extract from destinations
  let { cities, categories } = filters;
  if (destinations.length > 0 && (cities.length === 0 || categories.length === 0)) {
    const extracted = extractFilters(
      destinations.map(d => ({ city: d.city, category: d.category }))
    );
    if (cities.length === 0) cities = extracted.cities;
    if (categories.length === 0) categories = extracted.categories;
  }

  return {
    destinations,
    cities,
    categories,
  };
}
