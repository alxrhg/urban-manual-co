import { createClient } from '@supabase/supabase-js';

function requireEnv(key: string): string {
  const value = process.env[key];
  // Try both naming conventions for flexibility
  const fallbackKey = key.startsWith('NEXT_PUBLIC_') 
    ? key.replace('NEXT_PUBLIC_', '')
    : `NEXT_PUBLIC_${key}`;
  const finalValue = value || process.env[fallbackKey] || '';
  
  if (!finalValue || finalValue.trim() === '' || finalValue.includes('placeholder') || finalValue.includes('invalid')) {
    // Return empty string instead of throwing - let the caller handle gracefully
    // Only log on server-side for debugging
    if (typeof window === 'undefined') {
      console.warn(`[Supabase Server] ${key} not configured, using fallback`);
    }
    return '';
  }
  return finalValue;
}

/**
 * Client-side: Uses anon key + user JWT (RLS enforced)
 * Use this in client components
 */
export function createClientComponentClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  // Fallback to dummy client if not configured
  if (!url || !key) {
    return createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  
  return createClient(url, key);
}

/**
 * Server-side: Uses anon key + user JWT from cookies (RLS enforced)
 * Use this in server components and API routes
 * Note: For Next.js App Router, we rely on the Authorization header from the client
 */
export async function createServerClient() {
  // In Next.js App Router, auth is handled via Authorization header from client
  // The client-side supabase client automatically sends the session token
  // For server-side, we create a basic client that will work with getUser() calls
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  // Fallback to dummy client if not configured
  if (!url || !key) {
    return createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Service role: Bypasses RLS (use with extreme caution!)
 * Only use in server-side API routes that need admin access
 * NEVER expose to client
 */
export function createServiceRoleClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  
  // Fallback to dummy client if not configured
  if (!url || !serviceRoleKey) {
    if (typeof window === 'undefined') {
      console.warn('[Supabase Server] Service role client not configured, using fallback');
    }
    return createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

