import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  buildPreferenceVector,
  scoreDestination,
  type DevicePreferenceSignals,
  type PreferenceVector,
  type DestinationCandidate,
} from './personalization';

export type RecommendationContext = 'personalized' | 'weekend' | 'evening' | 'morning';

export interface PersonalizedDestination extends DestinationCandidate {
  personalizationScore: number;
  baseScore: number;
  finalScore: number;
}

export interface SmartRecommendationOptions {
  userId?: string | null;
  context?: RecommendationContext;
  limit?: number;
  supabaseClient?: SupabaseClient;
  deviceSignals?: DevicePreferenceSignals | null;
}

const CONTEXT_CATEGORY_FILTERS: Record<RecommendationContext, string[]> = {
  personalized: [],
  weekend: ['cafe', 'restaurant', 'hotel', 'activity', 'park'],
  evening: ['bar', 'restaurant', 'nightlife', 'club'],
  morning: ['cafe', 'bakery', 'breakfast'],
};

const CONTEXT_VIBES: Record<RecommendationContext, string[]> = {
  personalized: [],
  weekend: ['lively', 'outdoor', 'brunch'],
  evening: ['nightlife', 'romantic', 'late-night'],
  morning: ['cozy', 'relaxed', 'sunny'],
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function deriveContextSignals(context: RecommendationContext): DevicePreferenceSignals {
  const categories = CONTEXT_CATEGORY_FILTERS[context] || [];
  const vibes = CONTEXT_VIBES[context] || [];
  return {
    activeCategories: categories.length ? categories : undefined,
    preferredVibes: vibes.length ? vibes : undefined,
  };
}

function mergeSignals(
  base: DevicePreferenceSignals | null | undefined,
  overrides: DevicePreferenceSignals | null | undefined
): DevicePreferenceSignals | undefined {
  if (!base && !overrides) return undefined;

  const result: DevicePreferenceSignals = {};

  const mergeStringArray = (key: keyof DevicePreferenceSignals) => {
    const values = [base?.[key], overrides?.[key]]
      .flat()
      .filter((value): value is string => typeof value === 'string');
    if (!values.length) return;
    const unique = Array.from(new Set(values));
    if (unique.length) {
      (result as Record<string, unknown>)[key] = unique;
    }
  };

  mergeStringArray('activeCategories');
  mergeStringArray('preferredVibes');
  mergeStringArray('mobilityNeeds');
  mergeStringArray('travelParty');
  mergeStringArray('recentSearches');
  mergeStringArray('pinnedTags');

  const budgetSources = [base?.preferredBudget, overrides?.preferredBudget].filter(
    (value): value is { min?: number | null; max?: number | null } => Boolean(value)
  );
  if (budgetSources.length) {
    let minBudget: number | null = null;
    let maxBudget: number | null = null;

    for (const range of budgetSources) {
      if (typeof range.min === 'number') {
        minBudget = minBudget == null ? range.min : Math.min(minBudget, range.min);
      }
      if (typeof range.max === 'number') {
        maxBudget = maxBudget == null ? range.max : Math.max(maxBudget, range.max);
      }
    }

    result.preferredBudget = { min: minBudget, max: maxBudget };
  }

  if (overrides?.activeCity) {
    result.activeCity = overrides.activeCity;
  } else if (base?.activeCity) {
    result.activeCity = base.activeCity;
  }

  return Object.keys(result).length ? result : undefined;
}

function computeBaseRelevance(destination: DestinationCandidate): number {
  const ratingScore = destination.rating ? clamp(destination.rating / 5) : 0;
  const trendingScore = destination.trending_score ? clamp(destination.trending_score / 10) : 0;
  const savesScore = destination.saves_count ? clamp(destination.saves_count / 200) : 0;
  const viewsScore = destination.views_count ? clamp(destination.views_count / 10000) : 0;
  const popularityScore = clamp(savesScore * 0.6 + viewsScore * 0.4);
  const rankScore = typeof destination.rank_score === 'number' ? clamp(destination.rank_score) : 0;

  const combined = ratingScore * 0.4 + trendingScore * 0.2 + popularityScore * 0.25 + rankScore * 0.15;
  return Number(combined.toFixed(4));
}

export function applyPersonalizationRanking(
  destinations: DestinationCandidate[],
  vector: PreferenceVector,
  limit?: number
): PersonalizedDestination[] {
  if (!destinations || destinations.length === 0) {
    return [];
  }

  const ranked = destinations.map(destination => {
    const personalizationScore = scoreDestination(destination, vector);
    const baseScore = computeBaseRelevance(destination);
    const finalScore = Number((personalizationScore * 0.6 + baseScore * 0.4).toFixed(4));

    return {
      ...destination,
      personalizationScore,
      baseScore,
      finalScore,
    };
  });

  ranked.sort((a, b) => b.finalScore - a.finalScore);

  if (typeof limit === 'number') {
    return ranked.slice(0, limit);
  }

  return ranked;
}

export async function getSmartRecommendations(options: SmartRecommendationOptions): Promise<PersonalizedDestination[]> {
  const context: RecommendationContext = options.context ?? 'personalized';
  const limit = options.limit ?? 20;

  let supabase = options.supabaseClient;
  if (!supabase) {
    try {
      supabase = createServiceRoleClient();
    } catch (error) {
      console.warn('[recommendations] Unable to create Supabase client:', error);
      return [];
    }
  }

  let query = supabase
    .from('destinations')
    .select(
      `id, slug, name, city, category, rating, price_level, tags, trending_score, saves_count, views_count, rank_score`
    )
    .limit(120);

  const categoryFilter = CONTEXT_CATEGORY_FILTERS[context];
  if (categoryFilter?.length) {
    query = query.in('category', categoryFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[recommendations] Failed to load destination candidates:', error);
    return [];
  }

  const derivedSignals = deriveContextSignals(context);
  const combinedSignals = mergeSignals(derivedSignals, options.deviceSignals) ?? derivedSignals;

  const vector = await buildPreferenceVector({
    userId: options.userId ?? null,
    supabaseClient: supabase,
    deviceSignals: combinedSignals,
  });

  return applyPersonalizationRanking(data || [], vector, limit);
}
