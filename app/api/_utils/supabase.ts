import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientLike = SupabaseClient<any, any, any>;

export function resolveSupabaseClient(): SupabaseClientLike | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient<any, any, any>(url, key);
}
