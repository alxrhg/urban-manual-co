import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError, createUnauthorizedError } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { parseItineraryNotes } from '@/types/trip';
import {
  apiRatelimit,
  memoryApiRatelimit,
  getIdentifier,
  isUpstashConfigured,
  createRateLimitResponse,
} from '@/lib/rate-limit';

interface RouteItem {
  id: string;
  title: string;
  latitude?: number | null;
  longitude?: number | null;
  time?: string | null;
}

// Calculate distance between two points using Haversine formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nearest neighbor algorithm for route optimization
function optimizeRoute(items: RouteItem[]): string[] {
  // Filter items with valid coordinates
  const validItems = items.filter(
    item => item.latitude != null && item.longitude != null
  );

  if (validItems.length < 2) {
    return items.map(i => i.id);
  }

  // Items without coordinates stay in original position
  const invalidItems = items.filter(
    item => item.latitude == null || item.longitude == null
  );

  const visited = new Set<string>();
  const result: RouteItem[] = [];

  // Start with the first item (or earliest timed item)
  const sortedByTime = [...validItems].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  let current = sortedByTime[0];
  result.push(current);
  visited.add(current.id);

  // Greedy nearest neighbor
  while (visited.size < validItems.length) {
    let nearestDist = Infinity;
    let nearest: RouteItem | null = null;

    for (const item of validItems) {
      if (visited.has(item.id)) continue;

      const dist = haversineDistance(
        current.latitude!,
        current.longitude!,
        item.latitude!,
        item.longitude!
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = item;
      }
    }

    if (nearest) {
      result.push(nearest);
      visited.add(nearest.id);
      current = nearest;
    }
  }

  // Calculate total distance for the optimized route
  let totalDistance = 0;
  for (let i = 0; i < result.length - 1; i++) {
    totalDistance += haversineDistance(
      result[i].latitude!,
      result[i].longitude!,
      result[i + 1].latitude!,
      result[i + 1].longitude!
    );
  }

  // Append items without coordinates at the end
  const optimizedOrder = [...result.map(i => i.id), ...invalidItems.map(i => i.id)];

  return optimizedOrder;
}

/**
 * POST /api/intelligence/route-optimizer
 * Optimizes the order of items to minimize travel distance
 *
 * Security: Requires authentication and verifies data ownership
 * - Client sends tripId and itemIds (not full item objects)
 * - Server fetches items from database and verifies trip ownership
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // 1. Authenticate user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw createUnauthorizedError('Authentication required');
  }

  // Rate limiting
  // Use apiRatelimit (10 req/10s) keyed by user ID
  const identifier = getIdentifier(request, user.id);
  const ratelimit = isUpstashConfigured() ? apiRatelimit : memoryApiRatelimit;
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  if (!success) {
    return createRateLimitResponse(
      'Too many optimization requests. Please wait a moment.',
      limit,
      remaining,
      reset
    );
  }

  // 2. Parse and validate request body
  const body = await request.json();
  const { tripId, itemIds } = body;

  if (!tripId || typeof tripId !== 'string') {
    throw createValidationError('tripId is required');
  }

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw createValidationError('itemIds array is required');
  }

  // Validate all itemIds are strings
  if (!itemIds.every((id: unknown) => typeof id === 'string')) {
    throw createValidationError('All itemIds must be strings');
  }

  // 3. Verify trip ownership
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id')
    .eq('id', tripId)
    .eq('user_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json(
      { error: 'Trip not found or access denied' },
      { status: 404 }
    );
  }

  // 4. Fetch items from database with ownership verification
  // Only fetch items that belong to the verified trip
  const { data: dbItems, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('id, title, time, notes')
    .eq('trip_id', tripId)
    .in('id', itemIds);

  if (itemsError) {
    throw itemsError;
  }

  // Verify all requested items were found (prevents ID enumeration)
  if (!dbItems || dbItems.length !== itemIds.length) {
    const foundIds = new Set(dbItems?.map(i => i.id) || []);
    const missingIds = itemIds.filter((id: string) => !foundIds.has(id));
    return NextResponse.json(
      { error: `Some items not found or do not belong to this trip: ${missingIds.join(', ')}` },
      { status: 403 }
    );
  }

  // 5. Transform database items to RouteItem format
  const items: RouteItem[] = dbItems.map(item => {
    const parsedNotes = parseItineraryNotes(item.notes);
    return {
      id: item.id,
      title: item.title,
      latitude: parsedNotes?.latitude ?? null,
      longitude: parsedNotes?.longitude ?? null,
      time: item.time ?? null,
    };
  });

  // 6. Handle edge cases
  if (items.length < 2) {
    return NextResponse.json({
      optimizedOrder: items.map(i => i.id),
      message: 'Not enough items to optimize',
    });
  }

  // 7. Optimize the route
  const optimizedOrder = optimizeRoute(items);

  // Calculate savings
  const originalDistance = calculateTotalDistance(items);
  const optimizedItems = optimizedOrder
    .map(id => items.find(i => i.id === id))
    .filter(Boolean);
  const optimizedDistance = calculateTotalDistance(optimizedItems as RouteItem[]);
  const savedDistance = Math.max(0, originalDistance - optimizedDistance);

  return NextResponse.json({
    optimizedOrder,
    originalDistance: Math.round(originalDistance * 10) / 10,
    optimizedDistance: Math.round(optimizedDistance * 10) / 10,
    savedDistance: Math.round(savedDistance * 10) / 10,
    message: savedDistance > 0.1
      ? `Route optimized - saves ${savedDistance.toFixed(1)}km`
      : 'Route is already well optimized',
  });
});

function calculateTotalDistance(items: RouteItem[]): number {
  let total = 0;
  const validItems = items.filter(
    i => i.latitude != null && i.longitude != null
  );

  for (let i = 0; i < validItems.length - 1; i++) {
    total += haversineDistance(
      validItems[i].latitude!,
      validItems[i].longitude!,
      validItems[i + 1].latitude!,
      validItems[i + 1].longitude!
    );
  }
  return total;
}
