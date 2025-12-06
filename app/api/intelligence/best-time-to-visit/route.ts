import { NextRequest, NextResponse } from 'next/server';
import { bestTimeToVisitService } from '@/services/intelligence/best-time-to-visit';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, conversationRatelimit, memoryConversationRatelimit } from '@/lib/rate-limit';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Rate limit best time analysis requests
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many best time analysis requests. Please wait a moment.',
    limiter: conversationRatelimit,
    memoryLimiter: memoryConversationRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');
  const country = searchParams.get('country');
  const destinationId = searchParams.get('destination_id');
  const monthsAhead = parseInt(searchParams.get('months_ahead') || '12');

  if (!city && !destinationId) {
    throw createValidationError('city or destination_id is required');
  }

  const result = await bestTimeToVisitService.getBestTimeToVisit({
    city: city || undefined,
    country: country || undefined,
    destinationId: destinationId || undefined,
    monthsAhead: Math.min(Math.max(monthsAhead, 1), 24), // Limit to 1-24 months
  });

  if (!result) {
    throw createValidationError('Could not generate best time to visit analysis');
  }

  return NextResponse.json(result);
});
