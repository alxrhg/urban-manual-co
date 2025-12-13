/**
 * Greeting Context API
 * GET /api/greeting/context
 *
 * Returns enriched greeting context for the current user
 */

import { NextRequest } from 'next/server';
import { withOptionalAuth, OptionalAuthContext, createSuccessResponse, createValidationError } from '@/lib/errors';
import { fetchGreetingContext } from '@/lib/greetings/context-fetcher';

// Mark route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

export const GET = withOptionalAuth(async (request: NextRequest, { user }: OptionalAuthContext) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const favoriteCity = searchParams.get('favoriteCity') || undefined;

  if (!userId) {
    throw createValidationError('User ID is required');
  }

  // Fetch enriched greeting context
  const context = await fetchGreetingContext(userId, favoriteCity);

  return createSuccessResponse({
    context,
    timestamp: new Date().toISOString(),
  });
});

// Cache for 5 minutes
export const revalidate = 300;
