/**
 * Server-Side Data Loaders for Homepage
 *
 * OPTIMIZED for speed:
 * - Cached with unstable_cache (60s TTL)
 * - Limited initial load (50 destinations)
 * - Minimal fields for faster serialization
 * - User data fetched client-side (non-blocking)
 */

import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import type { Destination } from "@/types/destination";

// Minimal destination type for initial render (reduces payload ~70%)
export type MinimalDestination = Pick<
  Destination,
  | "id"
  | "slug"
  | "name"
  | "city"
  | "country"
  | "category"
  | "image"
  | "image_thumbnail"
  | "michelin_stars"
  | "crown"
  | "rating"
  | "price_level"
  | "micro_description"
>;

export interface HomepageData {
  destinations: MinimalDestination[];
  cities: string[];
  categories: string[];
  totalCount: number;
}

/**
 * Cached function to fetch homepage destinations
 * Revalidates every 60 seconds
 */
const getCachedDestinations = unstable_cache(
  async (limit: number = 50): Promise<{ destinations: MinimalDestination[]; total: number }> => {
    try {
      const supabase = await createServerClient();

      // Get total count first (for pagination info)
      const { count } = await supabase
        .from("destinations")
        .select("*", { count: "exact", head: true })
        .is("parent_destination_id", null);

      // Fetch only essential fields for initial render
      const { data, error } = await supabase
        .from("destinations")
        .select(
          `id, slug, name, city, country, category,
           image, image_thumbnail, michelin_stars, crown,
           rating, price_level, micro_description`
        )
        .is("parent_destination_id", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[Homepage Loader] Destinations error:", error.message);
        return { destinations: [], total: 0 };
      }

      return {
        destinations: (data || []) as MinimalDestination[],
        total: count || 0,
      };
    } catch (error) {
      console.error("[Homepage Loader] Destinations fetch failed:", error);
      return { destinations: [], total: 0 };
    }
  },
  ["homepage-destinations"],
  { revalidate: 60, tags: ["destinations"] }
);

/**
 * Cached function to fetch filter options
 * Revalidates every 5 minutes (filters change less often)
 */
const getCachedFilters = unstable_cache(
  async (): Promise<{ cities: string[]; categories: string[] }> => {
    try {
      const supabase = await createServerClient();

      // Use distinct query for efficiency
      const { data, error } = await supabase
        .from("destinations")
        .select("city, category")
        .is("parent_destination_id", null);

      if (error) {
        console.error("[Homepage Loader] Filters error:", error.message);
        return { cities: [], categories: [] };
      }

      const citySet = new Set<string>();
      const categorySet = new Set<string>();

      for (const row of data || []) {
        if (row.city) citySet.add(row.city);
        if (row.category) categorySet.add(row.category);
      }

      return {
        cities: Array.from(citySet).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        ),
        categories: Array.from(categorySet).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        ),
      };
    } catch (error) {
      console.error("[Homepage Loader] Filters fetch failed:", error);
      return { cities: [], categories: [] };
    }
  },
  ["homepage-filters"],
  { revalidate: 300, tags: ["filters"] }
);

/**
 * Load homepage data (cached, fast)
 *
 * Only fetches:
 * - 50 destinations with minimal fields
 * - Filter options (cities/categories)
 *
 * User data is fetched client-side to not block SSR
 */
export async function loadHomepageData(): Promise<HomepageData> {
  // Fetch in parallel (both cached)
  const [destinationData, filters] = await Promise.all([
    getCachedDestinations(50),
    getCachedFilters(),
  ]);

  return {
    destinations: destinationData.destinations,
    cities: filters.cities,
    categories: filters.categories,
    totalCount: destinationData.total,
  };
}

/**
 * Load more destinations (for infinite scroll/pagination)
 * Called via API route, not during SSR
 */
export async function loadMoreDestinations(
  offset: number,
  limit: number = 50,
  city?: string,
  category?: string
): Promise<{ destinations: MinimalDestination[]; hasMore: boolean }> {
  try {
    const supabase = await createServerClient();

    let query = supabase
      .from("destinations")
      .select(
        `id, slug, name, city, country, category,
         image, image_thumbnail, michelin_stars, crown,
         rating, price_level, micro_description`
      )
      .is("parent_destination_id", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (city) {
      query = query.eq("city", city);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Homepage Loader] Load more error:", error.message);
      return { destinations: [], hasMore: false };
    }

    return {
      destinations: (data || []) as MinimalDestination[],
      hasMore: (data?.length || 0) === limit + 1,
    };
  } catch (error) {
    console.error("[Homepage Loader] Load more failed:", error);
    return { destinations: [], hasMore: false };
  }
}
