import { embedText } from '@/lib/llm';
import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const supabase = createClient(url, key);

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function normalize(values: number[]): (x: number) => number {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  return (x: number) => (x - min) / range;
}

export async function semanticBlendSearch(query: string, filters: { city?: string; country?: string; category?: string; cuisine?: string; open_now?: boolean } = {}) {
  const qEmbedding = await embedText(query);
  if (!qEmbedding) return [];

  let q = supabase
    .from('destinations')
    .select('id, slug, name, city, category, image, rating, reviews_count, rank_score, trending_score, is_open_now, tags, vector_embedding')
    .order('rank_score', { ascending: false })
    .limit(200);
  if (filters.city) q = q.ilike('city', `%${filters.city}%`);
  if (filters.category) q = q.ilike('category', `%${filters.category}%`);
  if (filters.country) q = q.ilike('country', `%${filters.country}%`);
  if (filters.open_now) q = q.eq('is_open_now', true);
  if (filters.cuisine) q = q.contains('tags', [filters.cuisine.toLowerCase()]);
  if (filters.cuisine) q = q.contains('tags', [filters.cuisine.toLowerCase()]);

  const { data, error } = await q;
  if (error || !data) return [];

  const rankValues = data.map((d: any) => d.rank_score || 0);
  const trendValues = data.map((d: any) => d.trending_score || 0);
  const norm = normalize(rankValues);
  const normTrend = normalize(trendValues);

  const scored = data
    .filter((d: any) => Array.isArray(d.vector_embedding))
    .map((d: any) => {
      const sim = cosineSimilarity(qEmbedding as number[], d.vector_embedding as number[]);
      const blended = 0.6 * sim + 0.25 * norm(d.rank_score || 0) + 0.15 * normTrend(d.trending_score || 0);
      return { ...d, _sim: sim, _score: blended };
    })
    .sort((a: any, b: any) => b._score - a._score)
    .slice(0, 20);

  // Apply editorial integrity prioritization in the final pass
  const curated = scored.sort((a: any, b: any) => {
    const aGood = (a.rating || 0) > 4.0 && (a.reviews_count || 0) > 10 ? 1 : 0;
    const bGood = (b.rating || 0) > 4.0 && (b.reviews_count || 0) > 10 ? 1 : 0;
    if (aGood !== bGood) return bGood - aGood;
    return b._score - a._score;
  });

  return curated.map(({ _sim, _score, vector_embedding, ...rest }: any) => rest);
}


