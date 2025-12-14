/**
 * API Route: Get City-Level Google Trends
 */

import { NextRequest } from 'next/server';
import { fetchCityTrends } from '@/lib/google-trends';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    throw createValidationError('City parameter is required');
  }

  const trends = await fetchCityTrends(city);

  return createSuccessResponse({
    city,
    ...trends,
    fetchedAt: new Date().toISOString(),
  });
});

