/**
 * Standardized Category System
 * Single source of truth for all destination categories
 */

// Valid categories - use these exact values in the database
export const VALID_CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Bar',
  'Hotel',
  'Culture',
  'Shopping',
  'Bakery',
  'Park',
  'Other',
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

// Mapping of various inputs to standardized categories
// Keys are lowercase for case-insensitive matching
export const CATEGORY_MAPPINGS: Record<string, ValidCategory> = {
  // Restaurant variations
  restaurant: 'Restaurant',
  restaurants: 'Restaurant',
  dining: 'Restaurant',
  food: 'Restaurant',
  'eat & drink': 'Restaurant',
  eatery: 'Restaurant',
  bistro: 'Restaurant',
  brasserie: 'Restaurant',
  trattoria: 'Restaurant',
  pizzeria: 'Restaurant',
  steakhouse: 'Restaurant',
  sushi: 'Restaurant',
  ramen: 'Restaurant',
  izakaya: 'Restaurant',

  // Cafe variations
  cafe: 'Cafe',
  cafes: 'Cafe',
  café: 'Cafe',
  cafés: 'Cafe',
  coffee: 'Cafe',
  'coffee shop': 'Cafe',
  coffeehouse: 'Cafe',
  'tea house': 'Cafe',
  teahouse: 'Cafe',

  // Bar variations
  bar: 'Bar',
  bars: 'Bar',
  pub: 'Bar',
  pubs: 'Bar',
  nightlife: 'Bar',
  nightclub: 'Bar',
  'night club': 'Bar',
  lounge: 'Bar',
  speakeasy: 'Bar',
  cocktail: 'Bar',
  'cocktail bar': 'Bar',
  'wine bar': 'Bar',

  // Hotel variations
  hotel: 'Hotel',
  hotels: 'Hotel',
  lodging: 'Hotel',
  accommodation: 'Hotel',
  stay: 'Hotel',
  hostel: 'Hotel',
  'bed and breakfast': 'Hotel',
  'b&b': 'Hotel',
  resort: 'Hotel',
  inn: 'Hotel',
  ryokan: 'Hotel',

  // Culture variations
  culture: 'Culture',
  museum: 'Culture',
  museums: 'Culture',
  gallery: 'Culture',
  galleries: 'Culture',
  'art gallery': 'Culture',
  art: 'Culture',
  theater: 'Culture',
  theatre: 'Culture',
  cinema: 'Culture',
  landmark: 'Culture',
  attraction: 'Culture',
  'tourist attraction': 'Culture',
  monument: 'Culture',
  historic: 'Culture',
  library: 'Culture',
  space: 'Culture',
  architecture: 'Culture',

  // Shopping variations
  shopping: 'Shopping',
  shop: 'Shopping',
  shops: 'Shopping',
  store: 'Shopping',
  stores: 'Shopping',
  retail: 'Shopping',
  boutique: 'Shopping',
  market: 'Shopping',
  mall: 'Shopping',

  // Bakery variations
  bakery: 'Bakery',
  bakeries: 'Bakery',
  patisserie: 'Bakery',
  pastry: 'Bakery',
  sweets: 'Bakery',
  dessert: 'Bakery',
  'dessert shop': 'Bakery',

  // Park variations
  park: 'Park',
  parks: 'Park',
  garden: 'Park',
  gardens: 'Park',
  outdoor: 'Park',
  nature: 'Park',
  beach: 'Park',

  // Other/fallback
  other: 'Other',
  others: 'Other',
  spa: 'Other',
  gym: 'Other',
  fitness: 'Other',
  'beauty salon': 'Other',
  activity: 'Other',
  activities: 'Other',
  sports: 'Other',
};

/**
 * Normalize a category string to a valid category
 * Returns the standardized category or 'Other' if not found
 */
export function normalizeCategory(input: string | null | undefined): ValidCategory {
  if (!input) return 'Other';

  const key = input.toLowerCase().trim();

  // Direct mapping
  if (CATEGORY_MAPPINGS[key]) {
    return CATEGORY_MAPPINGS[key];
  }

  // Check if it's already a valid category (case-insensitive)
  const validMatch = VALID_CATEGORIES.find(
    (cat) => cat.toLowerCase() === key
  );
  if (validMatch) {
    return validMatch;
  }

  // Partial matching for compound categories
  for (const [mapKey, value] of Object.entries(CATEGORY_MAPPINGS)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return value;
    }
  }

  return 'Other';
}

/**
 * Check if a category is valid (exact match)
 */
export function isValidCategory(category: string): category is ValidCategory {
  return VALID_CATEGORIES.includes(category as ValidCategory);
}

/**
 * Get display name for a category (currently same as category)
 */
export function getCategoryDisplayName(category: ValidCategory): string {
  return category;
}

/**
 * Map Google Places types to our categories
 */
export function categoryFromGoogleTypes(types: string[]): ValidCategory | null {
  const typeMap: Record<string, ValidCategory> = {
    restaurant: 'Restaurant',
    meal_takeaway: 'Restaurant',
    meal_delivery: 'Restaurant',
    food: 'Restaurant',
    cafe: 'Cafe',
    coffee_shop: 'Cafe',
    bar: 'Bar',
    night_club: 'Bar',
    lodging: 'Hotel',
    hotel: 'Hotel',
    museum: 'Culture',
    art_gallery: 'Culture',
    library: 'Culture',
    tourist_attraction: 'Culture',
    shopping_mall: 'Shopping',
    store: 'Shopping',
    clothing_store: 'Shopping',
    shoe_store: 'Shopping',
    jewelry_store: 'Shopping',
    electronics_store: 'Shopping',
    book_store: 'Shopping',
    furniture_store: 'Shopping',
    home_goods_store: 'Shopping',
    department_store: 'Shopping',
    bakery: 'Bakery',
    park: 'Park',
    spa: 'Other',
    gym: 'Other',
    beauty_salon: 'Other',
    hair_care: 'Other',
  };

  for (const type of types) {
    if (typeMap[type]) {
      return typeMap[type];
    }
  }

  return null;
}
