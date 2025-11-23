interface Place {
  city?: string;
  category?: string;
  michelin?: boolean;
  [key: string]: any;
}

interface UserPreferences {
  cities: Record<string, number>;
  categories: Record<string, number>;
  priceLevels: Record<string, number>;
  michelinBias: number;
}

/**
 * Calculate preference boost score for a place based on user preferences
 * Higher score means better match with user's historical preferences
 * @param place The place to score
 * @param prefs User preferences learned from history
 * @returns Boost score (0-1 range typically)
 */
export function preferenceBoost(place: Place, prefs: UserPreferences): number {
  let score = 0;

  // City preference boost (0.3 max)
  if (place.city && prefs.cities[place.city]) {
    score += 0.3;
  }

  // Category preference boost (0.4 max)
  if (place.category && prefs.categories[place.category]) {
    score += 0.4;
  }

  // Michelin bias boost (scaled by user's Michelin preference)
  if (place.michelin) {
    score += prefs.michelinBias * 0.05;
  }

  return score;
}

