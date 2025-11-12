import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  extractPreferenceSeeds,
  PreferenceSeedResult,
} from '@/lib/personalization/preferences';

function buildResponsePayload(result: PreferenceSeedResult) {
  return {
    suggestedCategories: result.categories,
    suggestedCities: result.cities,
    preferenceVector: result.vector,
    source: result.source,
  };
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      const defaults = extractPreferenceSeeds(null);
      return NextResponse.json(buildResponsePayload(defaults));
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('category_scores, city_scores, favorite_categories, favorite_cities, interests')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.warn('[search/personalization] Failed to fetch user preferences', error);
    }

    const result = extractPreferenceSeeds(data || null);
    return NextResponse.json(buildResponsePayload(result));
  } catch (error: any) {
    console.error('[search/personalization] Unexpected error', error);
    const defaults = extractPreferenceSeeds(null);
    return NextResponse.json(
      {
        ...buildResponsePayload(defaults),
        error: 'Failed to load personalization preferences',
      },
      { status: 500 }
    );
  }
}

