import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceMonitor } from '@/lib/discovery-engine/performance';
import { getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { getFeatureFlags, getABTestAssignment } from '@/lib/discovery-engine/feature-flags';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/discovery/monitoring/status
 * Get overall Discovery Engine status and configuration
 *
 * Response includes:
 * - enabled: Whether USE_DISCOVERY_ENGINE=true
 * - available: Whether Discovery Engine is fully configured and ready
 * - featureFlags: All feature flags
 * - performance: Performance metrics
 * - cache: Cache statistics
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const flags = getFeatureFlags();
  const monitor = getPerformanceMonitor();
  const cache = getDiscoveryEngineCache();
  const discoveryEngine = getDiscoveryEngineService();

  // Check if Discovery Engine is enabled and available
  const enabled = flags.useDiscoveryEngine;
  const available = enabled && discoveryEngine.isAvailable();

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
    enabled,
    available,
    status: available ? 'ready' : enabled ? 'misconfigured' : 'disabled',
    featureFlags: flags,
    performance: {
      lastHour: stats,
    },
    cache: cacheStats,
    abTestAssignment,
    timestamp: new Date().toISOString(),
  });
});

