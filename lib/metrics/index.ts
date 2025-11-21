'use server';

import { SupabaseClient, createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL as string | undefined;
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) as
  | string
  | undefined;

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient() {
  if (!url || !key) {
    throw new Error('Missing server-side Supabase credentials');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key);
  }

  return supabaseClient;
}

export type ContentMetricEvent =
  | 'click'
  | 'dwell'
  | 'scroll'
  | 'vector_failure'
  | 'vector_fallback';

export async function trackContentMetric(event: ContentMetricEvent, payload: any) {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('content_metrics').insert({ event, payload, created_at: new Date().toISOString() });
  } catch {}
}


