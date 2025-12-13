import { NextRequest } from 'next/server';
import { generateDiscoveryPrompt } from '@/services/gemini';
import { getSeasonalContext } from '@/services/seasonality';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

/**
 * GET /api/discovery-prompt
 *
 * Query parameters:
 * - city: string (required) - City name
 * - category: string (optional) - Category filter
 *
 * Returns a dynamic discovery prompt for the city
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');
  const category = searchParams.get('category') || undefined;

  if (!city) {
    throw createValidationError('City parameter is required');
  }

  // Get seasonal context
  const seasonality = getSeasonalContext(city);

  // Generate discovery prompt
  const prompt = await generateDiscoveryPrompt(city, category, seasonality || undefined);

  return createSuccessResponse({
    city,
    category,
    prompt,
    seasonality: seasonality ? {
      text: seasonality.text,
      event: seasonality.event,
      start: seasonality.start.toISOString(),
      end: seasonality.end.toISOString(),
    } : null,
  });
});

