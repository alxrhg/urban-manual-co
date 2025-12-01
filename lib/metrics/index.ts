import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy Supabase client to avoid build-time errors
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Support both new (publishable/secret) and legacy (anon/service_role) key naming
    const key =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase credentials for metrics');
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}

export type ContentMetricEvent =
  | 'click'
  | 'dwell'
  | 'scroll'
  | 'vector_failure'
  | 'vector_fallback';

export async function trackContentMetric(event: ContentMetricEvent, payload: any) {
  try {
    await getSupabase().from('content_metrics').insert({ event, payload, created_at: new Date().toISOString() });
  } catch {}
}


