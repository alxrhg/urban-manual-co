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
// Support both legacy (anon) and new (publishable) key naming conventions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
// Try new publishable key first, then fall back to legacy anon key
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  '';

// Debug: Log what we're actually getting (only in development, and only first few chars for security)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[Supabase Debug] Env check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0,
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'empty',
    // Don't log key preview for security
  });
}

// Validate that we have valid values (not empty, not placeholders)
const isValidUrl = supabaseUrl && 
  supabaseUrl.trim() !== '' && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('invalid') &&
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

const isValidKey = supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' && 
  !supabaseAnonKey.includes('placeholder') && 
  !supabaseAnonKey.includes('invalid') &&
  supabaseAnonKey.length > 20; // Anon keys are typically long strings

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
    // Invalid or missing configuration - log detailed error
    if (typeof window !== 'undefined') {
      const debugInfo: any = {
        urlStatus: isValidUrl ? 'valid' : (supabaseUrl ? 'invalid format' : 'missing'),
        keyStatus: isValidKey ? 'valid' : (supabaseAnonKey ? 'invalid format' : 'missing'),
      };
      
      // Only show values in development for debugging
      if (process.env.NODE_ENV === 'development') {
        debugInfo.urlValue = supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'not set';
        debugInfo.keyLength = supabaseAnonKey ? supabaseAnonKey.length : 0;
        debugInfo.urlStartsWithHttp = supabaseUrl?.startsWith('http');
        debugInfo.keyMinLength = supabaseAnonKey ? supabaseAnonKey.length > 20 : false;
      }
      
      console.error('❌ Supabase configuration error:', debugInfo);
      console.error('❌ This usually means env vars are not set or not accessible. Check:');
      console.error('   1. NEXT_PUBLIC_SUPABASE_URL is set in Vercel');
      console.error('   2. NEXT_PUBLIC_SUPABASE_ANON_KEY is set in Vercel');
      console.error('   3. Project was redeployed after setting env vars (NEXT_PUBLIC_ vars are inlined at build time)');
    }
    supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
} catch (error) {
  // Log actual errors when creating client fails
  if (typeof window !== 'undefined') {
    console.error('❌ Failed to create Supabase client:', error);
  }
  supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export { supabase };
