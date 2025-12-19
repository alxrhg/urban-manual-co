/**
 * Admin Analytics API
 *
 * Comprehensive analytics endpoint for the admin dashboard.
 * Fetches real data from behavior_events and user_interactions tables.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { withErrorHandling, createValidationError } from "@/lib/errors";

type DateRange = "7d" | "30d" | "90d";

interface AnalyticsResponse {
  summary: {
    totalViews: number;
    totalSearches: number;
    totalSaves: number;
    totalUsers: number;
    viewsTrend: number;
    searchesTrend: number;
    savesTrend: number;
    usersTrend: number;
  };
  dailyViews: Array<{ date: string; label: string; views: number }>;
  topDestinations: Array<{
    name: string;
    city: string;
    slug: string;
    views: number;
    saves: number;
  }>;
  topSearches: Array<{ query: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
}

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  // Check admin authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional: Check admin role (uncomment if needed)
  // const { data: profile } = await supabase
  //   .from('profiles')
  //   .select('role')
  //   .eq('id', session.user.id)
  //   .single();
  // if (profile?.role !== 'admin') {
  //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // }

  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") as DateRange) || "30d";

  const daysMap: Record<DateRange, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  const days = daysMap[range] || 30;
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - days);
  currentStart.setHours(0, 0, 0, 0);

  const previousStart = new Date();
  previousStart.setDate(previousStart.getDate() - days * 2);
  previousStart.setHours(0, 0, 0, 0);

  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

  // Fetch current period events from behavior_events
  const { data: currentEvents } = await supabase
    .from("behavior_events")
    .select("event_type, destination_slug, event_context, created_at, user_id")
    .gte("created_at", currentStart.toISOString())
    .order("created_at", { ascending: false });

  // Fetch previous period events for trend calculation
  const { data: previousEvents } = await supabase
    .from("behavior_events")
    .select("event_type, user_id")
    .gte("created_at", previousStart.toISOString())
    .lt("created_at", currentStart.toISOString());

  // Calculate summary metrics
  const currentViews =
    currentEvents?.filter((e) => e.event_type === "destination_view").length ||
    0;
  const currentSearches =
    currentEvents?.filter((e) => e.event_type === "search_query").length || 0;
  const currentSaves =
    currentEvents?.filter((e) => e.event_type === "destination_save").length ||
    0;
  const currentUsers = new Set(
    currentEvents?.filter((e) => e.user_id).map((e) => e.user_id) || []
  ).size;

  const previousViews =
    previousEvents?.filter((e) => e.event_type === "destination_view").length ||
    0;
  const previousSearches =
    previousEvents?.filter((e) => e.event_type === "search_query").length || 0;
  const previousSaves =
    previousEvents?.filter((e) => e.event_type === "destination_save").length ||
    0;
  const previousUsers = new Set(
    previousEvents?.filter((e) => e.user_id).map((e) => e.user_id) || []
  ).size;

  // Calculate trends (percentage change)
  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  };

  // Build daily views data
  const dailyData: Record<string, number> = {};
  const displayDays = range === "90d" ? 30 : days; // For 90d, show last 30 days in chart

  for (let i = displayDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    dailyData[key] = 0;
  }

  currentEvents
    ?.filter((e) => e.event_type === "destination_view")
    .forEach((e) => {
      const date = e.created_at.split("T")[0];
      if (dailyData[date] !== undefined) {
        dailyData[date]++;
      }
    });

  const dailyViews = Object.entries(dailyData).map(([date, views]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    views,
  }));

  // Get top destinations by views from behavior_events
  const destinationViews: Record<string, number> = {};
  currentEvents
    ?.filter((e) => e.event_type === "destination_view" && e.destination_slug)
    .forEach((e) => {
      destinationViews[e.destination_slug!] =
        (destinationViews[e.destination_slug!] || 0) + 1;
    });

  const topDestinationSlugs = Object.entries(destinationViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([slug]) => slug);

  // Fetch destination details
  let topDestinations: AnalyticsResponse["topDestinations"] = [];
  if (topDestinationSlugs.length > 0) {
    const { data: destinations } = await supabase
      .from("destinations")
      .select("slug, name, city, views_count, saves_count")
      .in("slug", topDestinationSlugs);

    if (destinations) {
      topDestinations = topDestinationSlugs.map((slug) => {
        const dest = destinations.find((d) => d.slug === slug);
        return {
          slug,
          name: dest?.name || slug,
          city: dest?.city || "Unknown",
          views: destinationViews[slug] || 0,
          saves: dest?.saves_count || 0,
        };
      });
    }
  }

  // Get top searches from behavior_events
  const searchQueries: Record<string, number> = {};
  currentEvents
    ?.filter((e) => e.event_type === "search_query")
    .forEach((e) => {
      const query =
        e.event_context?.search_query || e.event_context?.query || "";
      if (query && typeof query === "string" && query.trim()) {
        const normalizedQuery = query.toLowerCase().trim();
        searchQueries[normalizedQuery] =
          (searchQueries[normalizedQuery] || 0) + 1;
      }
    });

  const topSearches = Object.entries(searchQueries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  // Get category breakdown from destinations
  const { data: categories } = await supabase
    .from("destinations")
    .select("category");

  const categoryCount: Record<string, number> = {};
  categories?.forEach((d) => {
    if (d.category) {
      categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
    }
  });

  const categoryBreakdown = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Get city breakdown from destinations
  const { data: cities } = await supabase
    .from("destinations")
    .select("city");

  const cityCount: Record<string, number> = {};
  cities?.forEach((d) => {
    if (d.city) {
      cityCount[d.city] = (cityCount[d.city] || 0) + 1;
    }
  });

  const topCities = Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  const response: AnalyticsResponse = {
    summary: {
      totalViews: currentViews,
      totalSearches: currentSearches,
      totalSaves: currentSaves,
      totalUsers: currentUsers,
      viewsTrend: calculateTrend(currentViews, previousViews),
      searchesTrend: calculateTrend(currentSearches, previousSearches),
      savesTrend: calculateTrend(currentSaves, previousSaves),
      usersTrend: calculateTrend(currentUsers, previousUsers),
    },
    dailyViews,
    topDestinations,
    topSearches,
    categoryBreakdown,
    topCities,
  };

  return NextResponse.json(response);
});
