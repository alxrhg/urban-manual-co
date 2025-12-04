/**
 * Query Classifier for Hybrid Search Flow
 *
 * Determines whether a query is "simple" (can use fast Supabase search)
 * or "complex" (requires AI understanding)
 */

// Natural language phrases that indicate complex queries requiring AI
const COMPLEX_QUERY_PATTERNS = [
  // Recommendation requests
  /\b(recommend|suggest|show me|find me|looking for|where can i|where should i)\b/i,
  /\b(best|top|great|amazing|perfect|ideal|favorite)\b/i,
  /\b(what are|what's|which|tell me about)\b/i,

  // Mood/vibe descriptors
  /\b(romantic|cozy|trendy|hip|quiet|peaceful|lively|vibrant|upscale|casual)\b/i,
  /\b(hidden gem|off the beaten path|local favorite|tourist trap)\b/i,
  /\b(atmosphere|vibe|ambiance|mood|feel)\b/i,

  // Occasion-based
  /\b(date night|special occasion|anniversary|birthday|celebration|business)\b/i,
  /\b(breakfast|brunch|lunch|dinner|late night|after hours)\b/i,
  /\b(group|family|kids|couples|solo)\b/i,

  // Comparative queries
  /\b(like|similar to|same as|comparable|alternative)\b/i,
  /\b(better than|cheaper than|closer to|near)\b/i,

  // Price/budget
  /\b(cheap|affordable|budget|expensive|splurge|worth it)\b/i,

  // Specific needs
  /\b(vegetarian|vegan|gluten.?free|halal|kosher)\b/i,
  /\b(outdoor|rooftop|terrace|garden|waterfront|view)\b/i,
  /\b(reservation|book|open now|available)\b/i,

  // Trip planning
  /\b(itinerary|trip|travel|visit|explore|day in|weekend in)\b/i,
  /\b(must.?see|must.?try|can't miss|essential)\b/i,

  // Questions
  /\?$/,
];

// Simple query patterns - direct searches
const SIMPLE_QUERY_PATTERNS = [
  // Direct name searches (quoted or specific)
  /^"[^"]+"$/,
  /^[A-Z][a-z]+(\s+[A-Z][a-z]+){0,3}$/,  // Proper nouns like "Noma" or "Four Seasons"
];

// Known cities and categories for quick matching
const KNOWN_CITIES = new Set([
  'tokyo', 'paris', 'new york', 'london', 'rome', 'barcelona', 'berlin',
  'amsterdam', 'sydney', 'dubai', 'los angeles', 'san francisco', 'chicago',
  'miami', 'seattle', 'boston', 'austin', 'denver', 'portland', 'nashville',
  'kyoto', 'osaka', 'hong kong', 'singapore', 'bangkok', 'seoul', 'taipei',
  'melbourne', 'copenhagen', 'stockholm', 'lisbon', 'madrid', 'milan',
  'florence', 'venice', 'munich', 'vienna', 'prague', 'budapest', 'dublin',
  'edinburgh', 'marrakech', 'cape town', 'mexico city', 'buenos aires',
  'rio de janeiro', 'sao paulo', 'toronto', 'vancouver', 'montreal',
]);

const KNOWN_CATEGORIES = new Set([
  'restaurant', 'restaurants', 'hotel', 'hotels', 'bar', 'bars',
  'cafe', 'cafes', 'coffee', 'shop', 'shops', 'museum', 'museums',
  'culture', 'gallery', 'galleries',
]);

export type QueryComplexity = 'simple' | 'complex';

export interface QueryClassification {
  complexity: QueryComplexity;
  confidence: number;
  detectedCity?: string;
  detectedCategory?: string;
  reason: string;
}

/**
 * Classify a search query as simple or complex
 *
 * Simple queries can be handled by fast Supabase full-text search
 * Complex queries require AI understanding for semantic search
 */
export function classifyQuery(query: string): QueryClassification {
  const trimmed = query.trim();
  const lowerQuery = trimmed.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  const wordCount = words.length;

  // Very short queries are likely simple name searches
  if (wordCount <= 2 && trimmed.length <= 20) {
    // Check if it's a city or category
    const detectedCity = words.find(w => KNOWN_CITIES.has(w));
    const detectedCategory = words.find(w => KNOWN_CATEGORIES.has(w));

    return {
      complexity: 'simple',
      confidence: 0.9,
      detectedCity,
      detectedCategory,
      reason: 'Short query - likely direct search',
    };
  }

  // Check for complex query patterns
  for (const pattern of COMPLEX_QUERY_PATTERNS) {
    if (pattern.test(lowerQuery)) {
      return {
        complexity: 'complex',
        confidence: 0.85,
        reason: `Matched pattern: ${pattern.source.substring(0, 30)}...`,
      };
    }
  }

  // Check for simple query patterns
  for (const pattern of SIMPLE_QUERY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        complexity: 'simple',
        confidence: 0.9,
        reason: 'Matched simple query pattern',
      };
    }
  }

  // Check if query is just city + category
  const detectedCity = words.find(w => KNOWN_CITIES.has(w));
  const detectedCategory = words.find(w => KNOWN_CATEGORIES.has(w));

  if (detectedCity || detectedCategory) {
    // If it's just city/category with maybe "in" or "at"
    const nonLocationWords = words.filter(w =>
      !KNOWN_CITIES.has(w) &&
      !KNOWN_CATEGORIES.has(w) &&
      !['in', 'at', 'the', 'a', 'an'].includes(w)
    );

    if (nonLocationWords.length <= 1) {
      return {
        complexity: 'simple',
        confidence: 0.8,
        detectedCity,
        detectedCategory,
        reason: 'City/category query with minimal extra words',
      };
    }
  }

  // Longer queries without explicit patterns - lean towards complex
  if (wordCount >= 5) {
    return {
      complexity: 'complex',
      confidence: 0.7,
      reason: 'Long query likely needs AI understanding',
    };
  }

  // Medium length queries - default to simple for speed
  return {
    complexity: 'simple',
    confidence: 0.6,
    detectedCity,
    detectedCategory,
    reason: 'Medium query - defaulting to fast search',
  };
}

/**
 * Check if a query should trigger AI search enhancement
 *
 * Returns true if the query is complex enough to benefit from AI
 */
export function shouldUseAISearch(query: string): boolean {
  const classification = classifyQuery(query);
  return classification.complexity === 'complex';
}

/**
 * Get the debounce time based on query complexity
 *
 * Simple queries: short debounce for instant feel
 * Complex queries: longer debounce to prevent unnecessary AI calls
 */
export function getDebounceTime(query: string): number {
  const classification = classifyQuery(query);
  return classification.complexity === 'simple' ? 150 : 500;
}
