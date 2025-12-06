/**
 * Supabase Client Exports
 *
 * Main entry point for Supabase clients.
 *
 * IMPORTANT: This file only exports client-safe code.
 * For server-side code, import directly from '@/lib/supabase/server'.
 */

import { createClient } from './client';

// Client-side (browser)
export { createClient as createBrowserClient } from './client';

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

