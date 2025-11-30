import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';

// Cache for 5 minutes - trending data updates periodically
export const revalidate = 300;

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const includeGoogleTrends = searchParams.get('include_google_trends') === 'true';

  const supabase = await createServerClient();

  // Build query - only include google_trends columns if requested
  // This prevents errors if the columns don't exist in the database schema
  let query = supabase
    .from('destinations')
    .select('*')
    .gt('trending_score', 0)
    .gte('rating', 4.0);

  if (city) query = query.eq('city', city);
  if (category) query = query.eq('category', category);

  // Try to prioritize with Google Trends if available, fall back to basic trending_score
  const { data: trending, error } = await query
    .order('trending_score', { ascending: false })
    .order('google_trends_direction', { ascending: false })
    .order('google_trends_interest', { ascending: false })
    .limit(limit);

  if (error) {
    // Check if error is due to missing google_trends columns
    if (error.message?.includes('google_trends') || error.code === '42703') {
      console.warn('[Trending API] Google Trends columns not found, falling back to basic query');
      // Retry without google_trends ordering
      let fallbackQuery = supabase
        .from('destinations')
        .select('*')
        .gt('trending_score', 0)
        .gte('rating', 4.0)
        .order('trending_score', { ascending: false })
        .limit(limit);

      if (city) fallbackQuery = fallbackQuery.eq('city', city);
      if (category) fallbackQuery = fallbackQuery.eq('category', category);

      const { data: fallbackData, error: fallbackError } = await fallbackQuery;

      if (fallbackError) throw fallbackError;

      return NextResponse.json({
        trending: fallbackData || [],
        meta: {
          filters: { city, category },
          count: fallbackData?.length || 0,
          period: 'Past 14 days',
          includesGoogleTrends: false,
          note: 'Google Trends data not available',
        },
      });
    }
    throw error;
  }

  const response = NextResponse.json({
    trending: trending || [],
    meta: {
      filters: { city, category },
      count: trending?.length || 0,
      period: 'Past 14 days (enhanced with Google Trends)',
      includesGoogleTrends: includeGoogleTrends,
    },
  });

  // Add cache headers (5 minutes for trending data)
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  return response;
});
