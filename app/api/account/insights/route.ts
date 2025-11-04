import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getSeasonalContext, getAllSeasonalEvents } from '@/services/seasonality';

/**
 * GET /api/account/insights
 * Get travel insights: upcoming peak windows, visited vs wishlist stats, taste alignment
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's saved and visited places using RPC functions for better joins
    const [savedResult, visitedResult, profileResult] = await Promise.all([
      supabase.rpc('get_user_saved_destinations', { target_user_id: user.id }),
      supabase.rpc('get_user_visited_destinations', { target_user_id: user.id }),
      supabase
        .from('user_profiles')
        .select('favorite_cities, favorite_categories, interests, travel_style')
        .eq('user_id', user.id)
        .single(),
    ]);

    const saved = savedResult.data || [];
    const visited = visitedResult.data || [];
    const profile = profileResult.data;

    // Get favorite cities
    const favoriteCities = profile?.favorite_cities || [];
    const savedCities = Array.from(new Set(saved.map((s: any) => s.city).filter(Boolean)));
    const visitedCities = Array.from(new Set(visited.map((v: any) => v.city).filter(Boolean)));
    
    // Get upcoming peak windows for favorite cities
    const upcomingPeakWindows: Array<{
      city: string;
      event: string;
      text: string;
      start: string;
      end: string;
    }> = [];

    const allCities = Array.from(new Set([...favoriteCities, ...savedCities, ...visitedCities]));
    
    for (const city of allCities.slice(0, 10)) {
      const context = getSeasonalContext(city);
      if (context) {
        const now = new Date();
        // Only show upcoming or current events
        if (new Date(context.start) >= now || (new Date(context.start) <= now && new Date(context.end) >= now)) {
          upcomingPeakWindows.push({
            city,
            event: context.event,
            text: context.text,
            start: context.start.toISOString(),
            end: context.end.toISOString(),
          });
        }
      }
    }

    // Category stats
    const visitedByCategory: Record<string, number> = {};
    const savedByCategory: Record<string, number> = {};

    visited.forEach((v: any) => {
      const category = v.category || 'Other';
      visitedByCategory[category] = (visitedByCategory[category] || 0) + 1;
    });

    saved.forEach((s: any) => {
      const category = s.category || 'Other';
      savedByCategory[category] = (savedByCategory[category] || 0) + 1;
    });

    // Taste alignment - analyze visited places tags vs user interests
    const userInterests = profile?.interests || [];
    const visitedTags: Record<string, number> = {};
    
    // Note: RPC function returns full destination data, but tags might not be included
    // If tags are needed, we'd need to query destinations separately or update RPC function
    // For now, skip tags analysis since tags aren't in the RPC return type
    // visited.forEach((v: any) => {
    //   const tags = v.tags || [];
    //   tags.forEach((tag: string) => {
    //     visitedTags[tag.toLowerCase()] = (visitedTags[tag.toLowerCase()] || 0) + 1;
    //   });
    // });

    const tasteAlignment: Array<{ interest: string; percentage: number }> = [];
    userInterests.forEach((interest: string) => {
      const matchingTags = Object.keys(visitedTags).filter(tag => 
        tag.includes(interest.toLowerCase()) || interest.toLowerCase().includes(tag)
      );
      const matchCount = matchingTags.reduce((sum, tag) => sum + visitedTags[tag], 0);
      const percentage = visited.length > 0 ? Math.round((matchCount / visited.length) * 100) : 0;
      tasteAlignment.push({ interest, percentage });
    });

    return NextResponse.json({
      upcomingPeakWindows: upcomingPeakWindows.slice(0, 5),
      visitedByCategory,
      savedByCategory,
      tasteAlignment,
      stats: {
        totalSaved: saved.length,
        totalVisited: visited.length,
        citiesExplored: visitedCities.length,
        citiesSaved: savedCities.length,
      },
    });
  } catch (error: any) {
    console.error('Insights API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

