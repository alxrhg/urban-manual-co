import { NextRequest } from 'next/server';
import { generateCrossCityCorrelations } from '@/lib/discovery-prompts-generative';
import { withErrorHandling, createSuccessResponse, createValidationError } from '@/lib/errors';

/**
 * GET /api/discovery-prompts/cross-city
 *
 * Query parameters:
 * - city: string (required) - Current city being browsed
 * - user_id: string (required) - User ID for correlation analysis
 *
 * Returns cross-city correlation prompts
 * Example: "Loved cherry blossoms in Tokyo? Try jacaranda season in Lisbon this May."
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');
  const userId = searchParams.get('user_id');

  if (!city) {
    throw createValidationError('City parameter is required');
  }

  if (!userId) {
    throw createValidationError('user_id parameter is required');
  }

  const correlations = await generateCrossCityCorrelations(userId, city.toLowerCase());

  return createSuccessResponse({
    city,
    correlations,
    count: correlations.length,
  });
});

