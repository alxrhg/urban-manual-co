import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJSON } from '@/lib/llm';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
// Support both new (publishable/secret) and legacy (anon/service_role) key naming
const key = (
  process.env.SUPABASE_SECRET_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string;
const supabase = createClient(url, key);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, userId } = body || {};
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const system = 'You are an intelligent travel router. Parse the user query into JSON with fields: city, category, modifiers (array), openNow (boolean), budget (min,max), dateRange (start,end).';
    const parsed = await generateJSON(system, query);

    const limit = 50;
    let q = supabase
      .from('destinations')
      .select('slug, name, city, category, rating, price_level, image, rank_score, is_open_now')
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


