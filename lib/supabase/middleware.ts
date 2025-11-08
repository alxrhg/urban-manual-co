/**
 * Supabase Middleware Client
 * 
 * For use in Next.js middleware only.
 * Handles authentication redirects and cookie management.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
 * Create Supabase client for middleware
 * 
 * Middleware runs on the edge, so we need a special client setup.
 */
export function createClient(request: NextRequest) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key || url.includes('placeholder') || key.includes('placeholder')) {
    // Return a dummy client for middleware
    let dummyResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    return {
      supabase: createServerClient(
        'https://placeholder.supabase.co',
        'placeholder-key',
        {
          cookies: {
            getAll() {
              return [];
            },
            setAll() {
              // No-op in middleware
            },
          },
        }
      ),
      response: dummyResponse,
    };
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response };
}

