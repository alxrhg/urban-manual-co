import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = await createServerClient();

    let query = supabase
      .from('destinations')
      .select('*')
      .gt('trending_score', 0)
      .gte('rating', 4.0);

    if (city) query = query.eq('city', city);
    if (category) query = query.eq('category', category);

    const { data: trending, error } = await query
      .order('trending_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({
      trending: trending || [],
      meta: {
        filters: { city, category },
        count: trending?.length || 0,
        period: 'Past 14 days',
      },
    });
  } catch (e: any) {
    console.error('Trending error:', e);
    return NextResponse.json(
      { error: 'Failed to load trending', details: e.message },
      { status: 500 }
    );
  }
}


