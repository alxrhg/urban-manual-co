import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling } from '@/lib/errors';

/**
 * Fast instant search endpoint for simple queries
 * Uses Supabase full-text search without AI/embeddings for immediate results
 *
 * Simple queries: city names, category names, destination names
 * Complex queries should use /api/ai-chat for semantic understanding
 */

// Category synonyms for fast matching
const categorySynonyms: Record<string, string> = {
  'restaurant': 'Restaurant',
  'restaurants': 'Restaurant',
  'dining': 'Restaurant',
  'food': 'Restaurant',
  'eat': 'Restaurant',
  'meal': 'Restaurant',
  'hotel': 'Hotel',
  'hotels': 'Hotel',
  'stay': 'Hotel',
  'accommodation': 'Hotel',
  'lodging': 'Hotel',
  'cafe': 'Cafe',
  'cafes': 'Cafe',
  'coffee': 'Cafe',
  'bar': 'Bar',
  'bars': 'Bar',
  'drink': 'Bar',
  'drinks': 'Bar',
  'cocktail': 'Bar',
  'cocktails': 'Bar',
  'nightlife': 'Bar',
  'culture': 'Culture',
  'museum': 'Culture',
  'museums': 'Culture',
  'art': 'Culture',
  'gallery': 'Culture',
  'shop': 'Shop',
  'shops': 'Shop',
  'shopping': 'Shop',
  'store': 'Shop',
  'stores': 'Shop',
};

// Known cities for fast matching
const knownCities = [
  'tokyo', 'paris', 'new york', 'london', 'rome', 'barcelona', 'berlin',
  'amsterdam', 'sydney', 'dubai', 'los angeles', 'san francisco', 'chicago',
  'miami', 'seattle', 'boston', 'austin', 'denver', 'portland', 'nashville',
  'kyoto', 'osaka', 'hong kong', 'singapore', 'bangkok', 'seoul', 'taipei',
  'melbourne', 'copenhagen', 'stockholm', 'lisbon', 'madrid', 'milan',
  'florence', 'venice', 'munich', 'vienna', 'prague', 'budapest', 'dublin',
  'edinburgh', 'marrakech', 'cape town', 'mexico city', 'buenos aires',
  'rio de janeiro', 'sao paulo', 'toronto', 'vancouver', 'montreal',
];

// Parse simple query to extract city and category
function parseSimpleQuery(query: string): {
  city?: string;
  category?: string;
  searchTerms: string[];
} {
  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);

  let city: string | undefined;
  let category: string | undefined;
  const searchTerms: string[] = [];

  // Check for city matches (including multi-word cities)
  for (const cityName of knownCities) {
    if (lowerQuery.includes(cityName)) {
      city = cityName;
      break;
    }
  }

  // Check for category matches
  for (const word of words) {
    const normalized = categorySynonyms[word];
    if (normalized) {
      category = normalized;
      break;
    }
  }

  // Collect remaining search terms
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    const isCity = city && city.includes(lowerWord);
    const isCategory = categorySynonyms[lowerWord];
    const isStopWord = ['in', 'at', 'the', 'a', 'an', 'for', 'to', 'of', 'and', 'or'].includes(lowerWord);

    if (!isCity && !isCategory && !isStopWord && word.length > 2) {
      searchTerms.push(word);
    }
  }

  return { city, category, searchTerms };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createServerClient();
  const PAGE_SIZE = 12;

  try {
    const body = await request.json();
    const { query, filters = {} } = body;

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        results: [],
        searchTier: 'instant',
        message: 'Query too short'
      });
    }

    const trimmedQuery = query.trim();
    const parsed = parseSimpleQuery(trimmedQuery);

    // Build the query
    let dbQuery = supabase
      .from('destinations')
      .select('id, slug, name, city, category, micro_description, description, image, michelin_stars, crown, rating, price_level, brand, latitude, longitude')
      .limit(PAGE_SIZE);

    // Apply city filter
    const cityFilter = parsed.city || filters.city;
    if (cityFilter) {
      dbQuery = dbQuery.ilike('city', `%${cityFilter}%`);
    }

    // Apply category filter
    const categoryFilter = parsed.category || filters.category;
    if (categoryFilter) {
      dbQuery = dbQuery.ilike('category', `%${categoryFilter}%`);
    }

    // Apply text search
    if (parsed.searchTerms.length > 0 || (!parsed.city && !parsed.category)) {
      const searchText = parsed.searchTerms.length > 0
        ? parsed.searchTerms.join(' ')
        : trimmedQuery;

      // Search across name, description, and search_text columns
      dbQuery = dbQuery.or(
        `name.ilike.%${searchText}%,description.ilike.%${searchText}%,micro_description.ilike.%${searchText}%,search_text.ilike.%${searchText}%`
      );
    }

    // Apply additional filters from request
    if (filters.rating) {
      dbQuery = dbQuery.gte('rating', filters.rating);
    }
    if (filters.priceLevel) {
      dbQuery = dbQuery.lte('price_level', filters.priceLevel);
    }
    if (filters.michelinStar) {
      dbQuery = dbQuery.gte('michelin_stars', filters.michelinStar);
    }

    const { data: results, error } = await dbQuery;

    if (error) {
      console.error('[Instant Search] Query error:', error);
      return NextResponse.json({
        results: [],
        searchTier: 'instant',
        error: 'Search failed'
      }, { status: 500 });
    }

    // Rank results by relevance
    const lowerQuery = trimmedQuery.toLowerCase();
    const rankedResults = (results || [])
      .map(dest => {
        let score = 0;
        const lowerName = (dest.name || '').toLowerCase();
        const lowerDesc = (dest.description || '').toLowerCase();
        const lowerCity = (dest.city || '').toLowerCase();
        const lowerCategory = (dest.category || '').toLowerCase();

        // Strong boost for exact name match
        if (lowerName === lowerQuery) score += 1.0;
        else if (lowerName.includes(lowerQuery)) score += 0.5;

        // Boost for city match
        if (parsed.city && lowerCity.includes(parsed.city)) score += 0.3;

        // Boost for category match
        if (parsed.category && lowerCategory.includes(parsed.category.toLowerCase())) score += 0.2;

        // Boost for Michelin stars
        if (dest.michelin_stars) score += dest.michelin_stars * 0.1;

        // Boost for high ratings
        if (dest.rating && dest.rating >= 4.5) score += 0.1;

        // Boost for crown
        if (dest.crown) score += 0.1;

        return { ...dest, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      results: rankedResults,
      searchTier: 'instant',
      parsed: {
        city: parsed.city,
        category: parsed.category,
        searchTerms: parsed.searchTerms,
      },
    });

  } catch (error: any) {
    console.error('[Instant Search] Error:', error);
    return NextResponse.json({
      results: [],
      searchTier: 'instant',
      error: error.message || 'Search failed',
    }, { status: 500 });
  }
});

// Also support GET for simple queries
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || searchParams.get('query');

  if (!query) {
    return NextResponse.json({
      results: [],
      searchTier: 'instant',
      message: 'Query parameter required'
    });
  }

  // Reuse POST handler logic
  const mockRequest = {
    json: async () => ({ query }),
  } as NextRequest;

  // Create a new request with the query
  const body = { query };
  const supabase = await createServerClient();
  const PAGE_SIZE = 12;

  const trimmedQuery = query.trim();
  const parsed = parseSimpleQuery(trimmedQuery);

  let dbQuery = supabase
    .from('destinations')
    .select('id, slug, name, city, category, micro_description, description, image, michelin_stars, crown, rating, price_level, brand, latitude, longitude')
    .limit(PAGE_SIZE);

  if (parsed.city) {
    dbQuery = dbQuery.ilike('city', `%${parsed.city}%`);
  }

  if (parsed.category) {
    dbQuery = dbQuery.ilike('category', `%${parsed.category}%`);
  }

  if (parsed.searchTerms.length > 0 || (!parsed.city && !parsed.category)) {
    const searchText = parsed.searchTerms.length > 0
      ? parsed.searchTerms.join(' ')
      : trimmedQuery;

    dbQuery = dbQuery.or(
      `name.ilike.%${searchText}%,description.ilike.%${searchText}%,micro_description.ilike.%${searchText}%`
    );
  }

  const { data: results, error } = await dbQuery;

  if (error) {
    return NextResponse.json({
      results: [],
      searchTier: 'instant',
      error: 'Search failed'
    }, { status: 500 });
  }

  return NextResponse.json({
    results: results || [],
    searchTier: 'instant',
    parsed,
  });
});
