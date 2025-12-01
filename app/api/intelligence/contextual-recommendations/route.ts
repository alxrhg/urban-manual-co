import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { contextualRecommendationsService } from '@/services/intelligence/contextual-recommendations';
import { withErrorHandling } from '@/lib/errors';

/**
 * GET /api/intelligence/contextual-recommendations
 * Get contextual recommendations based on current context
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId') || user?.id;
  const city = searchParams.get('city') || undefined;
  const neighborhood = searchParams.get('neighborhood') || undefined;
  const timeOfDay = searchParams.get('timeOfDay') as any;
  const tripType = searchParams.get('tripType') as any;
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  const context = {
    location: {
      city,
      neighborhood,
    },
    temporal: timeOfDay ? { timeOfDay } : undefined,
    userState: tripType ? { tripType } : undefined,
  };

  const recommendations = await contextualRecommendationsService.getContextualRecommendations(
    userId,
    context,
    limit
  );

  return NextResponse.json({
    recommendations,
    count: recommendations.length,
  });
});

