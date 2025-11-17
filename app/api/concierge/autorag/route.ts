/**
 * AutoRAG API Route
 * 
 * Provides conversational AI powered by Cloudflare AutoRAG
 * for answering questions about destinations and travel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryAutoRAG, combineResults, getBestResult } from '@/lib/cloudflare/autorag';

export async function POST(request: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error('AutoRAG API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to query AutoRAG',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

