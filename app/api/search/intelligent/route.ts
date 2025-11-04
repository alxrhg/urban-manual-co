import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';
import { rerankDestinations } from '@/lib/search/reranker';
import { generateSearchResponseContext } from '@/lib/search/generateSearchContext';
import { generateSuggestions } from '@/lib/search/generateSuggestions';

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
        limit_count: 10,
      }
    );

    if (error) {
      console.error('Search error:', error);
      throw error;
    }

    // Apply enhanced re-ranking
    const rerankedResults = rerankDestinations(results || [], {
      query,
      queryIntent: {
        city: city || undefined,
        category: category || undefined,
      },
      userId: session?.user?.id,
      boostPersonalized: !!session?.user?.id,
    });

    const limited = (rerankedResults || []).slice(0, 10);
    const contextResponse = generateSearchResponseContext({
      query,
      results: limited,
      filters: { openNow },
    });
    const suggestions = generateSuggestions({ query, results: limited, filters: { openNow } });

    // Log search interaction (best-effort)
    try {
      await supabase.from('user_interactions').insert({
        interaction_type: 'search',
        user_id: session?.user?.id || null,
        destination_id: null,
        metadata: {
          query,
          filters: { city, category, openNow },
          count: limited.length,
          source: 'api/search/intelligent',
        }
      });
    } catch {}

    return NextResponse.json({
      results: limited,
      contextResponse,
      suggestions,
      meta: {
        query,
        filters: { city, category, openNow },
        count: limited.length,
        reranked: true,
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

