import { NextRequest, NextResponse } from 'next/server';
import { advancedRecommendationEngine } from '@/services/intelligence/recommendations-advanced';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw createValidationError('Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const excludeVisited = searchParams.get('exclude_visited') === 'true';
  const excludeSaved = searchParams.get('exclude_saved') === 'true';

  const recommendations = await advancedRecommendationEngine.getRecommendations(
    user.id,
    limit,
    {
      city,
      category,
      excludeVisited,
      excludeSaved,
    }
  );

  // Fetch full destination details
  const destinationIds = recommendations.map(r => r.destination_id);
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .in('id', destinationIds);

  // Map recommendations to destinations with scores
  const results = recommendations.map(rec => {
    const destination = destinations?.find(d => d.id === rec.destination_id);
    return {
      destination,
      score: rec.score,
      reason: rec.reason,
      factors: rec.factors,
    };
  }).filter(r => r.destination); // Remove any missing destinations

  return NextResponse.json({
    recommendations: results,
    count: results.length,
  });
});

