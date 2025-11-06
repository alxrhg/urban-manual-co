import { createClient } from '@supabase/supabase-js';

// ✅ SECURITY FIX: Fail fast in production if environment variables are missing
function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (!value) {
    // In production, throw error for missing required env vars
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}. Application cannot start without proper configuration.`);
    }

    // In development, warn and use default
    if (typeof window !== 'undefined') {
      console.warn(`⚠️  Missing ${key}, using ${defaultValue ? 'placeholder' : 'undefined'}`);
    }

    return defaultValue || '';
  }

  return value;
}

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder.supabase.co');
const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use PKCE flow (code exchange) instead of implicit flow (hash fragments)
    flowType: 'pkce',
    // Ensure storage is available for code verifier
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-auth-token',
  }
});
