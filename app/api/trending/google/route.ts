import { NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * GET /api/trending/google
 *
 * Fetches Google Trends data from the ML service.
 *
 * Query parameters:
 * - type: Type of trends data to fetch (trending-searches, interest-over-time, interest-by-region, related-queries, suggestions, realtime-trends)
 * - keywords: Comma-separated keywords (for interest-over-time, interest-by-region, related-queries)
 * - keyword: Single keyword (for related-queries, suggestions)
 * - region: Region code (for trending-searches, realtime-trends)
 * - geo: Geographic location code (for interest-over-time, interest-by-region, related-queries)
 * - timeframe: Timeframe for data (for interest-over-time, interest-by-region, related-queries)
 * - resolution: Geographic resolution (for interest-by-region)
 * - category: Category code or name (for interest-over-time, realtime-trends)
 * - include_low_search_volume: Include low search volume regions (for interest-by-region)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'trending-searches';

    // Build the ML service URL based on type
    let mlServiceEndpoint = '';
    const queryParams = new URLSearchParams();

    switch (type) {
      case 'trending-searches':
        mlServiceEndpoint = `${ML_SERVICE_URL}/api/trends/trending-searches`;
        if (searchParams.get('region')) {
          queryParams.set('region', searchParams.get('region')!);
        }
        break;

      case 'interest-over-time':
        mlServiceEndpoint = `${ML_SERVICE_URL}/api/trends/interest-over-time`;
        if (searchParams.get('keywords')) {
          queryParams.set('keywords', searchParams.get('keywords')!);
        } else {
          return NextResponse.json(
            { error: 'keywords parameter is required for interest-over-time' },
            { status: 400 }
          );
        }
        if (searchParams.get('timeframe')) {
          queryParams.set('timeframe', searchParams.get('timeframe')!);
        }
        if (searchParams.get('geo')) {
          queryParams.set('geo', searchParams.get('geo')!);
        }
        if (searchParams.get('category')) {
          queryParams.set('category', searchParams.get('category')!);
        }
        break;

      case 'interest-by-region':
        mlServiceEndpoint = `${ML_SERVICE_URL}/api/trends/interest-by-region`;
        if (searchParams.get('keywords')) {
          queryParams.set('keywords', searchParams.get('keywords')!);
        } else {
          return NextResponse.json(
            { error: 'keywords parameter is required for interest-by-region' },
            { status: 400 }
          );
        }
        if (searchParams.get('timeframe')) {
          queryParams.set('timeframe', searchParams.get('timeframe')!);
        }
        if (searchParams.get('resolution')) {
          queryParams.set('resolution', searchParams.get('resolution')!);
        }
        if (searchParams.get('include_low_search_volume')) {
          queryParams.set('include_low_search_volume', searchParams.get('include_low_search_volume')!);
        }
        break;

      case 'related-queries':
        mlServiceEndpoint = `${ML_SERVICE_URL}/api/trends/related-queries`;
        if (searchParams.get('keyword')) {
          queryParams.set('keyword', searchParams.get('keyword')!);
        } else {
          return NextResponse.json(
            { error: 'keyword parameter is required for related-queries' },
            { status: 400 }
          );
        }
        if (searchParams.get('timeframe')) {
          queryParams.set('timeframe', searchParams.get('timeframe')!);
        }
        if (searchParams.get('geo')) {
          queryParams.set('geo', searchParams.get('geo')!);
        }
        break;

      case 'suggestions':
        mlServiceEndpoint = `${ML_SERVICE_URL}/api/trends/suggestions`;
        if (searchParams.get('keyword')) {
          queryParams.set('keyword', searchParams.get('keyword')!);
        } else {
          return NextResponse.json(
            { error: 'keyword parameter is required for suggestions' },
            { status: 400 }
          );
        }
        break;

      case 'realtime-trends':
        mlServiceEndpoint = `${ML_SERVICE_URL}/api/trends/realtime-trends`;
        if (searchParams.get('region')) {
          queryParams.set('region', searchParams.get('region')!);
        }
        if (searchParams.get('category')) {
          queryParams.set('category', searchParams.get('category')!);
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Must be one of: trending-searches, interest-over-time, interest-by-region, related-queries, suggestions, realtime-trends' },
          { status: 400 }
        );
    }

    // Construct full URL with query parameters
    const fullUrl = `${mlServiceEndpoint}?${queryParams.toString()}`;

    // Fetch from ML service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(fullUrl, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ML service error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch Google Trends data', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return with caching headers (cache for 30 minutes)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });

  } catch (error) {
    console.error('Error fetching Google Trends:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout while fetching Google Trends data' },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: 'Internal server error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
