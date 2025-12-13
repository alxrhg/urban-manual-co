import { NextRequest } from 'next/server';
import { getLocationContext } from '@/lib/search/expandLocations';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

/**
 * GET /api/location/context
 * Get location context (nearby locations, walking times, cultural notes)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const locationName = searchParams.get('location');

  if (!locationName) {
    throw createValidationError('location parameter is required');
  }

  const context = await getLocationContext(locationName);

  return createSuccessResponse({ context: context || null });
});
