import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Get a sample set of destinations for visual loading animation
 * Returns a diverse mix to make the filtering animation look impressive
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = createClient();

    // Get a diverse sample: mix of cities, categories, ratings
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image, michelin_stars, price_level, rating, tags')
      .order('rating', { ascending: false, nullsLast: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching sample destinations:', error);
      return NextResponse.json({ destinations: [] }, { status: 500 });
    }

    return NextResponse.json({
      destinations: destinations || [],
      count: destinations?.length || 0,
    });
  } catch (error: any) {
    console.error('Sample destinations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sample destinations', details: error.message },
      { status: 500 }
    );
  }
}
