import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJSON } from '@/lib/llm';
import { openai, OPENAI_MODEL } from '@/lib/openai';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
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

    // Editorial insight banner (only when any search/filter applied)
    let insight: string | null = null;
    const hasFilters = Boolean(query) || Boolean(parsed?.city) || Boolean(parsed?.category) || parsed?.openNow === true;
    if (hasFilters && openai) {
      try {
        // Collect top tags from results
        const tagsCount: Record<string, number> = {};
        (data || []).slice(0, 30).forEach((d: any) => {
          const tags: string[] = Array.isArray(d.tags) ? d.tags : [];
          tags.forEach((t: string) => {
            const key = String(t || '').trim().toLowerCase();
            if (!key) return;
            tagsCount[key] = (tagsCount[key] || 0) + 1;
          });
        });
        const topTags = Object.entries(tagsCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t);

        const systemPrompt = 'Urban Manual Editorial Intelligence';
        const userPrompt = `Search: ${query}\nTop destination tags: ${topTags.join(', ')}\n\nWrite a concise 1–2 sentence editorial insight to introduce these results. Tone: modern luxury, quiet confidence. Do not mention AI.`;
        const resp = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 120,
        });
        insight = (resp.choices?.[0]?.message?.content || '').trim();
      } catch (_) {
        insight = null;
      }
    }

    return NextResponse.json({ intent: parsed || null, insight, results: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: 'AI query failed', details: e.message }, { status: 500 });
  }
}


