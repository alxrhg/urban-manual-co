/**
 * Supabase Server-Side Clients
 * 
 * For use in Server Components, Server Actions, and API Routes.
 * Handles cookies properly for Next.js App Router.
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import {
  getSupabaseConfigOrThrow,
  logSupabaseConfigErrorOnce,
  SupabaseConfigError,
} from './config';

/**
 * Create Supabase server client for Server Components and API Routes
 * 
 * This client respects RLS and uses the user's session from cookies.
 * Use this for most server-side operations.
 */
export async function createServerClient() {
  try {
    const config = getSupabaseConfigOrThrow();
    const cookieStore = await cookies();

    return createSSRServerClient(config.url, config.anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // Cookies might be read-only in some contexts (e.g., middleware)
            // This is expected and safe to ignore
          }
        },
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      logSupabaseConfigErrorOnce('server', error);
    }

    throw error;
  }
}

/**
 * Create Supabase service role client
 * 
 * This client bypasses RLS and should ONLY be used in:
 * - Server-side API routes that need admin access
 * - Background jobs
 * - Admin operations
 * 
 * NEVER expose this to the client!
 */
export function createServiceRoleClient() {
  try {
    const config = getSupabaseConfigOrThrow({ requireServiceRole: true });

    return createClient(config.url, config.serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      logSupabaseConfigErrorOnce('service-role', error);
    }

    throw error;
  }
}

