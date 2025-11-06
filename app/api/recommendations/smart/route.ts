import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const context = searchParams.get('context') || 'personalized';
    const userId = searchParams.get('userId');

    const supabase = await createServerClient();

    let categoryFilter: string[] = [];
    let timeBasedFilter: any = {};

    // Context-based filtering
    switch (context) {
      case 'weekend':
        // Weekend: Suggest cafes, brunch spots, activities, hotels
        categoryFilter = ['cafe', 'restaurant', 'hotel', 'bar', 'activity'];
        break;
      case 'evening':
        // Evening: Bars, restaurants, nightlife
        categoryFilter = ['bar', 'restaurant', 'nightlife'];
        break;
      case 'morning':
        // Morning: Cafes, breakfast spots
        categoryFilter = ['cafe', 'bakery', 'breakfast'];
        break;
      default:
        // Personalized: Use user's history
        break;
    }

    let query = supabase
      .from('destinations')
      .select('*')
      .limit(20);

    // Apply category filter if context-based
    if (categoryFilter.length > 0) {
      query = query.in('category', categoryFilter);
    }

    // If user is provided and context is personalized, get similar to their visited places
    if (userId && context === 'personalized') {
      // Get user's visited/saved places
      const { data: visited } = await supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', userId)
        .limit(5);

      if (visited && visited.length > 0) {
        // Get destinations similar to what user has visited
        const { data: destinations } = await supabase
          .from('destinations')
          .select('*')
          .not('slug', 'in', `(${visited.map(v => `'${v.destination_slug}'`).join(',')})`)
          .order('trending_score', { ascending: false })
          .limit(20);

        // Don't cache personalized recommendations
        return NextResponse.json({
          recommendations: destinations || [],
          context
        });
      }
    }

    // Default: Get trending or top-rated places
    query = query.order('rating', { ascending: false, nullsFirst: false });

    const { data: recommendations, error } = await query;

    if (error) throw error;

    const response = NextResponse.json({
      recommendations: recommendations || [],
      context
    });

    // Add cache headers for context-based recommendations (not personalized)
    if (context !== 'personalized') {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }

    return response;
  } catch (error: any) {
    console.error('Smart recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to get smart recommendations', details: error.message },
      { status: 500 }
    );
  }
}
