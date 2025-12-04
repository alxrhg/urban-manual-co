/**
 * Trending Searches API Route
 *
 * GET /api/search/trending
 *
 * Returns popular search queries from recent user interactions.
 * Aggregates searches from the past 7 days.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { rateLimit } from '@/lib/rate-limit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface TrendingSearch {
  query: string;
  count: number;
}

// Static fallback trending searches when no data is available
const FALLBACK_TRENDING: TrendingSearch[] = [
  { query: 'Tokyo restaurants', count: 150 },
  { query: 'Paris cafes', count: 120 },
  { query: 'Michelin starred', count: 100 },
  { query: 'rooftop bars', count: 85 },
  { query: 'hidden gems', count: 75 },
];

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      limit: 30,
      window: 60,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 30);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query search interactions from the database
    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('metadata')
      .eq('interaction_type', 'search')
      .gte('created_at', startDate.toISOString())
      .not('metadata->query', 'is', null);

    if (error) {
      console.error('Error fetching trending searches:', error);
      // Return fallback data on error
      return NextResponse.json({
        trending: FALLBACK_TRENDING.slice(0, limit),
        source: 'fallback',
        period: `${days} days`,
      });
    }

    // Aggregate search queries
    const queryCount = new Map<string, number>();

    interactions?.forEach((interaction: any) => {
      const query = interaction.metadata?.query;
      if (query && typeof query === 'string' && query.trim().length >= 2) {
        const normalizedQuery = query.trim().toLowerCase();
        // Skip very common or meaningless queries
        if (!['test', 'a', 'the', 'and', 'or'].includes(normalizedQuery)) {
          queryCount.set(
            normalizedQuery,
            (queryCount.get(normalizedQuery) || 0) + 1
          );
        }
      }
    });

    // Sort by count and take top results
    const trending: TrendingSearch[] = Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // If not enough data, supplement with fallback
    if (trending.length < limit) {
      const existingQueries = new Set(trending.map((t) => t.query.toLowerCase()));
      const supplemental = FALLBACK_TRENDING
        .filter((f) => !existingQueries.has(f.query.toLowerCase()))
        .slice(0, limit - trending.length);
      trending.push(...supplemental);
    }

    return NextResponse.json({
      trending,
      source: trending.length > 0 ? 'analytics' : 'fallback',
      period: `${days} days`,
      totalSearches: interactions?.length || 0,
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json({
      trending: FALLBACK_TRENDING.slice(0, 10),
      source: 'fallback',
      error: 'Failed to fetch trending searches',
    });
  }
});
