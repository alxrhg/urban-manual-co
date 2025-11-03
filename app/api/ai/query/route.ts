import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJSON } from '@/lib/llm';
import { openai, OPENAI_MODEL } from '@/lib/openai';
import { semanticBlendSearch } from '@/lib/search/semanticSearch';
import { rerankResults } from '@/lib/ai/rerank';
import { getLocation, getWeather } from '@/lib/ai/contextLocation';

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
    // Hard-prioritize city/country if present
    if (parsed?.city) q = q.ilike('city', `%${parsed.city}%`);
    if ((parsed as any)?.country) q = q.ilike('country', `%${(parsed as any).country}%`);
    if (parsed?.openNow === true) q = q.eq('is_open_now', true);

    const { data, error } = await q;
    if (error) throw error;

    // Run hybrid semantic + rank search using vector embeddings
    let hybridResults: any[] = [];
    try {
      hybridResults = await semanticBlendSearch(query, {
        city: parsed?.city || undefined,
        country: (parsed as any)?.country || undefined,
        category: parsed?.category || undefined,
        open_now: parsed?.openNow === true ? true : undefined,
      });
    } catch {}

    let finalResults = (hybridResults && hybridResults.length > 0) ? hybridResults : (data || []);
    // Re-rank top 20 for better personalization/contextual fit
    try {
      finalResults = await rerankResults(query, finalResults, 20);
    } catch {}

    // Editorial insight banner (only when any search/filter applied)
    let insight: string | null = null;
    const hasFilters = Boolean(query) || Boolean(parsed?.city) || Boolean(parsed?.category) || parsed?.openNow === true;
    if (hasFilters && openai) {
      try {
        // Collect top tags from results
        const tagsCount: Record<string, number> = {};
        (finalResults || []).slice(0, 30).forEach((d: any) => {
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

        // Generate playful, personalized greeting from location/time/weather
        let greeting = '';
        const loc = await getLocation(req);
        let localTime = '';
        let timeOfDay = '';
        if (loc?.timezone) {
          try {
            const now = new Date();
            const fmt = new Intl.DateTimeFormat('en-US', { timeZone: loc.timezone, hour: '2-digit', minute: '2-digit', hour12: false });
            localTime = fmt.format(now);
            const hour = parseInt(localTime.split(':')[0] || '12', 10);
            if (hour >= 5 && hour < 12) timeOfDay = 'Morning';
            else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
            else if (hour >= 17 && hour < 22) timeOfDay = 'Evening';
            else timeOfDay = 'Late night';
          } catch {}
        }
        const weather = await getWeather(loc?.city, loc?.latitude, loc?.longitude);
        
        // Generate personalized greeting using AI
        if (loc?.city && openai) {
          try {
            const context = [
              loc.city,
              timeOfDay ? `${timeOfDay} (${localTime})` : '',
              weather?.temperature_c ? `${Math.round(weather.temperature_c)}°C` : '',
              weather?.is_raining ? 'raining' : '',
            ].filter(Boolean).join(', ');
            
            const greetingResp = await openai.chat.completions.create({
              model: OPENAI_MODEL,
              messages: [
                { 
                  role: 'system', 
                  content: 'You are The Urban Manual\'s playful travel editor. Generate a brief (8-15 words), witty, personalized greeting referencing the user\'s location, time of day, and weather. Be playful but sophisticated. Examples: "Evening in Paris — perfect for candlelight.", "Morning drizzle in Tokyo? Cozy cafés await.", "Late night in London — time for dim-lit corners." Never mention AI or be generic.' 
                },
                { 
                  role: 'user', 
                  content: `Generate a playful greeting for: ${context}` 
                }
              ],
              temperature: 0.9,
              max_tokens: 30,
            });
            greeting = (greetingResp.choices?.[0]?.message?.content || '').trim();
          } catch (_) {
            // Fallback to simple greeting if AI fails
            if (loc?.city) {
              greeting = timeOfDay ? `${timeOfDay} in ${loc.city}` : `From ${loc.city}`;
              if (weather?.temperature_c) greeting += ` — ${Math.round(weather.temperature_c)}°C`;
            }
          }
        }

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
        const raw = (resp.choices?.[0]?.message?.content || '').trim();
        insight = greeting ? `${greeting}. ${raw}` : raw;
      } catch (_) {
        insight = null;
      }
    }

    return NextResponse.json({ intent: parsed || null, insight, results: finalResults });
      } catch (e: any) {
        console.error('[AI Query] Error:', e?.message || e);
        return NextResponse.json({ error: 'AI query failed', details: e.message }, { status: 500 });
  }
}


