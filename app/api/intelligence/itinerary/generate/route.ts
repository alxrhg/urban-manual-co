import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { conversationItineraryService } from '@/services/intelligence/conversation-itinerary';
import { multiDayTripPlanningService } from '@/services/intelligence/multi-day-planning';
import { itineraryIntelligenceService } from '@/services/intelligence/itinerary';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';

/**
 * POST /api/intelligence/itinerary/generate
 * Generate itinerary (supports conversation-based, multi-day, and traditional modes)
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rate limiting (User based if authenticated, IP otherwise)
  // Using conversationRatelimit (5 req/10s) as this triggers LLM operations
  const identifier = getIdentifier(request, user?.id);
  const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Too many generation requests. Please wait a moment.',
      limit,
      remaining,
      reset
    );
  }

  const body = await request.json();
  const {
    mode, // 'conversation' or 'traditional' or 'multi-day'
    userId,
    sessionId,
    conversationHistory,
    currentQuery,
    city,
    durationDays,
    duration_days, // Support both naming conventions
    startDate,
    endDate,
    preferences,
    save,
  } = body;

  // Conversation-based generation
  if (mode === 'conversation') {
    if (!userId || !sessionId || !conversationHistory || !currentQuery) {
      throw createValidationError('Missing required fields for conversation mode: userId, sessionId, conversationHistory, currentQuery');
    }

    const result = await conversationItineraryService.generateFromConversation({
      userId: userId || user?.id || '',
      sessionId,
      conversationHistory,
      currentQuery,
    });

    return NextResponse.json(result);
  }

  // Multi-day planning
  if (startDate && endDate) {
    if (!city) {
      throw createValidationError('city is required for multi-day planning');
    }

    const plan = await multiDayTripPlanningService.generateMultiDayPlan(
      city,
      new Date(startDate),
      new Date(endDate),
      preferences,
      userId || user?.id
    );

    if (!plan) {
      throw new Error('Failed to generate trip plan');
    }

    return NextResponse.json(plan);
  }

  // Traditional generation
  const finalDurationDays = durationDays || duration_days;
  if (!city || !finalDurationDays) {
    throw createValidationError('city and durationDays are required for traditional mode');
  }

  const itinerary = await itineraryIntelligenceService.generateItinerary(
    city,
    finalDurationDays,
    preferences,
    userId || user?.id
  );

  if (!itinerary) {
    throw createValidationError('Unable to generate itinerary. No destinations found.');
  }

  // Save if requested
  let savedId = null;
  if (save && user) {
    savedId = await itineraryIntelligenceService.saveItinerary(itinerary, user.id);
  }

  return NextResponse.json({
    itinerary,
    saved_id: savedId,
  });
});
