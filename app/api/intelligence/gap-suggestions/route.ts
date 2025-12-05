import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';

interface Destination {
  id: number;
  slug: string;
  name: string;
  category: string;
  image_thumbnail?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

/**
 * GET /api/intelligence/gap-suggestions
 * Returns nearby destination suggestions for filling gaps in itineraries
 *
 * Query params:
 * - city: Required. The city to search in
 * - category: Required. Category of places to suggest (cafe, bar, restaurant, attraction)
 * - lat, lng: Optional. Coordinates to sort results by proximity
 * - limit: Optional. Number of results (default 4, max 10)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const limit = Math.min(parseInt(searchParams.get('limit') || '4', 10), 10);

  if (!city) {
    throw createValidationError('City is required');
  }

  if (!category) {
    throw createValidationError('Category is required');
  }

  const supabase = await createServerClient();

  // Map frontend categories to database categories
  const categoryMap: Record<string, string[]> = {
    cafe: ['cafe', 'coffee', 'bakery', 'breakfast'],
    bar: ['bar', 'cocktail', 'pub', 'rooftop'],
    restaurant: ['restaurant', 'bistro', 'dining', 'food'],
    attraction: ['museum', 'gallery', 'landmark', 'monument', 'park', 'attraction'],
  };

  const dbCategories = categoryMap[category] || [category];

  // Build query
  let query = supabase
    .from('destinations')
    .select('id, slug, name, category, image_thumbnail, latitude, longitude, rating')
    .ilike('city', `%${city}%`)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('rating', { ascending: false, nullsFirst: false });

  // Apply category filter with OR conditions
  const categoryFilters = dbCategories.map(cat => `category.ilike.%${cat}%`).join(',');
  query = query.or(categoryFilters);

  // Fetch more results than needed for proximity sorting
  const { data: destinations, error } = await query.limit(lat && lng ? 50 : limit);

  if (error) {
    console.error('Database error:', error);
    return NextResponse.json({ suggestions: [] });
  }

  if (!destinations || destinations.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // If coordinates provided, sort by proximity
  let results: (Destination & { distance?: number })[] = destinations;

  if (lat && lng) {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    results = destinations
      .map(dest => ({
        ...dest,
        distance: dest.latitude && dest.longitude
          ? calculateDistance(userLat, userLng, dest.latitude, dest.longitude)
          : undefined,
      }))
      .filter(dest => dest.distance !== undefined && dest.distance <= 3000) // Within 3km
      .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
      .slice(0, limit);
  } else {
    results = destinations.slice(0, limit);
  }

  // Format response
  const suggestions = results.map(dest => ({
    id: dest.id,
    slug: dest.slug,
    name: dest.name,
    category: dest.category,
    image_thumbnail: dest.image_thumbnail,
    distance: dest.distance,
  }));

  return NextResponse.json({
    suggestions,
    city,
    category,
  });
});
