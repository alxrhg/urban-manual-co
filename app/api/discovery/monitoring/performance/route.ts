import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceMonitor } from '@/services/discovery/performance';
import { getDiscoveryEngineCache } from '@/services/discovery/cache';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/discovery/monitoring/performance
 * Get performance metrics for Discovery Engine
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
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
});


