import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { withErrorHandling } from '@/lib/errors';
import { getSmartRecommendations, type RecommendationContext } from '@/services/intelligence/recommendations';
import type { DevicePreferenceSignals } from '@/services/intelligence/personalization';

export const GET = withErrorHandling(async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const context = (searchParams.get('context') || 'personalized') as RecommendationContext;
  const userId = searchParams.get('userId');
  const city = searchParams.get('city');
  const vibeParam = searchParams.get('vibe');
  const partyParam = searchParams.get('party');
  const budgetMin = searchParams.get('budgetMin');
  const budgetMax = searchParams.get('budgetMax');

  const supabase = await createServerClient();

  const deviceSignals: DevicePreferenceSignals = {};
  if (city) deviceSignals.activeCity = city;
  if (vibeParam) {
    deviceSignals.preferredVibes = vibeParam.split(',').map(value => value.trim()).filter(Boolean);
  }
  if (partyParam) {
    deviceSignals.travelParty = partyParam.split(',').map(value => value.trim()).filter(Boolean);
  }

  const parsedMin = budgetMin !== null ? Number(budgetMin) : undefined;
  const parsedMax = budgetMax !== null ? Number(budgetMax) : undefined;
  const hasMin = parsedMin !== undefined && !Number.isNaN(parsedMin);
  const hasMax = parsedMax !== undefined && !Number.isNaN(parsedMax);
  if (hasMin || hasMax) {
    deviceSignals.preferredBudget = {
      min: hasMin ? parsedMin : undefined,
      max: hasMax ? parsedMax : undefined,
    };
  }

  const finalSignals = Object.keys(deviceSignals).length ? deviceSignals : undefined;

  const recommendations = await getSmartRecommendations({
    userId,
    context,
    limit: 20,
    supabaseClient: supabase,
    deviceSignals: finalSignals,
  });

  const response = NextResponse.json({
    recommendations,
    context,
  });

  if (context !== 'personalized') {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }

  return response;
});
