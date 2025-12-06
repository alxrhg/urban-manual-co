import { NextRequest, NextResponse } from 'next/server';
import { deepIntentAnalysisService } from '@/services/intelligence/deep-intent-analysis';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, conversationRatelimit, memoryConversationRatelimit } from '@/lib/rate-limit';

/**
 * POST /api/intelligence/deep-understand
 * Enhanced intent analysis with multi-intent detection
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rate limit AI intent analysis
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user?.id,
    message: 'Too many analysis requests. Please wait a moment.',
    limiter: conversationRatelimit,
    memoryLimiter: memoryConversationRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();
  const { query, conversationHistory = [], userId } = body;

  if (!query) {
    throw createValidationError('query is required');
  }

  const result = await deepIntentAnalysisService.analyzeMultiIntent(
    query,
    conversationHistory,
    userId || user?.id
  );

  return NextResponse.json({
    ...result,
    query,
  });
});

