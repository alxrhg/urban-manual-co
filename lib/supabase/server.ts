/**
 * Supabase Server-Side Clients
 * 
 * For use in Server Components, Server Actions, and API Routes.
 * Handles cookies properly for Next.js App Router.
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Get Supabase URL from environment variables
 */
function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  );
}

/**
 * Get Supabase anon/publishable key from environment variables
 * Supports both new (publishable) and legacy (anon) key names
 */
function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  );
}

/**
 * Get Supabase service role/secret key from environment variables
 * Supports both new (secret) and legacy (service_role) key names
 */
function getSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

/**
 * Validate Supabase configuration
 */
function isValidConfig(url: string, key: string): boolean {
  if (!url || !key) return false;
  if (url.includes('placeholder') || url.includes('invalid')) return false;
  if (key.includes('placeholder') || key.includes('invalid')) return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  if (key.length < 20) return false;
  return true;
}

/**
 * Create Supabase server client for Server Components and API Routes
 * 
 * This client respects RLS and uses the user's session from cookies.
 * Use this for most server-side operations.
 */
export async function createServerClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!isValidConfig(url, key)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase Server] Missing or invalid configuration');
    }
    
    // Return a dummy client
    const cookieStore = await cookies();
    return createSSRServerClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op
          },
        },
      }
    );
  }

  const cookieStore = await cookies();

  return createSSRServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
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
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!isValidConfig(url, key)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase] Service role client not configured');
    }
    
    // Return a dummy client using supabase-js (service role doesn't need SSR cookie handling)
    return createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  // Service role client doesn't need cookie handling - use regular createClient
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

