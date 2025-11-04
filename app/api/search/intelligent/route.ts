import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const openNow = searchParams.get('open_now') === 'true';

  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    // Generate embedding for search query
    const embedding = await embedText(query);

    if (!embedding) {
      return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
    }

    // Intelligent search
    const { data: results, error } = await supabase.rpc(
      'search_destinations_intelligent',
      {
        query_embedding: `[${embedding.join(',')}]`,
        user_id_param: session?.user?.id || null,
        city_filter: city,
        category_filter: category,
        open_now_filter: openNow,
        limit_count: 20,
      }
    );

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    return NextResponse.json({
      results: results || [],
      meta: {
        query,
        filters: { city, category, openNow },
        count: results?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}

