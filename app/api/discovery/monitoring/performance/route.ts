import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceMonitor } from '@/lib/discovery-engine/performance';
import { getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { getFeatureFlags, getABTestAssignment } from '@/lib/discovery-engine/feature-flags';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/discovery/monitoring/performance
 * Get performance metrics for Discovery Engine
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeWindow = searchParams.get('timeWindow') ? parseInt(searchParams.get('timeWindow')!) : undefined;
    const endpoint = searchParams.get('endpoint') || undefined;

    const monitor = getPerformanceMonitor();
    const cache = getDiscoveryEngineCache();

    const stats = monitor.getStats(timeWindow);
    const cacheStats = cache.getStats();

    let endpointMetrics;
    if (endpoint) {
      endpointMetrics = monitor.getMetricsByEndpoint(endpoint, timeWindow);
    }

    return NextResponse.json({
      performance: stats,
      cache: cacheStats,
      endpoint: endpointMetrics,
      timeWindow: timeWindow || 'all',
    });
  } catch (error: any) {
    console.error('Performance monitoring error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get performance metrics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/discovery/monitoring/status
 * Get overall Discovery Engine status and configuration
 */
export async function status(request: NextRequest) {
  try {
    const flags = getFeatureFlags();
    const monitor = getPerformanceMonitor();
    const cache = getDiscoveryEngineCache();

    // Get user ID for A/B test assignment
    let userId: string | undefined;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch (error) {
      // Not authenticated
    }

    const stats = monitor.getStats(60 * 60 * 1000); // Last hour
    const cacheStats = cache.getStats();
    const abTestAssignment = userId ? getABTestAssignment(userId) : {};

    return NextResponse.json({
      featureFlags: flags,
      performance: {
        lastHour: stats,
      },
      cache: cacheStats,
      abTestAssignment,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Status monitoring error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export { status as GET };

