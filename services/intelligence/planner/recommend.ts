import { haversineDistance } from './utils';
import { preferenceBoost } from '@/services/analytics/recommendationBoost';

interface Place {
  city: string;
  categories: string[];
  lat?: number;
  lng?: number;
  [key: string]: any;
}

export interface Recommendation extends Place {
  source: 'curated' | 'google';
  score: number;
}

interface UserPreferences {
  cities: Record<string, number>;
  categories: Record<string, number>;
  priceLevels: Record<string, number>;
  michelinBias: number;
}

export function recommendFromCurated(
  city: string,
  mealType: string,
  curated: Place[]
): Recommendation[] {
  return curated
    .filter((p) => p.city === city && p.categories.includes(mealType))
    .map((p) => ({ source: 'curated' as const, score: 1, ...p }));
}

export function blendRecommendations(
  curatedList: Recommendation[],
  googleList: Recommendation[],
  userPrefs?: UserPreferences
): Recommendation[] {
  // If no user preferences, use default scoring
  if (!userPrefs) {
    const scored: Recommendation[] = [
      ...curatedList.map((p) => ({ ...p, score: 1 })),
      ...googleList.map((p) => ({ ...p, score: 0.65, source: 'google' as const })),
    ];
    return scored.sort((a, b) => b.score - a.score);
  }

  // Apply preference boost to scores
  const scored: Recommendation[] = [
    ...curatedList.map((p) => ({
      ...p,
      score: 1 + preferenceBoost(p, userPrefs),
    })),
    ...googleList.map((p) => ({
      ...p,
      score: 0.65 + preferenceBoost(p, userPrefs),
      source: 'google' as const,
    })),
  ];

  return scored.sort((a, b) => b.score - a.score);
}

