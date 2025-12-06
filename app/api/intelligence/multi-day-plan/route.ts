import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, conversationRatelimit, memoryConversationRatelimit, getIdentifier } from '@/lib/rate-limit';

/**
 * POST /api/intelligence/multi-day-plan
 * Generate optimized multi-day trip plan with route optimization
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rate limit expensive AI planning operations
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user?.id,
    message: 'Too many planning requests. Please wait a moment.',
    limiter: conversationRatelimit,
    memoryLimiter: memoryConversationRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const {
    city,
    startDate,
    endDate,
    preferences,
    userId: requestUserId,
  } = await request.json();

  if (!city || !startDate || !endDate) {
    throw createValidationError('Missing required fields: city, startDate, endDate');
  }

  const plan = await multiDayTripPlanningService.generateMultiDayPlan(
    city,
    new Date(startDate),
    new Date(endDate),
    preferences,
    requestUserId || user?.id
  );

  if (!plan) {
    throw new Error('Failed to generate trip plan');
  }

  return NextResponse.json(plan);
});

