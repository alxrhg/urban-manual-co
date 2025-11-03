import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string;
const supabase = createClient(url, key);
const JOBS_TOKEN = process.env.JOBS_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    if (JOBS_TOKEN) {
      const token = req.headers.get('x-jobs-token') || '';
      if (token !== JOBS_TOKEN) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const start = Date.now();

    // City-level interest proxies using popularity_view
    const { data: citiesRaw } = await supabase.from('destinations').select('city').limit(100000);
    const cities = Array.from(new Set((citiesRaw || []).map((r: any) => (r.city || '').toLowerCase()).filter(Boolean)));
    const { data: pv } = await supabase.from('popularity_view').select('destination_slug, trending_score').limit(100000);
    const { data: dests } = await supabase.from('destinations').select('slug, city').limit(100000);
    const slugToCity: Record<string, string> = {};
    (dests || []).forEach((d: any) => { if (d.slug && d.city) slugToCity[d.slug] = String(d.city).toLowerCase(); });

    for (const city of cities) {
      const values = (pv || []).filter((p: any) => slugToCity[p.destination_slug] && slugToCity[p.destination_slug].includes(city)).map((p: any) => Number(p.trending_score || 0));
      if (!values.length) continue;
      const interest = values.reduce((a, b) => a + b, 0) / values.length;
      const first = values[0];
      const last = values[values.length - 1];
      const change = (last - first) / Math.max(Math.abs(first), 1e-6);
      const trend = change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'flat';
      await supabase.from('forecasting_data').insert({
        metric_type: 'popularity',
        metric_value: interest,
        recorded_at: new Date().toISOString(),
        metadata: { city },
        interest_score: interest,
        trend_direction: trend,
        last_forecast: new Date().toISOString(),
      });
    }

    await supabase.from('jobs_history').insert({ job_name: 'monthly_forecast_interest_scores', status: 'success', duration_ms: Date.now() - start, notes: `Cities: ${cities.length}` });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Job failed', details: e.message }, { status: 500 });
  }
}


