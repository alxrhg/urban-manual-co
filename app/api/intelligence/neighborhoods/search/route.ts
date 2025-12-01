import { NextRequest, NextResponse } from 'next/server';
import { neighborhoodsDistrictsService } from '@/services/intelligence/neighborhoods-districts';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * GET /api/intelligence/neighborhoods/search
 * Search destinations by neighborhood
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
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
    throw createValidationError('neighborhood parameter is required');
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
});

