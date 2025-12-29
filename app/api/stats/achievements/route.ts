/**
 * Achievements API
 * GET /api/stats/achievements - Get all achievements and user's progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');

  const targetUserId = userId || user?.id;

  const supabase = await createServerClient();

  // Get all achievements
  const { data: allAchievements, error } = await supabase
    .from('achievements')
    .select('*')
    .order('category')
    .order('requirement_value');

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch achievements', 500);
  }

  // Get user's earned achievements
  let earnedAchievements: string[] = [];
  let stats = null;

  if (targetUserId) {
    // Check if target user's profile is public
    if (userId && user?.id !== userId) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_public, show_stats')
        .eq('id', userId)
        .single();

      if (!profile?.is_public || !profile?.show_stats) {
        // Return only achievements list without user progress
        return NextResponse.json({
          achievements: allAchievements?.filter((a) => !a.is_secret) || [],
          earned: [],
          stats: null,
        });
      }
    }

    const { data: earned } = await supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', targetUserId);

    earnedAchievements = earned?.map((e) => e.achievement_id) || [];

    // Get stats for progress calculation
    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    stats = userStats;
  }

  // Calculate progress for each achievement
  const achievementsWithProgress = allAchievements?.map((achievement) => {
    const isEarned = earnedAchievements.includes(achievement.id);
    let progress = 0;

    if (stats && !isEarned) {
      switch (achievement.requirement_type) {
        case 'destinations_saved':
          progress = Math.min((stats.destinations_saved / achievement.requirement_value) * 100, 100);
          break;
        case 'destinations_visited':
          progress = Math.min((stats.destinations_visited / achievement.requirement_value) * 100, 100);
          break;
        case 'reviews_written':
          progress = Math.min((stats.reviews_written / achievement.requirement_value) * 100, 100);
          break;
        case 'cities_visited':
          progress = Math.min((stats.cities_visited / achievement.requirement_value) * 100, 100);
          break;
        case 'countries_visited':
          progress = Math.min((stats.countries_visited / achievement.requirement_value) * 100, 100);
          break;
        case 'lists_created':
          progress = Math.min((stats.lists_created / achievement.requirement_value) * 100, 100);
          break;
        case 'followers_count':
          progress = Math.min((stats.followers_count / achievement.requirement_value) * 100, 100);
          break;
        case 'trips_completed':
          progress = Math.min((stats.trips_completed / achievement.requirement_value) * 100, 100);
          break;
        case 'reviews_helpful':
          progress = Math.min((stats.reviews_helpful / achievement.requirement_value) * 100, 100);
          break;
        default:
          progress = 0;
      }
    } else if (isEarned) {
      progress = 100;
    }

    // Hide secret achievements unless earned
    if (achievement.is_secret && !isEarned) {
      return {
        id: achievement.id,
        name: '???',
        description: 'This is a secret achievement!',
        icon: '🔒',
        category: achievement.category,
        is_secret: true,
        is_earned: false,
        progress: 0,
        points: achievement.points,
      };
    }

    return {
      ...achievement,
      is_earned: isEarned,
      progress: Math.round(progress),
    };
  });

  // Group by category
  const byCategory: Record<string, typeof achievementsWithProgress> = {};
  achievementsWithProgress?.forEach((achievement) => {
    if (!byCategory[achievement.category]) {
      byCategory[achievement.category] = [];
    }
    byCategory[achievement.category].push(achievement);
  });

  return NextResponse.json({
    achievements: achievementsWithProgress || [],
    by_category: byCategory,
    earned_count: earnedAchievements.length,
    total_count: allAchievements?.filter((a) => !a.is_secret).length || 0,
  });
});
