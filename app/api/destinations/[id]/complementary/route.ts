import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const supabase = createClient(url, key);

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const limit = parseInt(new URL(_req.url).searchParams.get('limit') || '20', 10);

    const { data, error } = await supabase
      .from('destination_relationships')
      .select('target_destination_id, similarity_score, strength')
      .eq('source_destination_id', id)
      .eq('relation_type', 'complementary')
      .order('similarity_score', { ascending: false })
      .limit(limit);
    
    if (error) throw error;

    const ids = (data || [])
      .filter((r: any) => (r.similarity_score || r.strength || 0) > 0.5)
      .sort((a: any, b: any) => (b.similarity_score || b.strength || 0) - (a.similarity_score || a.strength || 0))
      .slice(0, limit)
      .map((r: any) => r.target_destination_id);

    if (ids.length === 0) return NextResponse.json({ items: [] });

    const { data: dests, error: dErr } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image, description')
      .in('id', ids);
    
    if (dErr) throw dErr;

    return NextResponse.json({ items: dests || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load complementary', details: e.message }, { status: 500 });
  }
}

