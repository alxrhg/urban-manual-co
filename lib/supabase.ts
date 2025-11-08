import { createClient } from '@supabase/supabase-js';

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    const isServer = typeof window === 'undefined';
    if (isServer) {
      // Don't throw on server - allow graceful degradation
      console.warn(
        `⚠️ Missing required environment variable: ${key}. ` +
        `Please set ${key} in your .env.local file or environment variables. ` +
        `The app will continue with a dummy Supabase client.`
      );
      return '';
    }
    // Client-side: Only log once per variable to avoid console spam
    if (!(window as any).__supabaseEnvWarned) {
      (window as any).__supabaseEnvWarned = new Set();
    }
    if (!(window as any).__supabaseEnvWarned.has(key)) {
      (window as any).__supabaseEnvWarned.add(key);
      console.warn(
        `⚠️ Missing environment variable: ${key}. ` +
        `The app will continue with limited functionality. ` +
        `Set ${key} in Vercel environment variables and redeploy to enable full features.`
      );
    }
    return '';
  }

  if (value.includes('placeholder') || value.includes('invalid')) {
    const isServer = typeof window === 'undefined';
    if (isServer) {
      // Don't throw on server - allow graceful degradation
      console.warn(
        `⚠️ Invalid environment variable: ${key} contains placeholder/invalid value. ` +
        `Please set a real ${key} value. The app will continue with a dummy Supabase client.`
      );
      return '';
    }
    // Client-side: Only log once per variable to avoid console spam
    if (!(window as any).__supabaseEnvWarned) {
      (window as any).__supabaseEnvWarned = new Set();
    }
    if (!(window as any).__supabaseEnvWarned.has(key)) {
      (window as any).__supabaseEnvWarned.add(key);
      console.warn(
        `⚠️ Invalid environment variable: ${key}. ` +
        `Set a real ${key} value in Vercel and redeploy to enable full features.`
      );
    }
    return '';
  }
  return value;
}

const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let supabase: ReturnType<typeof createClient>;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      // Only log once to avoid console spam
      if (!(window as any).__supabaseConfigWarned) {
        (window as any).__supabaseConfigWarned = true;
        console.warn(
          '⚠️ Supabase configuration is missing or invalid. ' +
          'The app will continue with limited functionality. ' +
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables and redeploy to enable full features.'
        );
      }
    }
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
  supabase = createClient('https://invalid.supabase.co', 'invalid-key', {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export { supabase };
