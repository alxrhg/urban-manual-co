import { NextRequest, NextResponse } from 'next/server';
import { deepIntentAnalysisService } from '@/services/intelligence/deep-intent-analysis';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * POST /api/intelligence/deep-understand
 * Enhanced intent analysis with multi-intent detection
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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

