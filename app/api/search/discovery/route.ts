import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';
import { getFeatureFlags, getABTestVariant } from '@/lib/discovery-engine/feature-flags';
import { withCache, getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { withPerformanceMonitoring } from '@/lib/discovery-engine/performance';

async function searchDiscovery(request: NextRequest, body?: any) {
  try {
    const { searchParams } = new URL(request.url);
    const query = body?.query || searchParams.get('query');
    const city = body?.filters?.city || searchParams.get('city') || undefined;
    const category = body?.filters?.category || searchParams.get('category') || undefined;
    const priceLevel = body?.filters?.priceLevel || (searchParams.get('priceLevel') ? parseInt(searchParams.get('priceLevel')!) : undefined);
    const minRating = body?.filters?.minRating || (searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined);
    const pageSize = body?.pageSize || (searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20);
    const pageToken = body?.pageToken || searchParams.get('pageToken') || undefined;
    let userId = body?.userId || searchParams.get('userId') || undefined;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const discoveryEngine = getDiscoveryEngineService();
    const flags = getFeatureFlags();

    const isAvailable = discoveryEngine.isAvailable();

    if (!isAvailable) {
      const projectEnvSet = Boolean(
        process.env.GOOGLE_CLOUD_PROJECT_ID ||
          process.env.DISCOVERY_ENGINE_PROJECT_ID ||
          process.env.GCP_PROJECT_ID
      );
      const locationEnvSet = Boolean(
        process.env.GOOGLE_CLOUD_LOCATION || process.env.DISCOVERY_ENGINE_LOCATION
      );
      const dataStoreEnvSet = Boolean(process.env.DISCOVERY_ENGINE_DATA_STORE_ID);

      console.debug('[Discovery Engine API] Status check:', {
        isAvailable,
        isConfigured: discoveryEngine.hasConfiguration(),
        useDiscoveryEngine: flags.useDiscoveryEngine,
        projectId: projectEnvSet ? 'set' : 'missing',
        location: locationEnvSet ? 'set' : 'missing',
        dataStoreId: dataStoreEnvSet ? 'set' : 'missing',
      });
      console.debug('[Discovery Engine API] Discovery Engine is not available - returning 503 (expected fallback)');
      return NextResponse.json(
        {
          error: 'Discovery Engine is not configured',
          fallback: true,
          source: 'fallback',
        },
        { status: 503 }
      );
    }

    // Get user ID from session if not provided
    if (!userId) {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      } catch (error) {
        // User not authenticated - continue without personalization
      }
    }

    // A/B testing: Check if user should use Discovery Engine or fallback
    let useDiscoveryEngine = flags.useDiscoveryEngine;
    if (userId && flags.abTests.some((t) => t.name === 'search_quality' && t.enabled)) {
      const variant = getABTestVariant(userId, 'search_quality');
      useDiscoveryEngine = variant === 'discovery_engine';
    }
    
    console.debug('[Discovery Engine API] Request:', {
      query,
      userId: userId || 'anonymous',
      useDiscoveryEngine,
      pageSize: pageSize || 20,
    });

    // Generate cache key
    const cache = getDiscoveryEngineCache();
    const cacheKey = cache.generateSearchKey(query, { city, category, priceLevel, minRating }, userId);

    // Perform search with caching and performance monitoring
    const searchStartTime = Date.now();
    let results;
    try {
      results = await withPerformanceMonitoring(
        '/api/search/discovery',
        request.method,
        () =>
          withCache(
            cacheKey,
            () =>
              discoveryEngine.search(query, {
                userId: userId,
                pageSize: pageSize || 20,
                pageToken,
                filters: { city, category, priceLevel, minRating },
                boostSpec: [
                  {
                    condition: 'michelin_stars > 0',
                    boost: 1.5,
                  },
                  {
                    condition: 'rating >= 4.5',
                    boost: 1.2,
                  },
                ],
              }),
            5 * 60 * 1000 // 5 minute cache
          )
      );
    } catch (searchError: any) {
      console.warn('[Discovery Engine API] Search failed, returning fallback response.', searchError);
      return NextResponse.json(
        {
          error: 'Discovery Engine search unavailable',
          fallback: true,
          source: 'fallback',
        },
        { status: 503 }
      );
    }
    const searchElapsed = Date.now() - searchStartTime;

    console.log('[Discovery Engine API] Search completed:', {
      resultCount: results.results.length,
      totalSize: results.totalSize,
      elapsed: `${searchElapsed}ms`,
      source: 'discovery_engine',
      fallback: false,
    });

    // Track search event for personalization
    if (userId) {
      discoveryEngine.trackEvent({
        userId: userId,
        eventType: 'search',
        searchQuery: query,
      }).catch((error) => {
        console.warn('Failed to track search event:', error);
      });
    }

    return NextResponse.json({
      results: results.results,
      totalSize: results.totalSize,
      nextPageToken: results.nextPageToken,
      query,
      source: 'discovery_engine',
      fallback: false,
    });
  } catch (error: any) {
    console.error('Discovery Engine search error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}


/**
 * POST /api/search/discovery
 * Search destinations using Google Discovery Engine
 * 
 * Query parameters:
 * - query: Search query string (required)
 * - city: Filter by city (optional)
 * - category: Filter by category (optional)
 * - priceLevel: Filter by max price level (optional)
 * - minRating: Filter by minimum rating (optional)
 * - pageSize: Number of results (default: 20)
 * - pageToken: Pagination token (optional)
 * 
 * Body:
 * - userId: User ID for personalization (optional)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return searchDiscovery(request, body);
}

/**
 * GET /api/search/discovery
 * Search destinations using Google Discovery Engine (GET version)
 */
export async function GET(request: NextRequest) {
  return searchDiscovery(request);
}
