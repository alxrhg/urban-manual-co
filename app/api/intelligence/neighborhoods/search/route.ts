import { NextRequest, NextResponse } from 'next/server';
import { neighborhoodsDistrictsService } from '@/services/intelligence/neighborhoods-districts';
import { intelligenceLimiter, memoryIntelligenceLimiter, withRateLimit } from '@/lib/rate-limit';

/**
 * GET /api/intelligence/neighborhoods/search
 * Search destinations by neighborhood
 */
export async function GET(request: NextRequest) {
  return withRateLimit({
    request,
    limiter: intelligenceLimiter,
    fallbackLimiter: memoryIntelligenceLimiter,
    message: 'Intelligence API usage is limited to 30 requests per minute.',
    handler: async () => {
      try {
        const searchParams = request.nextUrl.searchParams;
        const neighborhood = searchParams.get('neighborhood');
        const city = searchParams.get('city') || undefined;
        const category = searchParams.get('category') || undefined;
        const minRating = searchParams.get('minRating')
          ? parseFloat(searchParams.get('minRating')!)
          : undefined;
        const maxPriceLevel = searchParams.get('maxPriceLevel')
          ? parseInt(searchParams.get('maxPriceLevel')!, 10)
          : undefined;
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        if (!neighborhood) {
          return NextResponse.json(
            { error: 'neighborhood parameter is required' },
            { status: 400 }
          );
        }

        const results = await neighborhoodsDistrictsService.searchByNeighborhood(
          neighborhood,
          city,
          {
            category,
            minRating,
            maxPriceLevel,
          },
          limit
        );

        return NextResponse.json({
          results,
          count: results.length,
        });
      } catch (error: any) {
        console.error('Error searching by neighborhood:', error);
        return NextResponse.json(
          { error: 'Internal server error', details: error.message },
          { status: 500 }
        );
      }
    },
  });
}

