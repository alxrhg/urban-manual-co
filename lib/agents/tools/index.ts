/**
 * Agent Tools - Functions that agents can use autonomously
 */

import { createServerClient } from '@/lib/supabase-server';
import { Tool } from '../base-agent';

/**
 * Search Tool - Search for destinations
 */
export const searchTool: Tool = {
  name: 'search_destinations',
  description: 'Search for destinations by city, category, or query',
  execute: async (params: { query?: string; city?: string; category?: string; limit?: number }) => {
    const supabase = await createServerClient();
    let query = supabase
      .from('destinations')
      .select('*')
      .is('parent_destination_id', null); // Only top-level destinations

    if (params.city) {
      query = query.ilike('city', `%${params.city}%`);
    }
    if (params.category) {
      query = query.eq('category', params.category);
    }
    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }

    const limit = params.limit || 50;
    const { data, error } = await query.limit(limit);

    if (error) throw error;
    return data || [];
  },
};

/**
 * Weather Tool - Get weather information
 */
export const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get current weather and forecast for a location',
  execute: async (params: { city?: string; lat?: number; lng?: number }) => {
    // Use existing weather API if available, or return mock data
    // In production, integrate with actual weather API
    return {
      temperature: 22,
      condition: 'sunny',
      forecast: 'Clear skies',
    };
  },
};

/**
 * User Profile Tool - Get user preferences and history
 */
export const userProfileTool: Tool = {
  name: 'get_user_profile',
  description: 'Get user preferences, saved places, and visit history',
  execute: async (params: { userId: string }) => {
    const supabase = await createServerClient();
    
    const [savedResult, visitedResult, profileResult] = await Promise.all([
      supabase
        .from('saved_places')
        .select('destination_slug')
        .eq('user_id', params.userId),
      supabase
        .from('visited_places')
        .select('destination_slug, visited_at, rating')
        .eq('user_id', params.userId)
        .order('visited_at', { ascending: false })
        .limit(100),
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', params.userId)
        .single(),
    ]);

    return {
      saved: savedResult.data || [],
      visited: visitedResult.data || [],
      profile: profileResult.data || null,
    };
  },
};

/**
 * Calculate Haversine distance between two points in kilometers
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Nearest Neighbor algorithm for route optimization
 * Starts from first destination and always visits the closest unvisited destination
 */
function nearestNeighborOptimization<T extends { id: number; lat?: number; lng?: number }>(
  destinations: T[]
): T[] {
  if (destinations.length <= 2) return destinations;

  // Filter destinations with valid coordinates
  const withCoords = destinations.filter((d) => d.lat != null && d.lng != null);
  const withoutCoords = destinations.filter((d) => d.lat == null || d.lng == null);

  if (withCoords.length <= 2) {
    return [...withCoords, ...withoutCoords];
  }

  const optimized: T[] = [withCoords[0]];
  const remaining = new Set(withCoords.slice(1));

  while (remaining.size > 0) {
    const current = optimized[optimized.length - 1];
    let nearest: T | null = null;
    let nearestDistance = Infinity;

    for (const dest of remaining) {
      const distance = haversineDistance(
        current.lat!,
        current.lng!,
        dest.lat!,
        dest.lng!
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = dest;
      }
    }

    if (nearest) {
      optimized.push(nearest);
      remaining.delete(nearest);
    }
  }

  // Append destinations without coordinates at the end
  return [...optimized, ...withoutCoords];
}

/**
 * 2-opt improvement for the route (reduces crossings)
 */
function twoOptImprovement<T extends { id: number; lat?: number; lng?: number }>(
  route: T[]
): T[] {
  const withCoords = route.filter((d) => d.lat != null && d.lng != null);
  if (withCoords.length <= 3) return route;

  let improved = [...withCoords];
  let improvement = true;

  // Keep improving until no more improvements found
  while (improvement) {
    improvement = false;
    for (let i = 0; i < improved.length - 2; i++) {
      for (let j = i + 2; j < improved.length; j++) {
        // Calculate current distance
        const d1 = haversineDistance(
          improved[i].lat!,
          improved[i].lng!,
          improved[i + 1].lat!,
          improved[i + 1].lng!
        );
        const d2 =
          j + 1 < improved.length
            ? haversineDistance(
                improved[j].lat!,
                improved[j].lng!,
                improved[j + 1].lat!,
                improved[j + 1].lng!
              )
            : 0;

        // Calculate new distance if we reverse the segment
        const d3 = haversineDistance(
          improved[i].lat!,
          improved[i].lng!,
          improved[j].lat!,
          improved[j].lng!
        );
        const d4 =
          j + 1 < improved.length
            ? haversineDistance(
                improved[i + 1].lat!,
                improved[i + 1].lng!,
                improved[j + 1].lat!,
                improved[j + 1].lng!
              )
            : 0;

        // If reversing improves the route, do it
        if (d3 + d4 < d1 + d2) {
          const reversed = improved.slice(i + 1, j + 1).reverse();
          improved = [
            ...improved.slice(0, i + 1),
            ...reversed,
            ...improved.slice(j + 1),
          ];
          improvement = true;
        }
      }
    }
  }

  // Add back destinations without coordinates
  const withoutCoords = route.filter((d) => d.lat == null || d.lng == null);
  return [...improved, ...withoutCoords];
}

/**
 * Route Optimization Tool - Optimize route between destinations
 * Uses Haversine distance with Nearest Neighbor + 2-opt improvement
 */
export const routeOptimizationTool: Tool = {
  name: 'optimize_route',
  description: 'Optimize the order of destinations to minimize travel time using Haversine distance',
  execute: async (params: {
    destinations: Array<{ id: number; lat?: number; lng?: number }>;
    returnToStart?: boolean;
  }) => {
    const { destinations, returnToStart = false } = params;

    if (destinations.length <= 1) return destinations;

    // Step 1: Apply nearest neighbor algorithm
    let optimized = nearestNeighborOptimization(destinations);

    // Step 2: Apply 2-opt improvement
    optimized = twoOptImprovement(optimized);

    // Calculate total distance for logging
    let totalDistance = 0;
    for (let i = 0; i < optimized.length - 1; i++) {
      const current = optimized[i];
      const next = optimized[i + 1];
      if (current.lat && current.lng && next.lat && next.lng) {
        totalDistance += haversineDistance(current.lat, current.lng, next.lat, next.lng);
      }
    }

    // If returning to start, add distance back to first destination
    if (returnToStart && optimized.length > 1) {
      const first = optimized[0];
      const last = optimized[optimized.length - 1];
      if (first.lat && first.lng && last.lat && last.lng) {
        totalDistance += haversineDistance(last.lat, last.lng, first.lat, first.lng);
      }
    }

    return {
      optimized,
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      optimizationMethod: 'nearest_neighbor_2opt',
    };
  },
};

/**
 * Opening Hours Tool - Check if destinations are open
 */
export const openingHoursTool: Tool = {
  name: 'check_opening_hours',
  description: 'Check opening hours and current availability of destinations',
  execute: async (params: { destinationIds: number[]; date?: string }) => {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('destinations')
      .select('id, name, opening_hours')
      .in('id', params.destinationIds);

    if (error) throw error;

    const date = params.date ? new Date(params.date) : new Date();
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    return (data || []).map((dest: any) => {
      const hours = dest.opening_hours;
      const isOpen = hours ? checkIfOpen(hours, dayOfWeek, hour) : null;
      return {
        id: dest.id,
        name: dest.name,
        isOpen,
        hours,
      };
    });
  },
};

function checkIfOpen(hours: any, dayOfWeek: number, hour: number): boolean {
  // Simple check - in production, parse opening_hours JSON properly
  if (!hours || typeof hours !== 'object') return true; // Assume open if no data
  return true; // Placeholder
}

/**
 * Nearby Places Tool - Find places near a location
 */
export const nearbyPlacesTool: Tool = {
  name: 'find_nearby_places',
  description: 'Find destinations near a specific location',
  execute: async (params: { lat: number; lng: number; radius?: number; limit?: number }) => {
    const supabase = await createServerClient();
    const radius = params.radius || 5; // km
    const limit = params.limit || 20;

    // Use the existing nearby function if available
    const { data, error } = await supabase.rpc('destinations_nearby', {
      p_lat: params.lat,
      p_lng: params.lng,
      p_radius_km: radius,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  },
};

/**
 * Time Context Tool - Get current time and day information
 */
export const timeContextTool: Tool = {
  name: 'get_time_context',
  description: 'Get current time, day of week, and time of day context',
  execute: async () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    return {
      currentTime: now.toISOString(),
      hour,
      dayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
      timeOfDay,
    };
  },
};

/**
 * Get all available tools
 */
export function getAllTools(): Tool[] {
  return [
    searchTool,
    weatherTool,
    userProfileTool,
    routeOptimizationTool,
    openingHoursTool,
    nearbyPlacesTool,
    timeContextTool,
  ];
}

