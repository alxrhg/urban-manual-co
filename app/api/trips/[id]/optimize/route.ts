/**
 * Trip route optimization API
 * POST /api/trips/[id]/optimize - Optimize route for a trip day
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

// Haversine distance in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nearest neighbor algorithm for TSP
function nearestNeighborTSP(locations: Location[], startIndex = 0): Location[] {
  if (locations.length <= 2) return locations;

  const result: Location[] = [];
  const remaining = new Set(locations.map((_, i) => i));

  let currentIndex = startIndex;
  remaining.delete(currentIndex);
  result.push(locations[currentIndex]);

  while (remaining.size > 0) {
    let nearestIndex = -1;
    let nearestDistance = Infinity;

    const currentLoc = locations[currentIndex];

    for (const index of remaining) {
      const loc = locations[index];
      const distance = haversineDistance(currentLoc.lat, currentLoc.lng, loc.lat, loc.lng);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    if (nearestIndex !== -1) {
      remaining.delete(nearestIndex);
      result.push(locations[nearestIndex]);
      currentIndex = nearestIndex;
    }
  }

  return result;
}

// Calculate total route distance
function calculateTotalDistance(locations: Location[]): number {
  let total = 0;
  for (let i = 0; i < locations.length - 1; i++) {
    total += haversineDistance(
      locations[i].lat,
      locations[i].lng,
      locations[i + 1].lat,
      locations[i + 1].lng
    );
  }
  return total;
}

// Estimate travel time based on distance and mode
function estimateTravelTime(distanceKm: number, mode: string): number {
  switch (mode) {
    case 'walking':
      return Math.round((distanceKm / 5) * 60); // 5 km/h walking speed
    case 'transit':
      return Math.round((distanceKm / 20) * 60); // 20 km/h average transit
    case 'driving':
      return Math.round((distanceKm / 30) * 60); // 30 km/h city driving
    case 'bicycling':
      return Math.round((distanceKm / 15) * 60); // 15 km/h cycling
    default:
      return Math.round((distanceKm / 5) * 60);
  }
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: tripId } = await context.params;
  const body = await request.json();
  const { day, mode = 'walking', update_order = false } = body;

  const supabase = await createServerClient();

  // Check access
  const { data: trip } = await supabase
    .from('trips')
    .select('user_id')
    .eq('id', tripId)
    .single();

  if (!trip) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Trip not found', 404);
  }

  if (trip.user_id !== user.id) {
    const { data: collab } = await supabase
      .from('trip_collaborators')
      .select('role')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!collab || collab.role !== 'editor') {
      throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot optimize this trip', 403);
    }
  }

  // Get itinerary items for the specified day (or all days)
  let query = supabase
    .from('itinerary_items')
    .select(`
      id,
      day,
      order_index,
      title,
      notes,
      destination_slug,
      destination:destinations!destination_slug(
        slug,
        name,
        latitude,
        longitude
      )
    `)
    .eq('trip_id', tripId)
    .order('day')
    .order('order_index');

  if (day !== undefined) {
    query = query.eq('day', day);
  }

  const { data: items, error } = await query;

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch itinerary items', 500);
  }

  if (!items || items.length < 2) {
    return NextResponse.json({
      message: 'Not enough items to optimize',
      optimized: false,
    });
  }

  // Group by day
  const dayGroups: Record<number, typeof items> = {};
  items.forEach((item) => {
    if (!dayGroups[item.day]) {
      dayGroups[item.day] = [];
    }
    dayGroups[item.day].push(item);
  });

  const results: Array<{
    day: number;
    original_order: string[];
    optimized_order: string[];
    original_distance_km: number;
    optimized_distance_km: number;
    savings_km: number;
    savings_percent: number;
    legs: Array<{
      from: string;
      to: string;
      distance_km: number;
      duration_minutes: number;
    }>;
  }> = [];

  for (const [dayNum, dayItems] of Object.entries(dayGroups)) {
    // Filter items with coordinates
    const locationsWithCoords = dayItems.filter((item) => {
      const dest = item.destination as any;
      return dest?.latitude && dest?.longitude;
    });

    if (locationsWithCoords.length < 2) continue;

    // Convert to Location format
    const locations: Location[] = locationsWithCoords.map((item) => {
      const dest = item.destination as any;
      return {
        id: item.id,
        name: dest.name || item.title,
        lat: dest.latitude,
        lng: dest.longitude,
      };
    });

    // Calculate original distance
    const originalDistance = calculateTotalDistance(locations);

    // Optimize route
    const optimizedLocations = nearestNeighborTSP(locations);
    const optimizedDistance = calculateTotalDistance(optimizedLocations);

    // Calculate legs
    const legs = [];
    for (let i = 0; i < optimizedLocations.length - 1; i++) {
      const from = optimizedLocations[i];
      const to = optimizedLocations[i + 1];
      const distance = haversineDistance(from.lat, from.lng, to.lat, to.lng);
      legs.push({
        from: from.name,
        to: to.name,
        distance_km: Math.round(distance * 100) / 100,
        duration_minutes: estimateTravelTime(distance, mode),
      });
    }

    results.push({
      day: parseInt(dayNum),
      original_order: locations.map((l) => l.id),
      optimized_order: optimizedLocations.map((l) => l.id),
      original_distance_km: Math.round(originalDistance * 100) / 100,
      optimized_distance_km: Math.round(optimizedDistance * 100) / 100,
      savings_km: Math.round((originalDistance - optimizedDistance) * 100) / 100,
      savings_percent: Math.round(((originalDistance - optimizedDistance) / originalDistance) * 100),
      legs,
    });

    // Update order in database if requested
    if (update_order) {
      for (let i = 0; i < optimizedLocations.length; i++) {
        await supabase
          .from('itinerary_items')
          .update({ order_index: i })
          .eq('id', optimizedLocations[i].id);
      }
    }
  }

  // Calculate totals
  const totalOriginalDistance = results.reduce((sum, r) => sum + r.original_distance_km, 0);
  const totalOptimizedDistance = results.reduce((sum, r) => sum + r.optimized_distance_km, 0);

  return NextResponse.json({
    optimized: true,
    updated: update_order,
    mode,
    days: results,
    summary: {
      total_original_distance_km: Math.round(totalOriginalDistance * 100) / 100,
      total_optimized_distance_km: Math.round(totalOptimizedDistance * 100) / 100,
      total_savings_km: Math.round((totalOriginalDistance - totalOptimizedDistance) * 100) / 100,
      total_savings_percent: Math.round(
        ((totalOriginalDistance - totalOptimizedDistance) / totalOriginalDistance) * 100
      ),
      total_walking_time_minutes: results.reduce(
        (sum, r) => sum + r.legs.reduce((s, l) => s + l.duration_minutes, 0),
        0
      ),
    },
  });
});
