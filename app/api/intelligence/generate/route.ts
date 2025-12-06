/**
 * Travel Intelligence API
 * Generate travel intelligence - this is the product, not a feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTravelIntelligence, type TravelIntelligenceInput } from '@/services/intelligence/engine';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, conversationRatelimit, memoryConversationRatelimit } from '@/lib/rate-limit';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limit expensive AI operations
  const rateLimitResponse = await enforceRateLimit({
    request,
    message: 'Too many intelligence requests. Please wait a moment.',
    limiter: conversationRatelimit,
    memoryLimiter: memoryConversationRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();
  const input: TravelIntelligenceInput = {
    destination: body.destination,
    dates: {
      start: new Date(body.dates.start),
      end: new Date(body.dates.end),
    },
    preferences: {
      architectural_interests: body.preferences?.architectural_interests || [],
      travel_style: body.preferences?.travel_style || 'balanced',
      budget_range: body.preferences?.budget_range || 'moderate',
      group_size: body.preferences?.group_size || 1,
      special_requirements: body.preferences?.special_requirements || [],
    },
  };

  // Validate input
  if (!input.destination || !input.dates.start || !input.dates.end) {
    throw createValidationError('Missing required fields: destination, dates.start, dates.end');
  }

  // Generate intelligence
  const intelligence = await generateTravelIntelligence(input);

  return NextResponse.json(intelligence);
});

