import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Deployment Check Endpoint
 * 
 * This endpoint is called by Vercel after deployment to verify the deployment is healthy.
 * It performs actual connection tests, not just environment variable checks.
 * 
 * Configure in Vercel Dashboard > Project Settings > Checks
 * Or use Vercel API to create a check that calls this endpoint
 */
export async function GET() {
  const startTime = Date.now();
  const results: Record<string, { status: 'pass' | 'fail'; message: string; duration?: number }> = {};

  try {
    // 1. Environment Variables Check
    const envChecks = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      GOOGLE_MAPS_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    };

    const envPassing = Object.values(envChecks).every(Boolean);
    results.environment = {
      status: envPassing ? 'pass' : 'fail',
      message: envPassing
        ? 'All required environment variables are set'
        : `Missing: ${Object.entries(envChecks).filter(([_, v]) => !v).map(([k]) => k).join(', ')}`,
    };

    if (!envPassing) {
      return NextResponse.json({
        status: 'failed',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        results,
        message: 'Environment variables check failed',
      }, { status: 503 });
    }

    // 2. Supabase Connection Test
    try {
      const supabase = await createServerClient();
      const testStart = Date.now();
      
      // Test basic query
      const { data, error } = await supabase
        .from('destinations')
        .select('id')
        .limit(1);

      const testDuration = Date.now() - testStart;

      if (error) {
        results.supabase = {
          status: 'fail',
          message: `Connection failed: ${error.message}`,
          duration: testDuration,
        };
      } else {
        results.supabase = {
          status: 'pass',
          message: 'Successfully connected to Supabase',
          duration: testDuration,
        };
      }
    } catch (error: any) {
      results.supabase = {
        status: 'fail',
        message: `Connection error: ${error.message || 'Unknown error'}`,
      };
    }

    // 3. Critical API Routes Check (optional - can be expanded)
    // This ensures key routes are accessible
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
      const healthCheckStart = Date.now();
      const healthResponse = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000),
      });

      const healthDuration = Date.now() - healthCheckStart;
      const healthData = await healthResponse.json();

      results.health_endpoint = {
        status: healthData.status === 'healthy' ? 'pass' : 'fail',
        message: healthData.message || 'Health endpoint responded',
        duration: healthDuration,
      };
    } catch (error: any) {
      results.health_endpoint = {
        status: 'fail',
        message: `Health endpoint check failed: ${error.message || 'Timeout or connection error'}`,
      };
    }

    // Determine overall status
    const allPassing = Object.values(results).every(r => r.status === 'pass');
    const overallStatus = allPassing ? 'passed' : 'failed';

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      results,
      message: allPassing
        ? 'All deployment checks passed'
        : 'Some deployment checks failed',
    }, {
      status: allPassing ? 200 : 503,
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'failed',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      results,
      error: error.message || 'Unknown error during deployment check',
    }, { status: 503 });
  }
}

