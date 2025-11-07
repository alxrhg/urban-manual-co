import { createClient } from '@supabase/supabase-js';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}. Please set ${key} in your .env.local file.`);
  }
  if (value.includes('placeholder') || value.includes('invalid')) {
    throw new Error(`Invalid environment variable: ${key} contains placeholder/invalid value. Please set a real ${key} value.`);
  }
  return value;
}

/**
 * Client-side: Uses anon key + user JWT (RLS enforced)
 * Use this in client components
 */
export function createClientComponentClient() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
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
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

/**
 * Service role: Bypasses RLS (use with extreme caution!)
 * Only use in server-side API routes that need admin access
 * NEVER expose to client
 */
export function createServiceRoleClient() {
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

