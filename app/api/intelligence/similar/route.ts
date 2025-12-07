import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

/**
 * GET /api/intelligence/similar
 *
 * Find similar destinations based on:
 * - Same category
 * - Same city or nearby cities
 * - Similar style/vibe (tags)
 * - Similar price level
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  const limit = parseInt(searchParams.get('limit') || '12');
  const filter = searchParams.get('filter') || 'all'; // all, nearby, style

  if (!slug) {
    throw createValidationError('slug is required');
  }

  const supabase = await createServerClient();

  // First, get the source destination
  const { data: source, error: sourceError } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (sourceError || !source) {
    return NextResponse.json({ similar: [], count: 0 });
  }

  // Build query for similar destinations
  let query = supabase
    .from('destinations')
    .select('id, slug, name, city, neighborhood, category, micro_description, image, image_thumbnail, rating, michelin_stars, crown, tags, price_level, latitude, longitude')
    .neq('slug', slug) // Exclude the source
    .is('parent_destination_id', null) // Only parent destinations
    .limit(limit * 3); // Get more to filter later

  // Apply filters based on type
  if (filter === 'nearby') {
    // Same city only
    if (source.city) {
      query = query.eq('city', source.city);
    }
  } else if (filter === 'style') {
    // Same category, any location
    if (source.category) {
      query = query.ilike('category', source.category);
    }
  } else {
    // 'all' - combine category and city
    if (source.category) {
      query = query.ilike('category', source.category);
    }
  }

  const { data: candidates, error: queryError } = await query;

  if (queryError || !candidates) {
    return NextResponse.json({ similar: [], count: 0 });
  }

  // Score and rank candidates
  const scored = candidates.map(dest => {
    let score = 0;

    // Category match (highest weight)
    if (dest.category?.toLowerCase() === source.category?.toLowerCase()) {
      score += 40;
    }

    // Same city
    if (dest.city === source.city) {
      score += 25;
    }

    // Same neighborhood
    if (dest.neighborhood && dest.neighborhood === source.neighborhood) {
      score += 15;
    }

    // Similar price level
    if (dest.price_level && source.price_level) {
      const priceDiff = Math.abs(dest.price_level - source.price_level);
      score += Math.max(0, 10 - priceDiff * 3);
    }

    // Tag overlap
    if (dest.tags && source.tags) {
      const sourceTags = new Set(source.tags.map((t: string) => t.toLowerCase()));
      const matchingTags = dest.tags.filter((t: string) => sourceTags.has(t.toLowerCase()));
      score += matchingTags.length * 3;
    }

    // Michelin bonus (similar quality)
    if (dest.michelin_stars && source.michelin_stars) {
      score += 10;
    }

    // Rating similarity
    if (dest.rating && source.rating) {
      const ratingDiff = Math.abs(dest.rating - source.rating);
      score += Math.max(0, 8 - ratingDiff * 2);
    }

    // Distance bonus for nearby filter
    if (filter === 'nearby' && dest.latitude && dest.longitude && source.latitude && source.longitude) {
      const distance = calculateDistance(
        source.latitude, source.longitude,
        dest.latitude, dest.longitude
      );
      // Closer is better (within 5km)
      if (distance < 5) {
        score += Math.round((5 - distance) * 4);
      }
    }

    return { ...dest, score };
  });

  // Sort by score and take top results
  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Remove score from response
  const similar = sorted.map(({ score, ...rest }) => rest);

  return NextResponse.json({
    similar,
    count: similar.length,
    source: {
      slug: source.slug,
      name: source.name,
      category: source.category,
      city: source.city,
    },
  });
});

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
