/**
 * Centralized Category Resolution System
 *
 * This module provides a single source of truth for mapping user input
 * to database category values. All search routes should use this instead
 * of maintaining their own synonym mappings.
 *
 * Database categories: Dining, Hotel, Bar, Cafe, Culture, Shopping, Bakery, Park, Other
 */

/**
 * Valid database category values
 */
export const VALID_CATEGORIES = [
  'Dining',
  'Hotel',
  'Bar',
  'Cafe',
  'Culture',
  'Shopping',
  'Bakery',
  'Park',
  'Other',
] as const;

export type CategoryType = typeof VALID_CATEGORIES[number];

/**
 * Comprehensive synonym mapping from natural language to database categories.
 * Keys are lowercase, values are the exact database category strings.
 */
const CATEGORY_SYNONYMS: Record<string, CategoryType> = {
  // Dining (restaurants, food establishments)
  'restaurant': 'Dining',
  'restaurants': 'Dining',
  'dining': 'Dining',
  'food': 'Dining',
  'eat': 'Dining',
  'eating': 'Dining',
  'meal': 'Dining',
  'meals': 'Dining',
  'dinner': 'Dining',
  'lunch': 'Dining',
  'brunch': 'Dining',
  'eatery': 'Dining',
  'eateries': 'Dining',
  'bistro': 'Dining',
  'brasserie': 'Dining',
  'trattoria': 'Dining',
  'osteria': 'Dining',
  'izakaya': 'Dining',
  'tavern': 'Dining',
  'gastropub': 'Dining',
  'steakhouse': 'Dining',
  'pizzeria': 'Dining',
  'sushi': 'Dining',
  'ramen': 'Dining',
  'fine dining': 'Dining',
  'casual dining': 'Dining',

  // Hotel (accommodation)
  'hotel': 'Hotel',
  'hotels': 'Hotel',
  'stay': 'Hotel',
  'stays': 'Hotel',
  'accommodation': 'Hotel',
  'accommodations': 'Hotel',
  'lodging': 'Hotel',
  'lodge': 'Hotel',
  'resort': 'Hotel',
  'resorts': 'Hotel',
  'inn': 'Hotel',
  'inns': 'Hotel',
  'motel': 'Hotel',
  'hostel': 'Hotel',
  'guesthouse': 'Hotel',
  'bed and breakfast': 'Hotel',
  'b&b': 'Hotel',
  'ryokan': 'Hotel',
  'boutique hotel': 'Hotel',
  'sleep': 'Hotel',
  'overnight': 'Hotel',

  // Bar (drinks, nightlife)
  'bar': 'Bar',
  'bars': 'Bar',
  'drink': 'Bar',
  'drinks': 'Bar',
  'drinking': 'Bar',
  'cocktail': 'Bar',
  'cocktails': 'Bar',
  'nightlife': 'Bar',
  'pub': 'Bar',
  'pubs': 'Bar',
  'wine bar': 'Bar',
  'wine': 'Bar',
  'speakeasy': 'Bar',
  'lounge': 'Bar',
  'rooftop bar': 'Bar',
  'dive bar': 'Bar',
  'sports bar': 'Bar',
  'beer': 'Bar',
  'brewery': 'Bar',
  'sake': 'Bar',
  'whiskey': 'Bar',
  'club': 'Bar',
  'nightclub': 'Bar',

  // Cafe (coffee, casual spots)
  'cafe': 'Cafe',
  'cafes': 'Cafe',
  'café': 'Cafe',
  'cafés': 'Cafe',
  'coffee': 'Cafe',
  'coffeeshop': 'Cafe',
  'coffee shop': 'Cafe',
  'espresso': 'Cafe',
  'tea': 'Cafe',
  'teahouse': 'Cafe',
  'tea house': 'Cafe',
  'patisserie': 'Cafe',

  // Culture (museums, galleries, attractions)
  'culture': 'Culture',
  'cultural': 'Culture',
  'museum': 'Culture',
  'museums': 'Culture',
  'gallery': 'Culture',
  'galleries': 'Culture',
  'art': 'Culture',
  'art gallery': 'Culture',
  'exhibition': 'Culture',
  'exhibitions': 'Culture',
  'landmark': 'Culture',
  'landmarks': 'Culture',
  'monument': 'Culture',
  'monuments': 'Culture',
  'attraction': 'Culture',
  'attractions': 'Culture',
  'sightseeing': 'Culture',
  'temple': 'Culture',
  'shrine': 'Culture',
  'church': 'Culture',
  'cathedral': 'Culture',
  'palace': 'Culture',
  'castle': 'Culture',
  'historic': 'Culture',
  'historical': 'Culture',
  'heritage': 'Culture',
  'theater': 'Culture',
  'theatre': 'Culture',
  'opera': 'Culture',
  'concert hall': 'Culture',

  // Shopping
  'shopping': 'Shopping',
  'shop': 'Shopping',
  'shops': 'Shopping',
  'store': 'Shopping',
  'stores': 'Shopping',
  'retail': 'Shopping',
  'boutique': 'Shopping',
  'boutiques': 'Shopping',
  'mall': 'Shopping',
  'market': 'Shopping',
  'markets': 'Shopping',
  'flea market': 'Shopping',
  'vintage': 'Shopping',
  'antique': 'Shopping',
  'antiques': 'Shopping',
  'fashion': 'Shopping',
  'clothing': 'Shopping',
  'bookstore': 'Shopping',
  'bookshop': 'Shopping',

  // Bakery
  'bakery': 'Bakery',
  'bakeries': 'Bakery',
  'bread': 'Bakery',
  'pastry': 'Bakery',
  'pastries': 'Bakery',
  'croissant': 'Bakery',
  'boulangerie': 'Bakery',

  // Park (outdoor, nature)
  'park': 'Park',
  'parks': 'Park',
  'garden': 'Park',
  'gardens': 'Park',
  'outdoor': 'Park',
  'nature': 'Park',
  'beach': 'Park',
  'beaches': 'Park',

  // Other (wellness, spa, etc.)
  'spa': 'Other',
  'wellness': 'Other',
  'gym': 'Other',
  'fitness': 'Other',
  'other': 'Other',
};

/**
 * Resolves a user input string to the correct database category.
 *
 * @param input - User's category input (e.g., "restaurant", "restaurants", "food")
 * @returns The database category (e.g., "Dining") or null if no match
 *
 * @example
 * resolveCategory('restaurant')  // Returns 'Dining'
 * resolveCategory('restaurants') // Returns 'Dining'
 * resolveCategory('HOTEL')       // Returns 'Hotel'
 * resolveCategory('xyz')         // Returns null
 */
export function resolveCategory(input: string | null | undefined): CategoryType | null {
  if (!input) return null;

  const normalized = input.toLowerCase().trim();

  // Direct synonym lookup
  if (CATEGORY_SYNONYMS[normalized]) {
    return CATEGORY_SYNONYMS[normalized];
  }

  // Check if already a valid category (case-insensitive)
  const matchedCategory = VALID_CATEGORIES.find(
    cat => cat.toLowerCase() === normalized
  );
  if (matchedCategory) {
    return matchedCategory;
  }

  // Partial match for compound phrases
  for (const [synonym, category] of Object.entries(CATEGORY_SYNONYMS)) {
    if (normalized.includes(synonym) || synonym.includes(normalized)) {
      return category;
    }
  }

  return null;
}

/**
 * Check if a string is a valid database category
 */
export function isValidCategory(input: string): input is CategoryType {
  return VALID_CATEGORIES.includes(input as CategoryType);
}

/**
 * Get all synonyms that map to a given category
 */
export function getSynonymsForCategory(category: CategoryType): string[] {
  return Object.entries(CATEGORY_SYNONYMS)
    .filter(([, cat]) => cat === category)
    .map(([synonym]) => synonym);
}

/**
 * For NLU prompts: Returns a formatted string of valid categories and their synonyms
 */
export function getCategoryDocumentation(): string {
  const categoryGroups: Record<CategoryType, string[]> = {} as Record<CategoryType, string[]>;

  for (const [synonym, category] of Object.entries(CATEGORY_SYNONYMS)) {
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(synonym);
  }

  return Object.entries(categoryGroups)
    .map(([category, synonyms]) => {
      const uniqueSynonyms = [...new Set(synonyms)].slice(0, 8).join(', ');
      return `- ${category}: ${uniqueSynonyms}`;
    })
    .join('\n');
}
