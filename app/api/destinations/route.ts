import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'ids parameter is required' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const supabase = await createServerClient();

    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image, rating, price_level, michelin_stars')
      .in('id', ids);

    if (error) {
      console.error('Error fetching destinations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch destinations' },
        { status: 500 }
      );
    }

    return NextResponse.json(destinations || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
      },
    });
  } catch (error) {
    console.error('Error in destinations endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
