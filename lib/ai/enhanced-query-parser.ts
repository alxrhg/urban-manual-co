/**
 * Enhanced Query Parser
 *
 * Extracts structured attributes from natural language travel queries including:
 * - Cuisines, dietary requirements, seating preferences
 * - Group size, amenities, vibes/atmosphere
 * - Time-based and occasion-based filters
 *
 * Used to improve AI response accuracy by matching all query criteria.
 */

import { generateJSON } from "@/lib/llm";

// ============================================================================
// Types
// ============================================================================

export interface EnhancedParsedQuery {
  // Location
  city?: string | null;
  neighborhood?: string | null;
  country?: string | null;

  // Category
  category?: string | null;

  // Cuisine & Dining
  cuisines?: string[];
  diningStyle?: string[];
  mealTypes?: string[];

  // Dietary & Accessibility
  dietary?: string[];
  accessibility?: string[];

  // Space & Seating
  seatingTypes?: string[];
  groupSize?: number | null;
  privateRoom?: boolean;

  // Amenities & Features
  amenities?: string[];
  features?: string[];

  // Ambiance & Vibes
  vibes?: string[];
  occasion?: string | null;

  // Price & Quality
  priceRange?: "budget" | "mid-range" | "splurge" | null;
  priceLevelMin?: number | null;
  priceLevelMax?: number | null;
  michelinOnly?: boolean;
  ratingMin?: number | null;

  // Temporal
  timeOfDay?: "breakfast" | "lunch" | "dinner" | "late_night" | null;
  mustBeOpenNow?: boolean;
  seasonalRelevance?: string | null;

  // Social Context
  socialContext?:
    | "solo"
    | "date"
    | "group"
    | "business"
    | "family"
    | "friends"
    | null;
  withKids?: boolean;
  petFriendly?: boolean;

  // Booking
  needsReservation?: boolean;
  walkInsOnly?: boolean;

  // Intent
  intent:
    | "search"
    | "recommendation"
    | "discovery"
    | "comparison"
    | "itinerary"
    | "more_like_this";

  // Query understanding
  semanticQuery: string;
  confidence: number;
  unmatchedRequirements?: string[];
}

// ============================================================================
// Keyword Mappings
// ============================================================================

export const CUISINE_KEYWORDS: Record<string, string[]> = {
  japanese: [
    "japanese",
    "sushi",
    "ramen",
    "izakaya",
    "omakase",
    "kaiseki",
    "tempura",
    "udon",
    "soba",
    "yakitori",
    "wagyu",
    "tonkatsu",
  ],
  italian: [
    "italian",
    "pasta",
    "pizza",
    "trattoria",
    "osteria",
    "risotto",
    "gelato",
    "neapolitan",
  ],
  french: [
    "french",
    "bistro",
    "brasserie",
    "patisserie",
    "croissant",
    "crepes",
    "fine french",
  ],
  chinese: [
    "chinese",
    "dim sum",
    "cantonese",
    "szechuan",
    "sichuan",
    "dumpling",
    "peking",
    "shanghainese",
  ],
  korean: ["korean", "bbq", "kbbq", "bibimbap", "kimchi", "korean bbq"],
  thai: ["thai", "pad thai", "thai curry", "som tam", "tom yum"],
  mexican: ["mexican", "tacos", "taqueria", "mezcal", "margarita", "oaxacan"],
  indian: ["indian", "curry", "tandoori", "naan", "biryani", "masala"],
  mediterranean: [
    "mediterranean",
    "greek",
    "hummus",
    "falafel",
    "mezze",
    "levantine",
  ],
  american: ["american", "burger", "bbq", "steakhouse", "diner", "southern"],
  seafood: [
    "seafood",
    "fish",
    "oyster",
    "lobster",
    "crab",
    "sashimi",
    "ceviche",
  ],
  fusion: ["fusion", "modern", "contemporary", "innovative", "new american"],
  vietnamese: ["vietnamese", "pho", "banh mi", "bun"],
  spanish: ["spanish", "tapas", "paella", "pintxos"],
  middle_eastern: ["middle eastern", "lebanese", "persian", "turkish", "kebab"],
};

export const DIETARY_KEYWORDS: Record<string, string[]> = {
  vegetarian: ["vegetarian", "veggie", "meat-free", "no meat"],
  vegan: ["vegan", "plant-based", "plant based", "dairy-free"],
  "gluten-free": [
    "gluten free",
    "gluten-free",
    "celiac",
    "no gluten",
    "gf options",
  ],
  halal: ["halal", "halal-certified"],
  kosher: ["kosher", "kosher-certified"],
  "dairy-free": ["dairy free", "dairy-free", "lactose free", "no dairy"],
  pescatarian: ["pescatarian", "fish only", "no meat but fish"],
  "nut-free": ["nut free", "nut-free", "no nuts", "peanut allergy"],
};

export const SEATING_KEYWORDS: Record<string, string[]> = {
  outdoor: [
    "outdoor",
    "outside",
    "patio",
    "terrace",
    "al fresco",
    "open air",
    "garden seating",
  ],
  rooftop: ["rooftop", "roof", "rooftop bar", "sky bar"],
  garden: ["garden", "courtyard", "backyard"],
  bar: ["bar seating", "counter", "bar seats", "sit at the bar"],
  private: [
    "private room",
    "private dining",
    "private space",
    "separate room",
  ],
  window: ["window seat", "by the window", "window view"],
};

export const AMENITY_KEYWORDS: Record<string, string[]> = {
  wifi: ["wifi", "wi-fi", "internet", "free wifi"],
  parking: ["parking", "valet", "free parking", "garage"],
  "wheelchair-accessible": [
    "wheelchair",
    "accessible",
    "wheelchair accessible",
    "handicap accessible",
    "ada",
  ],
  "live-music": ["live music", "live band", "jazz", "dj"],
  "pet-friendly": ["dog friendly", "pet friendly", "dogs allowed"],
  "kid-friendly": [
    "kid friendly",
    "kids menu",
    "family friendly",
    "highchair",
    "children",
  ],
  "late-night": ["late night", "open late", "after midnight", "24 hours"],
  takeout: ["takeout", "takeaway", "to go", "carry out"],
  delivery: ["delivery", "delivers", "uber eats", "doordash"],
};

export const VIBE_KEYWORDS: Record<string, string[]> = {
  romantic: [
    "romantic",
    "intimate",
    "cozy",
    "date night",
    "anniversary",
    "candlelit",
  ],
  trendy: ["trendy", "hip", "cool", "instagram", "hot spot", "buzzy", "scene"],
  "hidden-gem": [
    "hidden gem",
    "local",
    "secret",
    "off the beaten path",
    "authentic",
    "undiscovered",
    "locals only",
  ],
  upscale: [
    "upscale",
    "fancy",
    "luxury",
    "fine dining",
    "elegant",
    "high-end",
    "splurge",
  ],
  casual: ["casual", "relaxed", "laid back", "chill", "easy going", "informal"],
  lively: ["lively", "energetic", "fun", "vibrant", "bustling", "exciting"],
  quiet: ["quiet", "peaceful", "serene", "calm", "tranquil", "mellow"],
  design: [
    "design",
    "architecture",
    "beautiful space",
    "aesthetic",
    "minimalist",
    "interior",
  ],
  "family-friendly": [
    "family friendly",
    "good for kids",
    "family",
    "children welcome",
  ],
  "business-friendly": [
    "business",
    "work friendly",
    "laptop friendly",
    "meetings",
  ],
};

export const OCCASION_KEYWORDS: Record<string, string[]> = {
  anniversary: ["anniversary", "celebration", "special occasion", "milestone"],
  birthday: ["birthday", "birthday dinner", "celebration"],
  business: ["business", "client", "meeting", "work", "professional"],
  date: ["date", "romantic", "date night", "first date"],
  family: ["family", "parents", "relatives"],
  friends: ["friends", "group", "catch up", "reunion", "guys night", "girls night"],
  brunch: ["brunch", "weekend brunch", "sunday brunch"],
  graduation: ["graduation", "commencement"],
  wedding: ["wedding", "rehearsal dinner", "engagement"],
};

// ============================================================================
// Helper Functions
// ============================================================================

function extractFromKeywords(
  query: string,
  keywords: Record<string, string[]>
): string[] {
  const lowerQuery = query.toLowerCase();
  const found: string[] = [];

  for (const [key, variations] of Object.entries(keywords)) {
    for (const variation of variations) {
      if (lowerQuery.includes(variation)) {
        found.push(key);
        break;
      }
    }
  }

  return found;
}

function extractGroupSize(query: string): number | null {
  // Match patterns like "for 6 people", "party of 8", "6 of us", "group of 10"
  const patterns = [
    /for\s+(\d+)\s+(?:people|persons|guests|diners)/i,
    /party\s+of\s+(\d+)/i,
    /(\d+)\s+(?:of\s+us|people)/i,
    /group\s+of\s+(\d+)/i,
    /table\s+for\s+(\d+)/i,
    /(\d+)\s+(?:person|pax)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

function extractPriceContext(
  query: string
): { range: string | null; min?: number; max?: number } {
  const lowerQuery = query.toLowerCase();

  if (
    /\b(cheap|budget|affordable|inexpensive|value|economical)\b/.test(
      lowerQuery
    )
  ) {
    return { range: "budget", max: 2 };
  }

  if (/\b(mid-range|moderate|reasonable|moderately priced)\b/.test(lowerQuery)) {
    return { range: "mid-range", min: 2, max: 3 };
  }

  if (
    /\b(expensive|splurge|fancy|luxury|high-end|upscale|fine dining|premium)\b/.test(
      lowerQuery
    )
  ) {
    return { range: "splurge", min: 3 };
  }

  return { range: null };
}

function extractTimeContext(
  query: string
): "breakfast" | "lunch" | "dinner" | "late_night" | null {
  const lowerQuery = query.toLowerCase();

  if (/\b(breakfast|morning|brunch)\b/.test(lowerQuery)) {
    return "breakfast";
  }

  if (/\b(lunch|midday|noon)\b/.test(lowerQuery)) {
    return "lunch";
  }

  if (/\b(dinner|evening|supper)\b/.test(lowerQuery)) {
    return "dinner";
  }

  if (/\b(late night|after hours|night|midnight|24\s*hour)\b/.test(lowerQuery)) {
    return "late_night";
  }

  return null;
}

function extractSocialContext(
  query: string
): "solo" | "date" | "group" | "business" | "family" | "friends" | null {
  const lowerQuery = query.toLowerCase();

  if (/\b(solo|alone|by myself|just me)\b/.test(lowerQuery)) {
    return "solo";
  }

  if (/\b(date|romantic|anniversary|couples?|partner)\b/.test(lowerQuery)) {
    return "date";
  }

  if (/\b(group|party of|people|friends|bunch of us)\b/.test(lowerQuery)) {
    return "group";
  }

  if (/\b(business|client|meeting|corporate|work)\b/.test(lowerQuery)) {
    return "business";
  }

  if (/\b(family|kids|children|parents|relatives)\b/.test(lowerQuery)) {
    return "family";
  }

  if (/\b(friends|catch up|reunion)\b/.test(lowerQuery)) {
    return "friends";
  }

  return null;
}

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parse a natural language query and extract all structured attributes.
 * Uses a combination of keyword matching (fast) and optional LLM enhancement (accurate).
 */
export async function parseEnhancedQuery(
  query: string,
  options: {
    useLLM?: boolean;
    userContext?: {
      currentCity?: string;
      savedPlaces?: Array<{ name: string; city: string; category: string }>;
    };
  } = {}
): Promise<EnhancedParsedQuery> {
  const { useLLM = false, userContext } = options;

  // Start with keyword-based extraction (always fast)
  const keywordParsed = parseQueryWithKeywords(query, userContext);

  // Optionally enhance with LLM for complex queries
  if (useLLM && (query.length > 50 || keywordParsed.confidence < 0.6)) {
    try {
      const llmEnhanced = await enhanceWithLLM(query, keywordParsed);
      return llmEnhanced;
    } catch (error) {
      console.error("LLM enhancement failed, using keyword parsing:", error);
    }
  }

  return keywordParsed;
}

/**
 * Fast keyword-based query parsing (no LLM calls)
 */
export function parseQueryWithKeywords(
  query: string,
  userContext?: {
    currentCity?: string;
    savedPlaces?: Array<{ name: string; city: string; category: string }>;
  }
): EnhancedParsedQuery {
  const lowerQuery = query.toLowerCase();

  // Extract all attributes
  const cuisines = extractFromKeywords(query, CUISINE_KEYWORDS);
  const dietary = extractFromKeywords(query, DIETARY_KEYWORDS);
  const seatingTypes = extractFromKeywords(query, SEATING_KEYWORDS);
  const amenities = extractFromKeywords(query, AMENITY_KEYWORDS);
  const vibes = extractFromKeywords(query, VIBE_KEYWORDS);
  const groupSize = extractGroupSize(query);
  const priceContext = extractPriceContext(query);
  const timeOfDay = extractTimeContext(query);
  const socialContext = extractSocialContext(query);

  // Extract occasion
  let occasion: string | null = null;
  for (const [occ, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        occasion = occ;
        break;
      }
    }
    if (occasion) break;
  }

  // Detect special flags
  const michelinOnly = /\b(michelin|starred|stars?)\b/.test(lowerQuery);
  const mustBeOpenNow = /\b(open now|open right now|currently open)\b/.test(
    lowerQuery
  );
  const needsReservation = /\b(reservation|book|booking|reserve)\b/.test(
    lowerQuery
  );
  const walkInsOnly = /\b(walk.?in|no reservation|without reservation)\b/.test(
    lowerQuery
  );
  const privateRoom = /\b(private room|private dining|private space)\b/.test(
    lowerQuery
  );
  const withKids = /\b(kids?|children|family|highchair)\b/.test(lowerQuery);
  const petFriendly = /\b(dog|pet|dogs allowed)\b/.test(lowerQuery);

  // Determine intent
  let intent: EnhancedParsedQuery["intent"] = "search";
  if (/\b(recommend|suggestion|what should|where should)\b/.test(lowerQuery)) {
    intent = "recommendation";
  } else if (/\b(discover|explore|surprise|hidden|secret)\b/.test(lowerQuery)) {
    intent = "discovery";
  } else if (
    /\b(compare|vs|versus|better|difference)\b/.test(lowerQuery)
  ) {
    intent = "comparison";
  } else if (
    /\b(plan|itinerary|day in|schedule|trip)\b/.test(lowerQuery)
  ) {
    intent = "itinerary";
  } else if (
    /\b(more like|similar to|like this)\b/.test(lowerQuery)
  ) {
    intent = "more_like_this";
  }

  // Calculate confidence based on how many attributes were extracted
  const extractedCount =
    (cuisines.length > 0 ? 1 : 0) +
    (dietary.length > 0 ? 1 : 0) +
    (seatingTypes.length > 0 ? 1 : 0) +
    (vibes.length > 0 ? 1 : 0) +
    (groupSize ? 1 : 0) +
    (priceContext.range ? 1 : 0) +
    (timeOfDay ? 1 : 0) +
    (socialContext ? 1 : 0);

  // Higher confidence if we extracted more attributes
  const confidence = Math.min(0.5 + extractedCount * 0.1, 0.95);

  return {
    cuisines: cuisines.length > 0 ? cuisines : undefined,
    dietary: dietary.length > 0 ? dietary : undefined,
    seatingTypes: seatingTypes.length > 0 ? seatingTypes : undefined,
    amenities: amenities.length > 0 ? amenities : undefined,
    vibes: vibes.length > 0 ? vibes : undefined,
    groupSize,
    privateRoom: privateRoom || undefined,
    priceRange: priceContext.range as EnhancedParsedQuery["priceRange"],
    priceLevelMin: priceContext.min,
    priceLevelMax: priceContext.max,
    michelinOnly: michelinOnly || undefined,
    timeOfDay,
    mustBeOpenNow: mustBeOpenNow || undefined,
    socialContext,
    withKids: withKids || undefined,
    petFriendly: petFriendly || undefined,
    occasion,
    needsReservation: needsReservation || undefined,
    walkInsOnly: walkInsOnly || undefined,
    intent,
    semanticQuery: query,
    confidence,
    city: userContext?.currentCity,
  };
}

/**
 * Enhance parsed query with LLM for complex queries
 */
async function enhanceWithLLM(
  query: string,
  keywordParsed: EnhancedParsedQuery
): Promise<EnhancedParsedQuery> {
  const systemPrompt = `You are a travel query parser. Extract structured information from the query.

Return JSON with these fields (only include fields that are present in the query):
{
  "city": string | null,
  "neighborhood": string | null,
  "category": "restaurant" | "hotel" | "cafe" | "bar" | "shop" | null,
  "cuisines": string[] (e.g., ["japanese", "italian"]),
  "dietary": string[] (e.g., ["vegetarian", "gluten-free"]),
  "seatingTypes": string[] (e.g., ["outdoor", "rooftop"]),
  "amenities": string[] (e.g., ["wifi", "parking", "wheelchair-accessible"]),
  "vibes": string[] (e.g., ["romantic", "trendy", "hidden-gem"]),
  "groupSize": number | null,
  "priceRange": "budget" | "mid-range" | "splurge" | null,
  "timeOfDay": "breakfast" | "lunch" | "dinner" | "late_night" | null,
  "socialContext": "solo" | "date" | "group" | "business" | "family" | "friends" | null,
  "occasion": string | null,
  "michelinOnly": boolean,
  "withKids": boolean,
  "petFriendly": boolean,
  "unmatchedRequirements": string[] (requirements that might be hard to match)
}

Only return valid JSON. Focus on what's explicitly stated or strongly implied.`;

  const result = await generateJSON(systemPrompt, `Parse this query: "${query}"`);

  if (!result) {
    return keywordParsed;
  }

  // Merge LLM results with keyword results (LLM takes precedence for complex fields)
  return {
    ...keywordParsed,
    city: result.city || keywordParsed.city,
    neighborhood: result.neighborhood || keywordParsed.neighborhood,
    category: result.category || keywordParsed.category,
    cuisines:
      result.cuisines?.length > 0 ? result.cuisines : keywordParsed.cuisines,
    dietary: result.dietary?.length > 0 ? result.dietary : keywordParsed.dietary,
    seatingTypes:
      result.seatingTypes?.length > 0
        ? result.seatingTypes
        : keywordParsed.seatingTypes,
    amenities:
      result.amenities?.length > 0 ? result.amenities : keywordParsed.amenities,
    vibes: result.vibes?.length > 0 ? result.vibes : keywordParsed.vibes,
    groupSize: result.groupSize ?? keywordParsed.groupSize,
    priceRange: result.priceRange || keywordParsed.priceRange,
    timeOfDay: result.timeOfDay || keywordParsed.timeOfDay,
    socialContext: result.socialContext || keywordParsed.socialContext,
    occasion: result.occasion || keywordParsed.occasion,
    michelinOnly: result.michelinOnly ?? keywordParsed.michelinOnly,
    withKids: result.withKids ?? keywordParsed.withKids,
    petFriendly: result.petFriendly ?? keywordParsed.petFriendly,
    unmatchedRequirements: result.unmatchedRequirements,
    confidence: 0.9, // Higher confidence with LLM
  };
}

/**
 * Get a list of filters that were requested but may be hard to match
 */
export function getRequestedFilters(
  parsed: EnhancedParsedQuery
): { filter: string; value: string }[] {
  const filters: { filter: string; value: string }[] = [];

  if (parsed.cuisines?.length) {
    filters.push({ filter: "cuisines", value: parsed.cuisines.join(", ") });
  }
  if (parsed.dietary?.length) {
    filters.push({ filter: "dietary", value: parsed.dietary.join(", ") });
  }
  if (parsed.seatingTypes?.length) {
    filters.push({ filter: "seating", value: parsed.seatingTypes.join(", ") });
  }
  if (parsed.amenities?.length) {
    filters.push({ filter: "amenities", value: parsed.amenities.join(", ") });
  }
  if (parsed.vibes?.length) {
    filters.push({ filter: "vibes", value: parsed.vibes.join(", ") });
  }
  if (parsed.groupSize) {
    filters.push({
      filter: "group size",
      value: `${parsed.groupSize} people`,
    });
  }
  if (parsed.priceRange) {
    filters.push({ filter: "price", value: parsed.priceRange });
  }
  if (parsed.timeOfDay) {
    filters.push({ filter: "meal time", value: parsed.timeOfDay });
  }
  if (parsed.occasion) {
    filters.push({ filter: "occasion", value: parsed.occasion });
  }
  if (parsed.michelinOnly) {
    filters.push({ filter: "quality", value: "Michelin starred" });
  }
  if (parsed.withKids) {
    filters.push({ filter: "suitability", value: "kid-friendly" });
  }
  if (parsed.petFriendly) {
    filters.push({ filter: "suitability", value: "pet-friendly" });
  }

  return filters;
}
