import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { createServerClient } from '@/lib/supabase-server';
import { getFeatureFlags, getABTestVariant } from '@/lib/discovery-engine/feature-flags';
import { withCache, getDiscoveryEngineCache } from '@/lib/discovery-engine/cache';
import { withPerformanceMonitoring } from '@/lib/discovery-engine/performance';

// Track if we've already warned about Discovery Engine configuration
let hasWarnedAboutDiscoveryEngine = false;

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
  let body: any = null;
  try {
    body = await request.json();
    const { query, userId, filters, pageSize, pageToken } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const discoveryEngine = getDiscoveryEngineService();
    const flags = getFeatureFlags();
    
    // Check if Discovery Engine is available
    const isAvailable = discoveryEngine.isAvailable();
    
    if (!isAvailable) {
      // Discovery Engine is the primary search feature and must be configured
      // Log error in all environments to ensure configuration is noticed
      if (!hasWarnedAboutDiscoveryEngine) {
        console.error('[Discovery Engine API] ERROR: Discovery Engine is not configured. This is the primary search feature and must be set up.');
        console.error('[Discovery Engine API] Required environment variables: GOOGLE_CLOUD_PROJECT_ID, DISCOVERY_ENGINE_DATA_STORE_ID, and Google Cloud credentials');
        hasWarnedAboutDiscoveryEngine = true;
      }
      return NextResponse.json(
        { 
          results: [],
          totalSize: 0,
          query,
          source: 'error',
          fallback: true,
          error: 'Discovery Engine not configured',
          message: 'Discovery Engine is the primary search feature and must be configured. Please set up Google Cloud Discovery Engine.',
        },
        { status: 503 }
      );
    }

    // Get user ID from session if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id;
      } catch (error) {
        // User not authenticated - continue without personalization
      }
    }

    // A/B testing: Check if user should use Discovery Engine or fallback
    let useDiscoveryEngine = flags.useDiscoveryEngine;
    if (finalUserId && flags.abTests.some((t) => t.name === 'search_quality' && t.enabled)) {
      const variant = getABTestVariant(finalUserId, 'search_quality');
      useDiscoveryEngine = variant === 'discovery_engine';
    }
    
    console.debug('[Discovery Engine API] Request:', {
      query,
      userId: finalUserId || 'anonymous',
      useDiscoveryEngine,
      pageSize: pageSize || 20,
    });

    // Generate cache key
    const cache = getDiscoveryEngineCache();
    const cacheKey = cache.generateSearchKey(query, filters || {}, finalUserId);

    // Perform search with caching and performance monitoring
    const searchStartTime = Date.now();
    const results = await withPerformanceMonitoring(
      '/api/search/discovery',
      'POST',
      () => withCache(
        cacheKey,
        () => discoveryEngine.search(query, {
          userId: finalUserId,
          pageSize: pageSize || 20,
          pageToken,
          filters: filters || {},
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
    const searchElapsed = Date.now() - searchStartTime;

    console.log('[Discovery Engine API] Search completed:', {
      resultCount: results.results.length,
      totalSize: results.totalSize,
      elapsed: `${searchElapsed}ms`,
      source: 'discovery_engine',
      fallback: false,
    });

    // Track search event for personalization
    if (finalUserId) {
      discoveryEngine.trackEvent({
        userId: finalUserId,
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
    // Return 200 with empty results instead of 500 to prevent breaking the UI
    return NextResponse.json(
      { 
        results: [],
        totalSize: 0,
        query: body?.query || '',
        source: 'fallback',
        fallback: true,
        error: 'Search failed',
        message: 'Discovery Engine search failed. This is the primary search feature.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 200 }
    );
  }
}

/**
 * GET /api/search/discovery
 * Search destinations using Google Discovery Engine (GET version)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  try {
    const query = searchParams.get('query');
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const priceLevel = searchParams.get('priceLevel') ? parseInt(searchParams.get('priceLevel')!) : undefined;
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 20;
    const pageToken = searchParams.get('pageToken') || undefined;
    const userId = searchParams.get('userId') || undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'query parameter is required' },
        { status: 400 }
      );
    }

    const discoveryEngine = getDiscoveryEngineService();

    if (!discoveryEngine.isAvailable()) {
      // Discovery Engine is the primary search feature and must be configured
      console.error('[Discovery Engine API] ERROR: Discovery Engine is not configured. This is the primary search feature and must be set up.');
      return NextResponse.json(
        { 
          results: [],
          totalSize: 0,
          query,
          source: 'error',
          fallback: true,
          error: 'Discovery Engine not configured',
          message: 'Discovery Engine is the primary search feature and must be configured. Please set up Google Cloud Discovery Engine.',
        },
        { status: 503 }
      );
    }

    // Get user ID from session if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      try {
        const supabase = await createServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id;
      } catch (error) {
        // User not authenticated - continue without personalization
      }
    }

    const results = await discoveryEngine.search(query, {
      userId: finalUserId,
      pageSize,
      pageToken,
      filters: {
        city,
        category,
        priceLevel,
        minRating,
      },
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
    });

    // Track search event
    if (finalUserId) {
      discoveryEngine.trackEvent({
        userId: finalUserId,
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
    });
  } catch (error: any) {
    console.error('Discovery Engine search error:', error);
    // Return 200 with empty results instead of 500 to prevent breaking the UI
    const query = searchParams.get('query') || '';
    return NextResponse.json(
      { 
        results: [],
        totalSize: 0,
        query,
        source: 'fallback',
        fallback: true,
        error: 'Search failed',
        message: 'Discovery Engine search failed. This is the primary search feature.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 200 }
    );
  }
}

