import { NextRequest, NextResponse } from 'next/server';
import { neighborhoodsDistrictsService } from '@/services/intelligence/neighborhoods-districts';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/intelligence/neighborhoods/:city
 * Get neighborhoods for a city
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) => {
  const resolvedParams = await params;
  const city = decodeURIComponent(resolvedParams.city);

  const neighborhoods = await neighborhoodsDistrictsService.getNeighborhoodsByCity(city);

  return NextResponse.json({
    neighborhoods,
    count: neighborhoods.length,
  });
});

