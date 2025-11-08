import { createClient } from '@supabase/supabase-js';

function requireEnv(key: string): string {
  const value = process.env[key];
  
  // Try multiple naming conventions for flexibility
  // 1. Exact match
  // 2. NEXT_PUBLIC_ prefix/suffix swap
  // 3. For anon/publishable keys, try both new and legacy names
  let finalValue = value || '';
  
  if (!finalValue) {
    // Try NEXT_PUBLIC_ prefix/suffix swap
    const fallbackKey = key.startsWith('NEXT_PUBLIC_') 
      ? key.replace('NEXT_PUBLIC_', '')
      : `NEXT_PUBLIC_${key}`;
    finalValue = process.env[fallbackKey] || '';
  }
  
  // For anon/publishable keys, try both new and legacy naming
  if (!finalValue && (key.includes('ANON') || key.includes('PUBLISHABLE'))) {
    if (key.includes('ANON')) {
      // Legacy anon key - try new publishable key names
      finalValue = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                   process.env.SUPABASE_PUBLISHABLE_KEY || '';
    } else if (key.includes('PUBLISHABLE')) {
      // New publishable key - try legacy anon key names
      finalValue = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                   process.env.SUPABASE_ANON_KEY || '';
    }
  }
  
  // For service_role/secret keys, try both new and legacy naming
  if (!finalValue && (key.includes('SERVICE_ROLE') || key.includes('SECRET'))) {
    if (key.includes('SERVICE_ROLE')) {
      // Legacy service_role key - try new secret key names
      finalValue = process.env.SUPABASE_SECRET_KEY || '';
    } else if (key.includes('SECRET')) {
      // New secret key - try legacy service_role key names
      finalValue = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    }
  }
  
  if (!finalValue || finalValue.trim() === '' || finalValue.includes('placeholder') || finalValue.includes('invalid')) {
    // Log error when env var is actually missing
    if (typeof window !== 'undefined') {
      console.error(`❌ Missing required environment variable: ${key}. Please set ${key} in your environment variables.`);
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
    console.error('❌ Supabase client component: Missing configuration. URL:', !!url, 'Key:', !!key);
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
    console.error('❌ Supabase server client: Missing configuration. URL:', !!url, 'Key:', !!key);
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
  // Try new secret key first, then fall back to legacy service_role key
  const serviceRoleKey = 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    '';
  
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

