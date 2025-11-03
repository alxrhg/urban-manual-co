import { createClient } from '@supabase/supabase-js';

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) as string;
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;
const supabase = createClient(url, key);

export async function trackContentMetric(event: 'click'|'dwell'|'scroll', payload: any) {
  try {
    await supabase.from('content_metrics').insert({ event, payload, created_at: new Date().toISOString() });
  } catch {}
}


