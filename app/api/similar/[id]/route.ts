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
    const limit = 20;
    const { data, error } = await supabase
      .from('destination_relationships')
      .select('target_destination_id, similarity_score')
      .eq('source_destination_id', id)
      .eq('relation_type', 'similar')
      .order('similarity_score', { ascending: false })
      .limit(limit);
    if (error) throw error;

    // Merge co_visit_signals (check both directions)
    const rel = data || [];
    const [{ data: coA }, { data: coB }] = await Promise.all([
      supabase.from('co_visit_signals').select('destination_b, co_visit_score').eq('destination_a', id).order('co_visit_score', { ascending: false }).limit(limit),
      supabase.from('co_visit_signals').select('destination_a, co_visit_score').eq('destination_b', id).order('co_visit_score', { ascending: false }).limit(limit),
    ]);

    const unified: Record<string, number> = {};
    rel.forEach((r: any) => { unified[r.target_destination_id] = Math.max(unified[r.target_destination_id] || 0, r.similarity_score || 0); });
    (coA || []).forEach((c: any) => { unified[c.destination_b] = Math.max(unified[c.destination_b] || 0, (c.co_visit_score || 0)); });
    (coB || []).forEach((c: any) => { unified[c.destination_a] = Math.max(unified[c.destination_a] || 0, (c.co_visit_score || 0)); });

    const ids = Object.entries(unified)
      .filter(([_, s]) => (s as number) > 0.75)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, limit)
      .map(([id]) => id);
    if (ids.length === 0) return NextResponse.json({ items: [] });

    const { data: dests, error: dErr } = await supabase
      .from('destinations')
      .select('id, slug, name, city, category, image')
      .in('id', ids);
    if (dErr) throw dErr;

    return NextResponse.json({ items: dests || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load similar', details: e.message }, { status: 500 });
  }
}


