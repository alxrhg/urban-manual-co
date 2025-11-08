/**
 * Supabase Client-Side Client
 * 
 * For use in Client Components only.
 * Handles authentication, session persistence, and RLS.
 */

import { createBrowserClient } from '@supabase/ssr';

/**
 * Get Supabase URL from environment variables
 * Supports both NEXT_PUBLIC_ and non-prefixed variants
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
function getSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
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
  if (key.length < 20) return false; // Keys are typically much longer
  return true;
}

/**
 * Create Supabase browser client
 * This is the main client for client-side components
 */
export function createClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!isValidConfig(url, key)) {
    // In development, log helpful error
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.warn('[Supabase] Missing or invalid configuration:', {
        hasUrl: !!url,
        hasKey: !!key,
        urlPreview: url ? url.substring(0, 30) + '...' : 'missing',
        keyLength: key.length,
      });
      console.warn('[Supabase] Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or PUBLISHABLE_KEY)');
    }

    // Return a dummy client that won't crash the app
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {
            // No-op
          },
        },
      }
    );
  }

  return createBrowserClient(url, key, {
    cookies: {
      getAll() {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return [];
        }
        return document.cookie.split('; ').map(cookie => {
          const [name, ...rest] = cookie.split('=');
          return { name, value: rest.join('=') };
        });
      },
      setAll(cookiesToSet) {
        // Check if we're in a browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          return;
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = `${name}=${value}; path=${options?.path || '/'}; ${
            options?.maxAge ? `max-age=${options.maxAge};` : ''
          } ${options?.domain ? `domain=${options.domain};` : ''} ${
            options?.sameSite ? `samesite=${options.sameSite};` : ''
          } ${options?.secure ? 'secure;' : ''}`;
        });
      },
    },
  });
}

