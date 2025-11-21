/**
 * Supabase Server-Side Clients
 * 
 * For use in Server Components, Server Actions, and API Routes.
 * Handles cookies properly for Next.js App Router.
 */

import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {
  validateSupabaseUrl,
  validateSupabaseAnonKey, 
  validateSupabaseServiceRoleKey,
  formatValidationErrors
} from './validation';

/**
 * Determine if placeholder clients should be allowed.
 *
 * - Always disallowed in production (runtime or Vercel production).
 * - Allowed in development/preview by default, but can be toggled via
 *   SUPABASE_ALLOW_PLACEHOLDER_CLIENTS.
 */
function shouldAllowPlaceholderClients(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  const flag = process.env.SUPABASE_ALLOW_PLACEHOLDER_CLIENTS;

  // Never allow placeholders in production environments
  if (nodeEnv === 'production' || vercelEnv === 'production') {
    return false;
  }

  // Explicit opt-in/out via flag
  if (flag === 'true') return true;
  if (flag === 'false') return false;

  // Default: allow during development or preview for smoother DX
  return nodeEnv === 'development' || vercelEnv === 'preview' || vercelEnv === 'development';
}

function throwConfigError(prefix: string, errorMessage: string): never {
  const action =
    'Set SUPABASE_ALLOW_PLACEHOLDER_CLIENTS=true in development/preview or provide valid Supabase environment variables.';
  throw new Error(`${prefix} Supabase configuration invalid. ${errorMessage}\n${action}`);
}

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
 * Supports both new (publishable) and legacy (anon) key names
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
 * Get Supabase service role/secret key from environment variables
 * Supports both new (secret) and legacy (service_role) key names
 */
function getSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );
}

/**
 * Validate Supabase configuration with strict checks
 */
function validateConfig(url: string, key: string): { valid: boolean; errors: string[] } {
  const urlValidation = validateSupabaseUrl(url);
  const keyValidation = validateSupabaseAnonKey(key);
  
  const allErrors = [...urlValidation.errors, ...keyValidation.errors];
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Validate service role key configuration
 */
function validateServiceRoleConfig(url: string, key: string): { valid: boolean; errors: string[] } {
  const urlValidation = validateSupabaseUrl(url);
  const keyValidation = validateSupabaseServiceRoleKey(key);
  
  const allErrors = [...urlValidation.errors, ...keyValidation.errors];
  
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * Create Supabase server client for Server Components and API Routes
 * 
 * This client respects RLS and uses the user's session from cookies.
 * Use this for most server-side operations.
 * 
 * @throws {Error} In production if configuration is invalid
 */
export async function createServerClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  const validation = validateConfig(url, key);
  const allowPlaceholder = shouldAllowPlaceholderClients();

  if (!validation.valid) {
    const errorMessage = formatValidationErrors(validation.errors);

    if (!allowPlaceholder) {
      throwConfigError('[Supabase Server]', errorMessage);
    }

    console.error('[Supabase Server] Configuration Validation Failed:');
    console.error(errorMessage);
    console.warn(
      '[Supabase Server] Using placeholder client. Fix configuration to enable Supabase features or disable placeholders via SUPABASE_ALLOW_PLACEHOLDER_CLIENTS=false.'
    );

    // Return placeholder client (allows boot to proceed in dev/preview)
    const cookieStore = await cookies();
    return createSSRServerClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // No-op
          },
        },
      }
    );
  }

  const cookieStore = await cookies();

  return createSSRServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Cookies might be read-only in some contexts (e.g., middleware)
          // This is expected and safe to ignore
        }
      },
    },
  });
}

/**
 * Create Supabase service role client
 * 
 * This client bypasses RLS and should ONLY be used in:
 * - Server-side API routes that need admin access
 * - Background jobs
 * - Admin operations
 * 
 * NEVER expose this to the client!
 * 
 * @throws {Error} In production if configuration is invalid
 */
export function createServiceRoleClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  const validation = validateServiceRoleConfig(url, key);
  const allowPlaceholder = shouldAllowPlaceholderClients();

  if (!validation.valid) {
    const errorMessage = formatValidationErrors(validation.errors);

    if (!allowPlaceholder) {
      throwConfigError('[Supabase Service Role]', errorMessage);
    }

    console.error('[Supabase Service Role] Configuration Validation Failed:');
    console.error(errorMessage);
    console.warn(
      '[Supabase Service Role] Using placeholder client. Fix configuration to enable admin operations or disable placeholders via SUPABASE_ALLOW_PLACEHOLDER_CLIENTS=false.'
    );

    // Return placeholder client (allows boot to proceed in dev/preview)
    return createClient(
      'https://placeholder.supabase.co',
      'placeholder-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  // Service role client doesn't need cookie handling - use regular createClient
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

