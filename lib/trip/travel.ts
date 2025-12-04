/**
 * Travel Time Utility
 * Calculates travel time between itinerary items using Mapbox Directions API
 */

import { createServerClient } from '@/lib/supabase/server';
import { parseItineraryNotes, stringifyItineraryNotes } from '@/types/trip';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export type TravelMode = 'walking' | 'driving' | 'transit';

export interface TravelEstimate {
  durationMinutes: number;
  distanceKm: number;
  mode: TravelMode;
  estimatedCost?: number;
  route?: GeoJSON.LineString;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// City-specific base fares and per-km rates (USD equivalent)
const CITY_RIDE_COSTS: Record<string, { base: number; perKm: number }> = {
  // North America
  'New York': { base: 3.0, perKm: 2.5 },
  'Los Angeles': { base: 2.5, perKm: 1.8 },
  'San Francisco': { base: 3.5, perKm: 2.2 },
  'Chicago': { base: 2.5, perKm: 1.6 },
  'Miami': { base: 2.5, perKm: 1.5 },
  // Europe
  London: { base: 4.0, perKm: 2.0 },
  Paris: { base: 3.5, perKm: 1.8 },
  Berlin: { base: 3.0, perKm: 1.5 },
  Rome: { base: 3.0, perKm: 1.4 },
  Barcelona: { base: 2.5, perKm: 1.3 },
  Amsterdam: { base: 3.5, perKm: 2.0 },
  // Asia
  Tokyo: { base: 4.0, perKm: 3.0 },
  Singapore: { base: 3.5, perKm: 0.8 },
  'Hong Kong': { base: 3.0, perKm: 1.2 },
  Bangkok: { base: 1.0, perKm: 0.4 },
  Seoul: { base: 3.0, perKm: 1.0 },
  Dubai: { base: 2.0, perKm: 0.6 },
  // Default for unlisted cities
  default: { base: 3.0, perKm: 1.5 },
};

/**
 * Calculate travel time between two points using Mapbox Directions API
 */
export async function calculateTravelTime(
  from: Coordinates,
  to: Coordinates,
  mode: TravelMode
): Promise<TravelEstimate> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN not configured');
  }

  // Map our mode to Mapbox profile
  const mapboxProfile = mapModeToProfile(mode);

  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${from.lng},${from.lat};${to.lng},${to.lat}`
  );
  url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'simplified');

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Mapbox Directions API error: ${response.status} - ${errorText}`);
    throw new Error(`Failed to calculate travel time: ${response.status}`);
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found between the specified points');
  }

  const route = data.routes[0];
  const durationMinutes = Math.ceil(route.duration / 60);
  const distanceKm = Math.round((route.distance / 1000) * 100) / 100;

  return {
    durationMinutes,
    distanceKm,
    mode,
    route: route.geometry as GeoJSON.LineString,
  };
}

/**
 * Map TravelMode to Mapbox routing profile
 */
function mapModeToProfile(mode: TravelMode): string {
  switch (mode) {
    case 'walking':
      return 'walking';
    case 'driving':
      return 'driving-traffic';
    case 'transit':
      // Mapbox doesn't have a transit profile, fall back to driving
      // In a real app, you'd use a transit API like Google Transit
      return 'driving';
    default:
      return 'walking';
  }
}

/**
 * Smart mode selection based on distance and route type
 */
export function getRecommendedMode(distanceKm: number, isAirportRoute: boolean): TravelMode {
  // Airport routes should always use car/taxi
  if (isAirportRoute) {
    return 'driving';
  }

  // Distance-based mode selection
  if (distanceKm < 1) {
    // Very short distances: walk
    return 'walking';
  } else if (distanceKm < 3) {
    // Short distances: walking is still reasonable
    return 'walking';
  } else if (distanceKm < 10) {
    // Medium distances: transit is efficient
    return 'transit';
  } else {
    // Long distances: driving is fastest
    return 'driving';
  }
}

/**
 * Estimate taxi/uber cost based on distance and city
 */
export function estimateRideCost(distanceKm: number, city: string): number {
  // Find city-specific rates or use default
  const rates = CITY_RIDE_COSTS[city] || CITY_RIDE_COSTS.default;

  // Calculate cost: base fare + distance rate
  const cost = rates.base + distanceKm * rates.perKm;

  // Round to 2 decimal places
  return Math.round(cost * 100) / 100;
}

/**
 * Calculate straight-line distance between two points (Haversine formula)
 */
function haversineDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Update all travel times for a trip day
 * Gets all items for the day, calculates travel between consecutive items
 */
export async function updateDayTravelTimes(tripId: string, day: number): Promise<void> {
  const supabase = await createServerClient();

  // Fetch itinerary items for this day
  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', tripId)
    .eq('day', day)
    .order('order_index', { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to fetch itinerary items: ${itemsError.message}`);
  }

  if (!items || items.length < 2) {
    // Need at least 2 items to calculate travel time
    return;
  }

  // Get destination slugs to fetch coordinates
  const destinationSlugs = items
    .map((item) => item.destination_slug)
    .filter((slug): slug is string => Boolean(slug));

  // Fetch destination coordinates
  const destinationsMap = new Map<string, Coordinates>();
  if (destinationSlugs.length > 0) {
    const { data: destinations, error: destError } = await supabase
      .from('destinations')
      .select('slug, latitude, longitude')
      .in('slug', destinationSlugs);

    if (!destError && destinations) {
      destinations.forEach((dest) => {
        if (dest.latitude && dest.longitude) {
          destinationsMap.set(dest.slug, {
            lat: dest.latitude,
            lng: dest.longitude,
          });
        }
      });
    }
  }

  // Process items with coordinates from notes or destinations
  const itemsWithCoords = items.map((item) => {
    const notes = parseItineraryNotes(item.notes);
    let coords: Coordinates | null = null;

    // First check if coordinates are in notes
    if (notes?.latitude && notes?.longitude) {
      coords = { lat: notes.latitude, lng: notes.longitude };
    }
    // Fall back to destination coordinates
    else if (item.destination_slug && destinationsMap.has(item.destination_slug)) {
      coords = destinationsMap.get(item.destination_slug)!;
    }

    return { item, coords, notes };
  });

  // Calculate travel times between consecutive items
  const updates: Array<{ id: string; notes: string }> = [];

  for (let i = 0; i < itemsWithCoords.length - 1; i++) {
    const current = itemsWithCoords[i];
    const next = itemsWithCoords[i + 1];

    if (!current.coords || !next.coords) {
      // Skip if either item lacks coordinates
      continue;
    }

    // Calculate straight-line distance for mode recommendation
    const straightLineDistance = haversineDistance(current.coords, next.coords);

    // Determine if this is an airport route (check titles/notes)
    const isAirportRoute =
      current.item.title.toLowerCase().includes('airport') ||
      next.item.title.toLowerCase().includes('airport') ||
      current.notes?.type === 'flight' ||
      next.notes?.type === 'flight';

    // Get recommended mode
    const mode = getRecommendedMode(straightLineDistance, isAirportRoute);

    try {
      // Calculate actual travel time via Mapbox
      const estimate = await calculateTravelTime(current.coords, next.coords, mode);

      // Update item notes with travel time to next
      const updatedNotes: ItineraryItemNotes = {
        ...current.notes,
        travelTimeToNext: estimate.durationMinutes,
        travelDistanceToNext: estimate.distanceKm,
        travelModeToNext: mode,
      };

      updates.push({
        id: current.item.id,
        notes: stringifyItineraryNotes(updatedNotes),
      });
    } catch (err) {
      console.error(`Failed to calculate travel time for item ${current.item.id}:`, err);
      // Continue with other items even if one fails
    }
  }

  // Clear travel time from last item (no next item)
  const lastItem = itemsWithCoords[itemsWithCoords.length - 1];
  if (lastItem.notes?.travelTimeToNext) {
    const updatedNotes: ItineraryItemNotes = {
      ...lastItem.notes,
      travelTimeToNext: undefined,
      travelDistanceToNext: undefined,
      travelModeToNext: undefined,
    };
    updates.push({
      id: lastItem.item.id,
      notes: stringifyItineraryNotes(updatedNotes),
    });
  }

  // Batch update all items
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('itinerary_items')
      .update({ notes: update.notes })
      .eq('id', update.id);

    if (updateError) {
      console.error(`Failed to update item ${update.id}:`, updateError.message);
    }
  }
}
