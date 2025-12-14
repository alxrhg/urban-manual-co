/**
 * API Route: Get nearby events
 * GET /api/events/nearby?lat=...&lng=...&radius=...
 */

import { NextRequest } from 'next/server';
import { fetchNearbyEvents } from '@/lib/enrichment/events';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const radiusKm = parseFloat(searchParams.get('radius') || '5');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!lat || !lng) {
    throw createValidationError('Latitude and longitude are required');
  }

  const events = await fetchNearbyEvents(lat, lng, radiusKm, limit);

  return createSuccessResponse({
    location: { lat, lng },
    radiusKm,
    events,
    count: events.length,
  });
});

