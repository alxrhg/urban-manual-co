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
    // Client-side: log warning but don't spam console (errors are suppressed by global handler)
    // Only log once to avoid console spam
    if (!(window as any).__supabase_warned) {
      console.warn(
        `⚠️ Supabase not configured: ${key} is missing.\n` +
        `The app will work but without database features.\n` +
        `Set ${key} in Vercel environment variables to enable full functionality.`
      );
      (window as any).__supabase_warned = true;
    }
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
    // Client-side: log warning but don't spam console
    if (!(window as any).__supabase_warned) {
      console.warn(`⚠️ Supabase not configured: ${key} contains placeholder/invalid value. Set a real value in Vercel to enable database features.`);
      (window as any).__supabase_warned = true;
    }
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
      // Only log once to avoid console spam
      if (!(window as any).__supabase_warned) {
        console.warn(
          '⚠️ Supabase not configured. The app will work but without database features.\n' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel to enable full functionality.'
        );
        (window as any).__supabase_warned = true;
      }
    }
    // Create a dummy client that will fail gracefully
    // Use a non-existent but valid URL format to prevent actual network requests
    // Network errors will be suppressed by the global error handler in app/page.tsx
    supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
      auth: { 
        autoRefreshToken: false, 
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {},
        fetch: async (url, options = {}) => {
          // Intercept all fetch requests and return empty response when Supabase is not configured
          // This prevents actual network requests from being made
          return new Response(JSON.stringify({ data: null, error: { message: 'Supabase not configured' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
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
    auth: { 
      autoRefreshToken: false, 
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {},
      fetch: async (url, options = {}) => {
        // Intercept all fetch requests and return empty response when Supabase is not configured
        return new Response(JSON.stringify({ data: null, error: { message: 'Supabase not configured' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  });
}

// Export a helper to check if Supabase is configured
// This checks the build-time configuration (env vars are inlined at build time)
export const isSupabaseAvailable = () => {
  // Check build-time configuration - this is the source of truth
  // NEXT_PUBLIC_ variables are inlined at build time, so if they're set correctly
  // during build, isSupabaseConfigured will be true
  return isSupabaseConfigured;
};

export { supabase };
