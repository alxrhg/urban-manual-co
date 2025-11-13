/**
 * Supabase Client-Side Client
 * 
 * For use in Client Components only.
 * Handles authentication, session persistence, and RLS.
 */

import { createBrowserClient } from '@supabase/ssr';

import {
  getSupabaseConfigOrThrow,
  logSupabaseConfigErrorOnce,
  SupabaseConfigError,
} from './config';

/**
 * Create Supabase browser client
 * This is the main client for client-side components
 */
export function createClient() {
  try {
    const config = getSupabaseConfigOrThrow();

    return createBrowserClient(config.url, config.anonKey, {
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
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
      logSupabaseConfigErrorOnce('client', error);
    }

    throw error;
  }
}
