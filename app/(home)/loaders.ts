/**
 * Server-Side Data Loaders for Homepage
 *
 * These functions fetch initial homepage data on the server,
 * enabling server-side rendering for faster initial page loads.
 */

import { createServerClient } from "@/lib/supabase/server";
import {
  getHomepageDestinations,
  getFilterRows,
  getVisitedSlugsForUser,
  getUserProfileById,
  type FilterRow,
} from "@/server/services/homepage-loaders";
import type { Destination } from "@/types/destination";
import type { UserProfile } from "@/types/personalization";
import type { User } from "@supabase/supabase-js";

export interface HomepageData {
  destinations: Destination[];
  cities: string[];
  categories: string[];
  user: User | null;
  userProfile: UserProfile | null;
  visitedSlugs: string[];
  isAdmin: boolean;
}

/**
 * Extract unique cities from filter rows
 */
function extractUniqueCities(filterRows: FilterRow[]): string[] {
  const citySet = new Set<string>();
  for (const row of filterRows) {
    if (row.city && typeof row.city === "string") {
      citySet.add(row.city);
    }
  }
  return Array.from(citySet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

/**
 * Extract unique categories from filter rows
 */
function extractUniqueCategories(filterRows: FilterRow[]): string[] {
  const categorySet = new Set<string>();
  for (const row of filterRows) {
    if (row.category && typeof row.category === "string") {
      categorySet.add(row.category);
    }
  }
  return Array.from(categorySet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

/**
 * Load all homepage data server-side
 *
 * This function is called from the server component to fetch:
 * - Destinations (up to 5000)
 * - Filter options (cities and categories)
 * - User authentication state
 * - User profile (if authenticated)
 * - Visited places (if authenticated)
 */
export async function loadHomepageData(): Promise<HomepageData> {
  // Fetch destinations and filter data in parallel
  const [destinations, filterRows] = await Promise.all([
    getHomepageDestinations(5000),
    getFilterRows(1000),
  ]);

  // Extract unique cities and categories
  const cities = extractUniqueCities(filterRows);
  const categories = extractUniqueCategories(filterRows);

  // Get current user from server-side Supabase client
  let user: User | null = null;
  let userProfile: UserProfile | null = null;
  let visitedSlugs: string[] = [];
  let isAdmin = false;

  try {
    const supabase = await createServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      user = authUser;
      isAdmin = authUser.app_metadata?.role === "admin";

      // Fetch user-specific data in parallel
      const [profile, slugs] = await Promise.all([
        getUserProfileById(authUser.id),
        getVisitedSlugsForUser(authUser.id),
      ]);

      userProfile = profile;
      visitedSlugs = slugs;
    }
  } catch (error) {
    // Auth errors are non-fatal - continue with anonymous data
    console.warn("[Homepage Loader] Auth check failed:", error);
  }

  return {
    destinations,
    cities,
    categories,
    user,
    userProfile,
    visitedSlugs,
    isAdmin,
  };
}

/**
 * Load minimal homepage data for faster initial render
 *
 * Use this for streaming SSR where you want to show content quickly
 * and hydrate user-specific data on the client.
 */
export async function loadHomepageDataMinimal(): Promise<
  Pick<HomepageData, "destinations" | "cities" | "categories">
> {
  const [destinations, filterRows] = await Promise.all([
    getHomepageDestinations(5000),
    getFilterRows(1000),
  ]);

  return {
    destinations,
    cities: extractUniqueCities(filterRows),
    categories: extractUniqueCategories(filterRows),
  };
}
