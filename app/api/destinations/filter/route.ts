/**
 * Advanced destination filtering API
 * GET /api/destinations/filter - Filter destinations with advanced options
 */

import { NextRequest, NextResponse } from 'next/server';
import { withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;

  // Location filters
  const city = searchParams.get('city');
  const country = searchParams.get('country');
  const neighborhood = searchParams.get('neighborhood');
  const nearbyLat = parseFloat(searchParams.get('nearby_lat') || '');
  const nearbyLng = parseFloat(searchParams.get('nearby_lng') || '');
  const distanceKm = parseFloat(searchParams.get('distance_km') || '5');

  // Category filters
  const category = searchParams.get('category');
  const categories = searchParams.get('categories')?.split(',').filter(Boolean);
  const brand = searchParams.get('brand');

  // Quality filters
  const minRating = parseFloat(searchParams.get('min_rating') || '');
  const maxRating = parseFloat(searchParams.get('max_rating') || '');
  const minCommunityRating = parseFloat(searchParams.get('min_community_rating') || '');
  const minReviewCount = parseInt(searchParams.get('min_review_count') || '');
  const michelin = searchParams.get('michelin') === 'true';
  const michelinStars = searchParams.get('michelin_stars')?.split(',').map(Number).filter(Boolean);
  const crown = searchParams.get('crown') === 'true';

  // Price filters
  const minPrice = parseInt(searchParams.get('min_price') || '');
  const maxPrice = parseInt(searchParams.get('max_price') || '');
  const priceLevel = searchParams.get('price_level')?.split(',').map(Number).filter(Boolean);

  // Feature filters
  const openNow = searchParams.get('open_now') === 'true';
  const reservationRequired = searchParams.get('reservation_required');

  // Atmosphere filters
  const atmosphereTags = searchParams.get('atmosphere_tags')?.split(',').filter(Boolean);
  const bestFor = searchParams.get('best_for')?.split(',').filter(Boolean);
  const noiseLevel = searchParams.get('noise_level');
  const dressCode = searchParams.get('dress_code');

  // Dietary filters
  const dietaryOptions = searchParams.get('dietary_options')?.split(',').filter(Boolean);

  // Sorting
  const sortBy = searchParams.get('sort_by') || 'rating';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServerClient();

  let query = supabase
    .from('destinations')
    .select(`
      id,
      slug,
      name,
      city,
      country,
      neighborhood,
      category,
      micro_description,
      image,
      rating,
      community_rating,
      community_reviews_count,
      price_level,
      michelin_stars,
      crown,
      brand,
      latitude,
      longitude,
      opening_hours_json,
      atmosphere_tags,
      dietary_options,
      best_for,
      noise_level,
      dress_code,
      reservation_required,
      saves_count,
      views_count
    `);

  // Apply location filters
  if (city) {
    query = query.ilike('city', city);
  }

  if (country) {
    query = query.ilike('country', `%${country}%`);
  }

  if (neighborhood) {
    query = query.ilike('neighborhood', `%${neighborhood}%`);
  }

  // Category filters
  if (category) {
    query = query.eq('category', category);
  } else if (categories && categories.length > 0) {
    query = query.in('category', categories);
  }

  if (brand) {
    query = query.ilike('brand', `%${brand}%`);
  }

  // Quality filters
  if (!isNaN(minRating) && minRating > 0) {
    query = query.gte('rating', minRating);
  }

  if (!isNaN(maxRating) && maxRating > 0) {
    query = query.lte('rating', maxRating);
  }

  if (!isNaN(minCommunityRating) && minCommunityRating > 0) {
    query = query.gte('community_rating', minCommunityRating);
  }

  if (!isNaN(minReviewCount) && minReviewCount > 0) {
    query = query.gte('community_reviews_count', minReviewCount);
  }

  if (michelin) {
    query = query.gt('michelin_stars', 0);
  }

  if (michelinStars && michelinStars.length > 0) {
    query = query.in('michelin_stars', michelinStars);
  }

  if (crown) {
    query = query.eq('crown', true);
  }

  // Price filters
  if (!isNaN(minPrice) && minPrice > 0) {
    query = query.gte('price_level', minPrice);
  }

  if (!isNaN(maxPrice) && maxPrice > 0) {
    query = query.lte('price_level', maxPrice);
  }

  if (priceLevel && priceLevel.length > 0) {
    query = query.in('price_level', priceLevel);
  }

  // Feature filters
  if (reservationRequired !== null && reservationRequired !== undefined) {
    query = query.eq('reservation_required', reservationRequired === 'true');
  }

  // Array filters (atmosphere, dietary, best_for)
  if (atmosphereTags && atmosphereTags.length > 0) {
    query = query.overlaps('atmosphere_tags', atmosphereTags);
  }

  if (bestFor && bestFor.length > 0) {
    query = query.overlaps('best_for', bestFor);
  }

  if (dietaryOptions && dietaryOptions.length > 0) {
    query = query.overlaps('dietary_options', dietaryOptions);
  }

  if (noiseLevel) {
    query = query.eq('noise_level', noiseLevel);
  }

  if (dressCode) {
    query = query.eq('dress_code', dressCode);
  }

  // Sorting
  switch (sortBy) {
    case 'community_rating':
      query = query.order('community_rating', { ascending: false, nullsFirst: false });
      break;
    case 'newest':
      query = query.order('id', { ascending: false });
      break;
    case 'trending':
      query = query.order('views_count', { ascending: false, nullsFirst: false });
      break;
    case 'saves_count':
      query = query.order('saves_count', { ascending: false, nullsFirst: false });
      break;
    case 'price_asc':
      query = query.order('price_level', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('price_level', { ascending: false, nullsFirst: false });
      break;
    case 'rating':
    default:
      query = query.order('rating', { ascending: false, nullsFirst: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: destinations, error, count } = await query;

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to filter destinations', 500);
  }

  let results = destinations || [];

  // Open now filter (client-side, requires opening hours parsing)
  if (openNow && results.length > 0) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const currentTime = now.getHours() * 100 + now.getMinutes();

    results = results.filter((dest) => {
      if (!dest.opening_hours_json) return false;

      try {
        const hours = dest.opening_hours_json as { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> };
        if (!hours.periods) return false;

        return hours.periods.some((period) => {
          if (period.open.day !== dayOfWeek) return false;

          const openTime = parseInt(period.open.time);
          const closeTime = period.close ? parseInt(period.close.time) : 2400;

          return currentTime >= openTime && currentTime < closeTime;
        });
      } catch {
        return false;
      }
    });
  }

  // Nearby filter (client-side distance calculation)
  if (!isNaN(nearbyLat) && !isNaN(nearbyLng)) {
    results = results
      .map((dest) => {
        if (!dest.latitude || !dest.longitude) return { ...dest, distance_km: Infinity };

        // Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = ((dest.latitude - nearbyLat) * Math.PI) / 180;
        const dLon = ((dest.longitude - nearbyLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((nearbyLat * Math.PI) / 180) *
            Math.cos((dest.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { ...dest, distance_km: Math.round(distance * 100) / 100 };
      })
      .filter((dest) => dest.distance_km <= distanceKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }

  // Add user's save/visit status if authenticated
  if (user && results.length > 0) {
    const slugs = results.map((d) => d.slug);

    const [savedData, visitedData] = await Promise.all([
      supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', user.id)
        .in('destination_slug', slugs),
      supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id)
        .in('destination_slug', slugs),
    ]);

    const savedSet = new Set(savedData.data?.map((s) => s.destination_slug) || []);
    const visitedSet = new Set(visitedData.data?.map((v) => v.destination_slug) || []);

    results = results.map((dest) => ({
      ...dest,
      is_saved: savedSet.has(dest.slug),
      is_visited: visitedSet.has(dest.slug),
    }));
  }

  return NextResponse.json({
    destinations: results,
    count: results.length,
    total: count || results.length,
    hasMore: results.length === limit,
    filters: {
      city,
      country,
      neighborhood,
      category: category || categories,
      rating: { min: minRating, max: maxRating },
      price: { min: minPrice, max: maxPrice },
      michelin: michelin || michelinStars,
      crown,
      openNow,
      atmosphereTags,
      dietaryOptions,
      bestFor,
      sortBy,
    },
  });
});
