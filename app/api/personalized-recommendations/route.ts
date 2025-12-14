import { NextRequest } from 'next/server';
import { getHybridRecommendations, getColdStartRecommendations } from '@/lib/recommendations';
import { withAuth, createSuccessResponse, createValidationError } from '@/lib/errors';

/**
 * POST /api/personalized-recommendations
 *
 * Returns personalized recommendations based on user behavior and preferences
 */
export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body = await request.json();
  const { sessionId, limit = 20, algorithm = 'hybrid' } = body;

  // Validate required parameters
  if (!sessionId) {
    throw createValidationError('Session ID is required');
  }

  let recommendations;

  switch (algorithm) {
    case 'cold_start':
      recommendations = await getColdStartRecommendations(limit);
      break;
    case 'hybrid':
    default:
      recommendations = await getHybridRecommendations(user.id, sessionId, limit);
      break;
  }

  return createSuccessResponse({
    algorithm,
    recommendations,
    count: recommendations.length,
  });
});

/**
 * GET /api/personalized-recommendations?sessionId=xxx&limit=20
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!sessionId) {
    throw createValidationError('Session ID is required');
  }

  const recommendations = await getHybridRecommendations(
    user.id,
    sessionId,
    limit
  );

  return createSuccessResponse({
    recommendations,
    count: recommendations.length,
  });
});
