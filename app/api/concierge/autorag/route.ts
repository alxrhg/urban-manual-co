/**
 * AutoRAG API Route
 *
 * Provides conversational AI powered by Cloudflare AutoRAG
 * for answering questions about destinations and travel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryAutoRAG, combineResults, getBestResult } from '@/lib/cloudflare/autorag';
import { withErrorHandling } from '@/lib/errors';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { query, max_results = 10, rewrite_query = true } = body;

  if (!query || typeof query !== 'string') {
    return NextResponse.json(
      { error: 'Query is required' },
      { status: 400 }
    );
  }

  // Query AutoRAG
  const response = await queryAutoRAG(query, {
    max_results,
    rewrite_query,
  });

  // Format response
  const answer = combineResults(response.results);
  const bestResult = getBestResult(response.results);

  return NextResponse.json({
    answer,
    results: response.results,
    best_result: bestResult,
    rewritten_query: response.rewritten_query,
    query: response.query || query,
  });
});

