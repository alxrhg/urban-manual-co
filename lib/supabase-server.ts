import { createClient } from '@supabase/supabase-js';

/**
 * Client-side: Uses anon key + user JWT (RLS enforced)
 * Use this in client components
 */
export function createClientComponentClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
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
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This is required for AI recommendation generation.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

