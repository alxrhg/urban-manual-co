import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Health Check Endpoint
 * 
 * Performs basic health checks including environment variables and optional connection tests.
 * Use /api/deployment-check for comprehensive deployment verification.
 */
export async function GET() {
  const checks = {
    DATABASE_URL: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    GOOGLE_MAPS_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    GOOGLE_AI_API_KEY: !!(process.env.GOOGLE_AI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY),
  };

  const allPassing = Object.values(checks).every(Boolean);

  // Optionally test Supabase connection (non-blocking)
  let supabaseConnection = null;
  if (allPassing && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createServerClient();
      const { error } = await supabase
        .from('destinations')
        .select('id')
        .limit(1)
        .single();
      
      supabaseConnection = error ? { status: 'error', message: error.message } : { status: 'ok' };
    } catch (error: any) {
      supabaseConnection = { status: 'error', message: error.message };
    }
  }

  return NextResponse.json({
    status: allPassing ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks,
    ...(supabaseConnection && { supabase: supabaseConnection }),
    message: allPassing
      ? 'All environment variables are configured'
      : 'Some environment variables are missing. Check Vercel dashboard > Settings > Environment Variables',
  }, {
    status: allPassing ? 200 : 503,
  });
}
