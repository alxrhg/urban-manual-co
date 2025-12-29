/**
 * User stats API
 * GET /api/stats - Get current user's stats
 * GET /api/stats?user_id=xxx - Get another user's stats (if public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  const targetUserId = userId || user?.id;

  if (!targetUserId) {
    throw new CustomError(ErrorCode.UNAUTHORIZED, 'Authentication required', 401);
  }

  const supabase = await createServerClient();

  // Check if target user's profile is public (if viewing someone else's stats)
  if (userId && user?.id !== userId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_public, show_stats')
      .eq('id', userId)
      .single();

    if (!profile?.is_public || !profile?.show_stats) {
      throw new CustomError(ErrorCode.FORBIDDEN, 'This user\'s stats are private', 403);
    }
  }

  // Get stats
  const { data: stats, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', targetUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch stats', 500);
  }

  // If no stats exist, return defaults
  const defaultStats = {
    user_id: targetUserId,
    destinations_saved: 0,
    destinations_visited: 0,
    reviews_written: 0,
    reviews_helpful: 0,
    lists_created: 0,
    lists_liked: 0,
    trips_completed: 0,
    cities_visited: 0,
    countries_visited: 0,
    photos_uploaded: 0,
    suggestions_approved: 0,
    followers_count: 0,
    following_count: 0,
    total_points: 0,
    current_streak_days: 0,
    longest_streak_days: 0,
  };

  return NextResponse.json({ stats: stats || defaultStats });
});
