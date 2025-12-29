/**
 * Search autocomplete API
 * GET /api/search/autocomplete - Get search suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createServerClient();

  // Parallel queries for better performance
  const [destinationsResult, citiesResult, popularResult, historyResult] = await Promise.all([
    // Search destinations
    supabase
      .from('destinations')
      .select('slug, name, city, category')
      .or(`name.ilike.%${query}%,city.ilike.%${query}%`)
      .order('saves_count', { ascending: false, nullsFirst: false })
      .limit(5),

    // Get matching cities
    supabase
      .from('destinations')
      .select('city')
      .ilike('city', `%${query}%`)
      .limit(10),

    // Get popular searches
    supabase
      .from('popular_searches')
      .select('query, search_count')
      .ilike('query', `%${query}%`)
      .order('search_count', { ascending: false })
      .limit(5),

    // Get user's search history
    user
      ? supabase
          .from('search_history')
          .select('query')
          .eq('user_id', user.id)
          .ilike('query', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
  ]);

  // Dedupe cities
  const uniqueCities = [...new Set(citiesResult.data?.map((c) => c.city) || [])].slice(0, 3);

  // Build suggestions
  const suggestions: Array<{
    type: 'destination' | 'city' | 'popular' | 'history';
    text: string;
    slug?: string;
    city?: string;
    category?: string;
  }> = [];

  // Add search history first (personalized)
  historyResult.data?.forEach((h) => {
    suggestions.push({
      type: 'history',
      text: h.query,
    });
  });

  // Add popular searches
  popularResult.data?.forEach((p) => {
    if (!suggestions.some((s) => s.text.toLowerCase() === p.query.toLowerCase())) {
      suggestions.push({
        type: 'popular',
        text: p.query,
      });
    }
  });

  // Add cities
  uniqueCities.forEach((city) => {
    suggestions.push({
      type: 'city',
      text: city,
      city,
    });
  });

  // Add destinations
  destinationsResult.data?.forEach((d) => {
    suggestions.push({
      type: 'destination',
      text: d.name,
      slug: d.slug,
      city: d.city,
      category: d.category,
    });
  });

  // Track search query for popular searches
  if (query.length >= 3) {
    // Upsert to popular_searches
    await supabase.rpc('increment_search_count', { search_query: query }).catch(() => {
      // Ignore errors - this is just analytics
    });

    // Track in search history if user is logged in
    if (user) {
      await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          query,
        })
        .catch(() => {
          // Ignore errors
        });
    }
  }

  return NextResponse.json({
    suggestions: suggestions.slice(0, limit),
    query,
  });
});
