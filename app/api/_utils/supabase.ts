import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createUnauthorizedError } from '@/lib/errors';

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

export async function requireUser(request: NextRequest) {
  const supabase = resolveSupabaseClient();

  if (!supabase) {
    throw createUnauthorizedError('Supabase client is not configured');
  }

  const authHeader = request.headers.get('authorization');
  let accessToken: string | undefined;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    accessToken = authHeader.slice('bearer '.length).trim();
  }

  if (!accessToken) {
    const cookieStore = cookies();
    accessToken = cookieStore.get('sb-access-token')?.value;

    if (!accessToken) {
      const supabaseAuthCookie = cookieStore.get('supabase-auth-token')?.value;
      if (supabaseAuthCookie) {
        try {
          const parsed = JSON.parse(supabaseAuthCookie);
          accessToken = parsed?.currentSession?.access_token;
        } catch (error) {
          console.warn('[Supabase Auth] Failed to parse supabase-auth-token cookie', error);
        }
      }
    }
  }

  if (!accessToken) {
    throw createUnauthorizedError();
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw createUnauthorizedError();
  }

  return { supabase, user };
}
