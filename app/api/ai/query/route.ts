import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/llm';
import { resolveSupabaseClient } from '@/app/api/_utils/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId } = body || {};
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const supabase = resolveSupabaseClient();
    if (!supabase) {
      console.error('Supabase environment variables are not configured for the AI query route.');
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const system = 'You are an intelligent travel router. Parse the user query into JSON with fields: city, category, modifiers (array), openNow (boolean), budget (min,max), dateRange (start,end).';
    const parsed = await generateJSON(system, query);

    const limit = 50;
    let q = supabase
      .from('destinations')
      .select('slug, name, city, neighborhood, category, rating, price_level, image, rank_score, is_open_now')
      .order('rank_score', { ascending: false })
      .limit(limit);

    if (parsed?.city) q = q.ilike('city', `%${parsed.city}%`);
    if (parsed?.category) q = q.ilike('category', `%${parsed.category}%`);
    if (parsed?.openNow === true) q = q.eq('is_open_now', true);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ intent: parsed || null, results: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'AI query failed', details: e.message }, { status: 500 });
  }
}


