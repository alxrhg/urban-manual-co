/**
 * Fuzzy matching utilities using Fuse.js
 *
 * Provides fuzzy string matching for place search and NLP inference
 * for budget and group size from natural language.
 */

import Fuse, { IFuseOptions } from 'fuse.js';

export interface SimilarPlace {
  id: number;
  name: string;
  city: string;
  category: string;
  tags?: string[];
  price_level?: number;
  rating?: number;
  cuisine?: string;
  style?: string;
}

interface PlaceDocument {
  id: number;
  name: string;
  city: string;
  category: string;
  tags?: string[];
  price_level?: number;
  rating?: number;
  cuisine?: string;
  style?: string;
}

// Fuse.js configuration for place matching
const FUSE_OPTIONS: IFuseOptions<PlaceDocument> = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'city', weight: 0.2 },
    { name: 'category', weight: 0.1 },
  ],
  threshold: 0.4, // Lower = stricter matching (0-1)
  distance: 100, // How far to search in the string
  includeScore: true,
  minMatchCharLength: 2,
  shouldSort: true,
};

/**
 * Find a similar place by name using Fuse.js fuzzy matching
 */
export async function findSimilarPlace(
  placeName: string,
  userSavedPlaces: any[],
  supabase: any
): Promise<SimilarPlace | null> {
  if (!placeName || placeName.trim().length < 2) {
    return null;
  }

  const searchTerm = placeName.trim();

  // First, search in user's saved places with fuzzy matching
  if (userSavedPlaces && userSavedPlaces.length > 0) {
    const savedDocuments: PlaceDocument[] = userSavedPlaces
      .filter((p) => p.name || p.destination?.name)
      .map((p) => ({
        id: p.id || p.destination?.id,
        name: p.name || p.destination?.name || '',
        city: p.city || p.destination?.city || '',
        category: p.category || p.destination?.category || '',
        tags: p.tags || p.destination?.tags,
        price_level: p.price_level || p.destination?.price_level,
        rating: p.rating || p.destination?.rating,
      }));

    if (savedDocuments.length > 0) {
      const fuse = new Fuse(savedDocuments, FUSE_OPTIONS);
      const results = fuse.search(searchTerm);

      if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.4) {
        const match = results[0].item;
        return {
          id: match.id,
          name: match.name,
          city: match.city,
          category: match.category,
          tags: match.tags,
          price_level: match.price_level,
          rating: match.rating,
        };
      }
    }
  }

  // Search global destinations database
  try {
    // Fetch potential matches from database
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, city, category, tags, price_level, rating, cuisine, style')
      .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
      .limit(50);

    if (error || !data || data.length === 0) {
      return null;
    }

    // Apply Fuse.js fuzzy matching to the results
    const fuse = new Fuse(data as PlaceDocument[], FUSE_OPTIONS);
    const results = fuse.search(searchTerm);

    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
      const match = results[0].item;
      return {
        id: match.id,
        name: match.name,
        city: match.city,
        category: match.category,
        tags: match.tags,
        price_level: match.price_level,
        rating: match.rating,
        cuisine: match.cuisine,
        style: match.style,
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding similar place:', error);
    return null;
  }
}

/**
 * Create a reusable Fuse instance for a collection of places
 * Useful for repeated searches against the same dataset
 */
export function createPlaceSearcher(places: PlaceDocument[]): Fuse<PlaceDocument> {
  return new Fuse(places, FUSE_OPTIONS);
}

/**
 * Search for multiple matching places
 */
export function searchPlaces(
  fuse: Fuse<PlaceDocument>,
  query: string,
  limit: number = 10
): Array<{ item: PlaceDocument; score: number }> {
  const results = fuse.search(query, { limit });
  return results.map((r) => ({
    item: r.item,
    score: r.score ?? 1,
  }));
}

// Budget phrase patterns for inference
const BUDGET_PATTERNS = {
  cheap: /\b(cheap|budget|affordable?|won'?t\s*break|low[- ]?cost|inexpensive)\b/i,
  splurge: /\b(splurge|worth\s*(the\s*)?(money|it)|special\s*occasion|fancy|luxur(y|ious)|upscale|fine\s*dining|high[- ]?end)\b/i,
  moderate: /\b(reasonable|moderate|mid[- ]?range|average|normal)\b/i,
  yen: /(\d+)\s*yen/i,
  dollar: /\$(\d+)/,
  euro: /€(\d+)|(\d+)\s*euro/i,
  pound: /£(\d+)/,
};

/**
 * Infer price level from budget phrases
 */
export function inferPriceFromBudgetPhrase(phrase: string): {
  min?: number;
  max?: number;
  focused?: 'value' | 'splurge';
} {
  const lowerPhrase = phrase.toLowerCase();

  // Budget indicators
  if (BUDGET_PATTERNS.cheap.test(lowerPhrase)) {
    return { max: 2, focused: 'value' };
  }

  // Splurge indicators
  if (BUDGET_PATTERNS.splurge.test(lowerPhrase)) {
    return { min: 3, focused: 'splurge' };
  }

  // Mid-range
  if (BUDGET_PATTERNS.moderate.test(lowerPhrase)) {
    return { min: 2, max: 3 };
  }

  // Extract numeric budget - Yen
  const yenMatch = phrase.match(BUDGET_PATTERNS.yen);
  if (yenMatch) {
    const amount = parseInt(yenMatch[1]);
    if (amount < 2000) return { max: 1 };
    if (amount < 5000) return { max: 2 };
    if (amount < 10000) return { max: 3 };
    return { min: 3 };
  }

  // Extract numeric budget - USD
  const dollarMatch = phrase.match(BUDGET_PATTERNS.dollar);
  if (dollarMatch) {
    const amount = parseInt(dollarMatch[1]);
    if (amount < 20) return { max: 1 };
    if (amount < 50) return { max: 2 };
    if (amount < 100) return { max: 3 };
    return { min: 3 };
  }

  // Extract numeric budget - EUR
  const euroMatch = phrase.match(BUDGET_PATTERNS.euro);
  if (euroMatch) {
    const amount = parseInt(euroMatch[1] || euroMatch[2]);
    if (amount < 20) return { max: 1 };
    if (amount < 50) return { max: 2 };
    if (amount < 100) return { max: 3 };
    return { min: 3 };
  }

  // Extract numeric budget - GBP
  const poundMatch = phrase.match(BUDGET_PATTERNS.pound);
  if (poundMatch) {
    const amount = parseInt(poundMatch[1]);
    if (amount < 15) return { max: 1 };
    if (amount < 40) return { max: 2 };
    if (amount < 80) return { max: 3 };
    return { min: 3 };
  }

  return {};
}

// Group size patterns
const GROUP_PATTERNS = {
  explicit: /\b(?:group\s+of\s+(\d+)|(\d+)\s+(?:people|persons|guests|diners)|party\s+of\s+(\d+))\b/i,
  couple: /\b(couple|two|date\s*night|romantic|anniversary)\b/i,
  solo: /\b(solo|alone|myself|just\s*me|by\s*myself|single)\b/i,
  family: /\b(family|kids|children|with\s*the\s*kids)\b/i,
  large: /\b(large\s*group|big\s*group|many\s*people|corporate|team)\b/i,
  small: /\b(small\s*group|few\s*friends|intimate)\b/i,
};

/**
 * Infer group size from phrase
 */
export function inferGroupSize(phrase: string): number | null {
  // Explicit numeric matches
  const explicitMatch = phrase.match(GROUP_PATTERNS.explicit);
  if (explicitMatch) {
    const num = explicitMatch[1] || explicitMatch[2] || explicitMatch[3];
    const parsed = parseInt(num);
    if (!isNaN(parsed) && parsed > 0 && parsed < 100) {
      return parsed;
    }
  }

  // Pattern-based inference
  if (GROUP_PATTERNS.couple.test(phrase)) return 2;
  if (GROUP_PATTERNS.solo.test(phrase)) return 1;
  if (GROUP_PATTERNS.family.test(phrase)) return 4;
  if (GROUP_PATTERNS.large.test(phrase)) return 8;
  if (GROUP_PATTERNS.small.test(phrase)) return 3;

  return null;
}
