import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createUnauthorizedError } from '@/lib/errors';
import {
  getPersonalizedRecommendations,
  getSimilarToLiked,
  buildUserRatingProfile,
} from '@/services/recommendations/rating-based-recommendations';

/**
 * GET /api/recommendations/personalized
 *
 * Returns personalized recommendations based on user's visit ratings
 *
 * Query params:
 * - city: Filter by city
 * - category: Filter by category
 * - limit: Number of results (default 20)
 * - include_similar: Include "because you liked X" sections (default false)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError();
  }

  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const includeSimilar = searchParams.get('include_similar') === 'true';

  // Get user's rating profile
  const profile = await buildUserRatingProfile(user.id);

  // Get personalized recommendations
  const recommendations = await getPersonalizedRecommendations(user.id, {
    city,
    category,
    limit,
  });

  // Optionally include "because you liked X" sections
  let similarSections: any[] = [];
  if (includeSimilar) {
    similarSections = await getSimilarToLiked(user.id, { limit: 5 });
  }

  return NextResponse.json({
    recommendations,
    similarSections,
    profile: profile ? {
      totalRatings: profile.totalRatings,
      avgRating: profile.avgOverallRating,
      topCategories: profile.preferredCategories.slice(0, 3),
      topCities: profile.preferredCities.slice(0, 3),
    } : null,
  });
});
