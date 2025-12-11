/**
 * Supabase Client for MCP Server
 *
 * Creates a service role client for server-side operations.
 * This client bypasses RLS for admin-level data access.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

/**
 * Get Supabase URL from environment variables
 */
function getSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  );
}

/**
 * Get Supabase service role key from environment variables
 */
function getSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

/**
 * Create a service role Supabase client
 *
 * This client bypasses Row Level Security and should be used
 * carefully for server-side operations only.
 */
export function createServiceClient(): SupabaseClient {
  if (serviceClient) {
    return serviceClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    console.error("[MCP Server] Missing Supabase configuration");
    console.error("Required environment variables:");
    console.error("  - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
    throw new Error("Missing Supabase configuration");
  }

  serviceClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceClient;
}

/**
 * Reset the cached client (useful for testing)
 */
export function resetClient(): void {
  serviceClient = null;
}
