import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);
const JOBS_TOKEN = process.env.JOBS_TOKEN || '';

function expDecay(days: number, halfLifeDays = 90): number {
  const lambda = Math.log(2) / halfLifeDays;
  return Math.exp(-lambda * Math.max(days, 0));
}

export async function POST(req: NextRequest) {
  try {
    if (JOBS_TOKEN) {
      const token = req.headers.get('x-jobs-token') || '';
      if (token !== JOBS_TOKEN) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const start = Date.now();
    const sinceIso = new Date(Date.now() - 365 * 86400000).toISOString();
    const nowMs = Date.now();

    const [{ data: saves }, { data: visits }] = await Promise.all([
      supabase.from('saved_places').select('user_id, destination_slug, created_at').gte('created_at', sinceIso),
      supabase.from('visited_places').select('user_id, destination_slug, visited_at').gte('visited_at', sinceIso),
    ]);

    const byUser: Record<string, string[]> = {};
    const allSlugs = new Set<string>();
    ;[...(saves || []), ...(visits || [])].forEach((row: any) => {
      const uid = row.user_id;
      const slug = row.destination_slug;
      if (!uid || !slug) return;
      allSlugs.add(slug);
      byUser[uid] = byUser[uid] || [];
      if (!byUser[uid].includes(slug)) byUser[uid].push(slug);
    });

    const slugToId: Record<string, string> = {};
    const slugs = Array.from(allSlugs);
    for (let i = 0; i < slugs.length; i += 500) {
      const chunk = slugs.slice(i, i + 500);
      const { data } = await supabase.from('destinations').select('id, slug').in('slug', chunk);
      (data || []).forEach((d: any) => { slugToId[d.slug] = d.id; });
    }

    const pairMap = new Map<string, number>();
    for (const userSlugs of Object.values(byUser)) {
      if (userSlugs.length < 2) continue;
      const savesTs = new Map<string, number>();
      const visitsTs = new Map<string, number>();
      (saves || []).forEach((s: any) => { if (userSlugs.includes(s.destination_slug)) savesTs.set(s.destination_slug, new Date(s.created_at).getTime()); });
      (visits || []).forEach((v: any) => { if (userSlugs.includes(v.destination_slug)) visitsTs.set(v.destination_slug, new Date(v.visited_at).getTime()); });
      for (let i = 0; i < userSlugs.length; i++) {
        for (let j = i + 1; j < userSlugs.length; j++) {
          const a = userSlugs[i];
          const b = userSlugs[j];
          if (!slugToId[a] || !slugToId[b]) continue;
          const key = [slugToId[a], slugToId[b]].sort().join('|');
          const tsA = Math.max(savesTs.get(a) || 0, visitsTs.get(a) || 0, nowMs - 365 * 86400000);
          const tsB = Math.max(savesTs.get(b) || 0, visitsTs.get(b) || 0, nowMs - 365 * 86400000);
          const daysA = (nowMs - tsA) / 86400000;
          const daysB = (nowMs - tsB) / 86400000;
          const weight = (expDecay(daysA) + expDecay(daysB)) * 0.5;
          pairMap.set(key, (pairMap.get(key) || 0) + weight);
        }
      }
    }

    await supabase.from('co_visit_signals').delete().neq('destination_a', '00000000-0000-0000-0000-000000000000');

    const inserts: any[] = [];
    for (const [key, score] of pairMap.entries()) {
      const [idA, idB] = key.split('|');
      if (parseFloat(score.toString()) < 0.1) continue;
      inserts.push({ destination_a: idA, destination_b: idB, co_visit_score: score, last_updated: new Date().toISOString() });
    }

    for (let i = 0; i < inserts.length; i += 500) {
      const batch = inserts.slice(i, i + 500);
      await supabase.from('co_visit_signals').upsert(batch, { onConflict: 'destination_a,destination_b' });
    }

    await supabase.from('jobs_history').insert({ job_name: 'weekly_co_visitation', status: 'success', duration_ms: Date.now() - start, notes: `Pairs: ${inserts.length}` });
    return NextResponse.json({ ok: true, pairs: inserts.length });
  } catch (e: any) {
    return NextResponse.json({ error: 'Job failed', details: e.message }, { status: 500 });
  }
}


