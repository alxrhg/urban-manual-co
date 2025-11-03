import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);
const JOBS_TOKEN = process.env.JOBS_TOKEN || '';

function getLocalTime(utcOffsetMinutes: number | null): { weekday: number; hhmm: string } {
  const now = new Date();
  const offset = typeof utcOffsetMinutes === 'number' ? utcOffsetMinutes : 0;
  const localMs = now.getTime() + offset * 60 * 1000;
  const local = new Date(localMs);
  const weekday = local.getUTCDay();
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return { weekday, hhmm: `${hh}${mm}` };
}

function isOpenNow(opening: any, utcOffset: number | null): boolean {
  try {
    if (!opening || !Array.isArray(opening.periods)) return false;
    const { weekday, hhmm } = getLocalTime(utcOffset ?? null);
    for (const p of opening.periods) {
      const open = p.open;
      const close = p.close;
      if (!open || !open.time) continue;
      const openDay = typeof open.day === 'number' ? open.day : weekday;
      const closeDay = typeof close?.day === 'number' ? close.day : openDay;
      const openTime = String(open.time);
      const closeTime = close?.time ? String(close.time) : null;
      if (openDay === weekday) {
        if (!closeTime) {
          if (hhmm >= openTime) return true;
        } else if (closeDay === weekday) {
          if (hhmm >= openTime && hhmm < closeTime) return true;
        } else {
          if (hhmm >= openTime) return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (JOBS_TOKEN) {
      const token = req.headers.get('x-jobs-token') || '';
      if (token !== JOBS_TOKEN) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const start = Date.now();
    const sinceIso = new Date(Date.now() - 90 * 86400000).toISOString();
    const [{ data: saves }, { data: visits }] = await Promise.all([
      supabase.from('saved_places').select('destination_slug, created_at').gte('created_at', sinceIso),
      supabase.from('visited_places').select('destination_slug, visited_at').gte('visited_at', sinceIso),
    ]);
    const saveMap = new Map<string, number>();
    const visitMap = new Map<string, number>();
    const now = Date.now();
    (saves || []).forEach((s: any) => {
      const ageDays = Math.max((now - new Date(s.created_at).getTime()) / 86400000, 0);
      const weight = Math.exp(-ageDays / 14);
      saveMap.set(s.destination_slug, (saveMap.get(s.destination_slug) || 0) + weight);
    });
    (visits || []).forEach((v: any) => {
      const ageDays = Math.max((now - new Date(v.visited_at).getTime()) / 86400000, 0);
      const weight = Math.exp(-ageDays / 14);
      visitMap.set(v.destination_slug, (visitMap.get(v.destination_slug) || 0) + weight);
    });

    const { data: dests, error } = await supabase
      .from('destinations')
      .select('id, slug, rating, current_opening_hours_json, utc_offset');
    if (error) throw error;

    const updates: any[] = [];
    for (const d of dests || []) {
      const rating = typeof d.rating === 'number' ? d.rating : 0;
      const savesDecay = saveMap.get(d.slug) || 0;
      const visitsDecay = visitMap.get(d.slug) || 0;
      const recentViewsDecay = visitsDecay * 0.6 + savesDecay * 0.4;
      const reviewsProxy = Math.log(1 + (savesDecay + visitsDecay));
      const rank = rating * 0.6 + reviewsProxy * 0.2 + recentViewsDecay * 0.2;
      const openNow = isOpenNow(d.current_opening_hours_json, d.utc_offset);
      updates.push({ id: d.id, rank_score: rank, is_open_now: openNow });
    }

    for (let i = 0; i < updates.length; i += 500) {
      const slice = updates.slice(i, i + 500);
      await supabase.from('destinations').upsert(slice);
    }

    try { await supabase.rpc('refresh_popularity_view'); } catch {}
    await supabase.from('jobs_history').insert({
      job_name: 'daily_rank_and_open_now',
      status: 'success',
      duration_ms: Date.now() - start,
      notes: `Updated ${updates.length} destinations.`
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Job failed', details: e.message }, { status: 500 });
  }
}


