import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { searchRankingAlgorithm } from '@/services/intelligence/search-ranking';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { enforceRateLimit, searchRatelimit, memorySearchRatelimit } from '@/lib/rate-limit';

/**
 * POST /api/intelligence/search-rank
 * Enhanced search ranking with Manual Score
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Rate limit search ranking requests
  const rateLimitResponse = await enforceRateLimit({
    request,
    userId: user?.id,
    message: 'Too many search requests. Please wait a moment.',
    limiter: searchRatelimit,
    memoryLimiter: memorySearchRatelimit,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const { results, query, intent, userId, weights } = await request.json();

  if (!results || !Array.isArray(results)) {
    throw createValidationError('results array is required');
  }

  if (!query) {
    throw createValidationError('query is required');
  }

  const ranked = await searchRankingAlgorithm.rankResults(
    results,
    query,
    userId || user?.id,
    intent,
    weights
  );

  return NextResponse.json({
    ranked: ranked.map((r) => ({
      ...r.destination,
      _ranking: {
        score: r.score,
        factors: r.factors,
        explanation: r.explanation,
      },
    })),
    count: ranked.length,
  });
});

