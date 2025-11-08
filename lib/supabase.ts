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
    console.error(
      `❌ Missing required environment variable: ${key}\n` +
      `This variable must be set during build time in Vercel.\n` +
      `Please ensure ${key} is set in Vercel environment variables and redeploy.`
    );
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
    console.error(`❌ ${key} contains placeholder/invalid value. Please set a real Supabase URL in Vercel and redeploy.`);
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
      console.error(
        '❌ Supabase configuration is missing or invalid.\n' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables and redeploy.\n' +
        'Note: NEXT_PUBLIC_ variables are inlined at build time, so you must rebuild after setting them.'
      );
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
