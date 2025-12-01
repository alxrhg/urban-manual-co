import { NextRequest, NextResponse } from 'next/server';
import { neighborhoodsDistrictsService } from '@/services/intelligence/neighborhoods-districts';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/intelligence/districts/:city
 * Get districts for a city
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ city: string }> }
) => {
  const resolvedParams = await params;
  const city = decodeURIComponent(resolvedParams.city);

  const districts = await neighborhoodsDistrictsService.getDistrictsByCity(city);

  return NextResponse.json({
    districts,
    count: districts.length,
  });
});

