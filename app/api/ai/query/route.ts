import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateJSON } from '@/lib/llm';
import { withErrorHandling } from '@/lib/errors';
import { conversationRatelimit, memoryConversationRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE keys.');
  }

  return createClient(url, key);
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Rate limiting for AI endpoints
  const identifier = getIdentifier(req);
  const limiter = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
  }

  const body = await req.json();
  const { query, userId } = body || {};
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const system = 'You are an intelligent travel router. Parse the user query into JSON with fields: city, category, modifiers (array), openNow (boolean), budget (min,max), dateRange (start,end).';
  const parsed = await generateJSON(system, query);

  const queryLimit = 50;
  let q = supabase
    .from('destinations')
    .select('slug, name, city, neighborhood, category, rating, price_level, image, rank_score, is_open_now')
    .order('rank_score', { ascending: false })
    .limit(queryLimit);

  if (parsed?.city) q = q.ilike('city', `%${parsed.city}%`);
  if (parsed?.category) q = q.ilike('category', `%${parsed.category}%`);
  if (parsed?.openNow === true) q = q.eq('is_open_now', true);

  const { data, error } = await q;
  if (error) throw error;

  return NextResponse.json({ intent: parsed || null, results: data || [] });
});


