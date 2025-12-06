/**
 * Supabase Client Exports
 *
 * Main entry point for Supabase clients.
 * Re-exports all client creation functions.
 */

import { createClient } from './client';

// Client-side (browser)
export { createClient as createBrowserClient } from './client';

// Server-side
export { createServerClient, createServiceRoleClient } from './server';

// Middleware
export { createClient as createMiddlewareClient } from './middleware';

// Singleton client for backward compatibility with `import { supabase } from '@/lib/supabase'`
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient();
  }
  return supabaseInstance;
}

export const supabase = getSupabase();

