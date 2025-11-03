import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const supabase = createClient(url, key);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const openNow = searchParams.get('open_now');

    let q = supabase
      .from('destinations')
      .select('slug, name, city, category, image, rating, price_level, rank_score')
      .order('rank_score', { ascending: false })
      .limit(limit);

    if (city) q = q.ilike('city', `%${city}%`);
    if (openNow === 'true') q = q.eq('is_open_now', true);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ items: data || [], count: data?.length || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load trending', details: e.message }, { status: 500 });
  }
}


