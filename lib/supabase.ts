import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(key: string): string {
  // In Next.js, NEXT_PUBLIC_ variables are inlined at build time
  // Access them directly from process.env (which Next.js replaces at build time)
  const value = process.env[key];

  // Check if value is missing, empty, or a placeholder
  if (!value || value.trim() === '' || value.includes('placeholder') || value.includes('invalid')) {
    // Only log warnings, don't throw errors
    // This allows the app to continue with a fallback client
    return '';
  }

  return value;
}

// Get environment variables - Next.js inlines NEXT_PUBLIC_ vars at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate that we have valid values (not empty, not placeholders)
const isValidUrl = supabaseUrl && 
  supabaseUrl.trim() !== '' && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('invalid') &&
  supabaseUrl.startsWith('http');

const isValidKey = supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' && 
  !supabaseAnonKey.includes('placeholder') && 
  !supabaseAnonKey.includes('invalid');

let supabase: ReturnType<typeof createClient>;

try {
  if (isValidUrl && isValidKey) {
    // Valid configuration - create real Supabase client
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'sb-auth-token',
      }
    });
  } else {
    // Invalid or missing configuration - create dummy client (silent fallback)
    supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (error) {
  // Fallback on any error
  supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export { supabase };
