/**
 * Homepage Server Data Layer
 *
 * Provides all data needed for the homepage in a single parallel fetch.
 * This eliminates client-side waterfalls by fetching everything server-side.
 */

import type { Destination } from "@/types/destination";
import { getHomepageDestinations, getFilterRows, getVisitedSlugsForUser } from "./homepage-loaders";
import { createServerClient } from "@/lib/supabase/server";

export interface FilterOptions {
  cities: string[];
  categories: string[];
}

export interface UserSession {
  id: string;
  session_id: string;
  last_activity: string;
  context_summary?: {
    city?: string;
    category?: string;
    preferences?: string[];
    lastQuery?: string;
  };
  message_count?: number;
}

export interface UserProfileData {
  id: string;
  favorite_cities?: string[];
  favorite_categories?: string[];
  travel_style?: string;
  [key: string]: unknown;
}

export interface HomepageData {
  destinations: Destination[];
  filters: FilterOptions;
  visitedSlugs: string[];
  userProfile: UserProfileData | null;
  lastSession: UserSession | null;
}

/**
 * Extract unique cities and categories from destinations
 */
function extractFilterOptions(rows: Array<{ city?: string | null; category?: string | null }>): FilterOptions {
  const citySet = new Set<string>();
  const categoryLowerSet = new Set<string>();
  const categoryArray: string[] = [];

  rows.forEach((row) => {
    const city = (row.city ?? "").toString().trim();
    const category = (row.category ?? "").toString().trim();

    if (city) citySet.add(city);
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

/**
 * Fetch user profile from database
 */
async function fetchUserProfile(userId: string): Promise<UserProfileData | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as UserProfileData;
  } catch {
    return null;
  }
}

/**
 * Fetch last conversation session for user
 */
async function fetchLastSession(userId: string): Promise<UserSession | null> {
  try {
    const supabase = await createServerClient();

    // Get the latest conversation session
    const { data, error } = await supabase
      .from("conversation_sessions")
      .select("id, session_id, updated_at, context")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    // Get message count for this session
    const { count } = await supabase
      .from("conversation_messages")
      .select("*", { count: "exact", head: true })
      .eq("session_id", data.session_id);

    return {
      id: data.id,
      session_id: data.session_id,
      last_activity: data.updated_at,
      context_summary: data.context as UserSession["context_summary"],
      message_count: count ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Main homepage data loader
 * Fetches all required data in parallel for optimal performance
 */
export async function getHomepageData(userId?: string): Promise<HomepageData> {
  // Run all data fetches in parallel
  const [destinations, filterRows, visitedSlugs, userProfile, lastSession] = await Promise.all([
    // Primary data - always needed
    getHomepageDestinations(),
    getFilterRows(),

    // User-specific data - only if authenticated
    userId ? getVisitedSlugsForUser(userId) : Promise.resolve([]),
    userId ? fetchUserProfile(userId) : Promise.resolve(null),
    userId ? fetchLastSession(userId) : Promise.resolve(null),
  ]);

  // Extract filter options from destinations if filter rows failed
  const filters = filterRows.length > 0
    ? extractFilterOptions(filterRows)
    : extractFilterOptions(destinations);

  return {
    destinations,
    filters,
    visitedSlugs,
    userProfile,
    lastSession,
  };
}

/**
 * Light version for unauthenticated users
 * Only fetches public data needed for initial render
 */
export async function getPublicHomepageData(): Promise<Pick<HomepageData, "destinations" | "filters">> {
  const [destinations, filterRows] = await Promise.all([
    getHomepageDestinations(),
    getFilterRows(),
  ]);

  const filters = filterRows.length > 0
    ? extractFilterOptions(filterRows)
    : extractFilterOptions(destinations);

  return { destinations, filters };
}

/**
 * Fetch only destinations for incremental loading
 */
export async function getDestinationsOnly(): Promise<Destination[]> {
  return getHomepageDestinations();
}
