import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    // Don't throw on server - allow graceful degradation
    // The client will be created with invalid URL and errors will be suppressed
    if (typeof window === 'undefined') {
      // Server-side: log warning but don't throw
      console.warn(
        `⚠️ Missing required environment variable: ${key}. ` +
        `Please set ${key} in your .env.local file or environment variables. ` +
        `The app will continue with a dummy Supabase client.`
      );
      return '';
    }
    // Client-side: log error but continue
    console.error(
      `❌ Missing required environment variable: ${key}\n` +
      `This variable must be set during build time in Vercel.\n` +
      `Please ensure ${key} is set in Vercel environment variables and redeploy.`
    );
    return '';
  }

  if (value.includes('placeholder') || value.includes('invalid')) {
    // Don't throw on server - allow graceful degradation
    if (typeof window === 'undefined') {
      // Server-side: log warning but don't throw
      console.warn(
        `⚠️ Invalid environment variable: ${key} contains placeholder/invalid value. ` +
        `Please set a real ${key} value. The app will continue with a dummy Supabase client.`
      );
      return '';
    }
    // Client-side: log error but continue
    console.error(`❌ ${key} contains placeholder/invalid value. Please set a real Supabase URL in Vercel and redeploy.`);
    return '';
  }
  return value;
}

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('invalid') &&
  !supabaseAnonKey.includes('placeholder') &&
  !supabaseAnonKey.includes('invalid');

let supabase: ReturnType<typeof createClient>;

try {
  if (!isSupabaseConfigured) {
    if (typeof window !== 'undefined') {
      console.error(
        '❌ Supabase configuration is missing or invalid.\n' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables and redeploy.\n' +
        'Note: NEXT_PUBLIC_ variables are inlined at build time, so you must rebuild after setting them.'
      );
    }
    // Create a dummy client that will fail gracefully
    // Network errors will be suppressed by the global error handler in app/page.tsx
    supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  } else {
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
  }
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  // Create a dummy client that will fail gracefully
  // Network errors will be suppressed by the global error handler in app/page.tsx
  supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Export a helper to check if Supabase is configured
// This checks both the build-time config and the actual client URL
export const isSupabaseAvailable = () => {
  // Check build-time configuration
  if (!isSupabaseConfigured) {
    return false;
  }
  
  // Also check the actual client URL at runtime (for client-side)
  if (typeof window !== 'undefined') {
    try {
      // Access the Supabase client's URL through its internal structure
      const clientUrl = (supabase as any).supabaseUrl;
      if (!clientUrl || clientUrl.includes('invalid') || clientUrl.includes('placeholder')) {
        return false;
      }
    } catch (e) {
      // If we can't check, assume it's not available
      return false;
    }
  }
  
  return true;
};

export { supabase };
