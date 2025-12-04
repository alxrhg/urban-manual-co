import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { haversineDistance } from '@/lib/intelligence/utils';

// Average walking speed in km/h
const WALKING_SPEED_KMH = 5;

interface ClusterDestination {
  slug: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  neighborhood: string | null;
  micro_description: string | null;
}

interface Cluster {
  id: number;
  centroid: { lat: number; lng: number };
  destinations: ClusterDestination[];
  neighborhood: string | null;
  totalRating: number;
  categories: string[];
}

interface DayAssignment {
  day: number;
  clusters: Cluster[];
  destinations: ClusterDestination[];
  totalItems: number;
  categoryBreakdown: Record<string, number>;
}

type OptimizeFor = 'time' | 'category_variety' | 'rating';

/**
 * Fetch destinations with coordinates from the database
 */
async function getDestinationsWithCoords(
  slugs: string[]
): Promise<ClusterDestination[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from('destinations')
    .select(
      'slug, name, category, latitude, longitude, rating, neighborhood, micro_description'
    )
    .in('slug', slugs)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('Error fetching destinations:', error);
    throw new Error('Failed to fetch destinations');
  }

  return (data || []).map((d) => ({
    slug: d.slug,
    name: d.name,
    category: d.category,
    latitude: d.latitude!,
    longitude: d.longitude!,
    rating: d.rating,
    neighborhood: d.neighborhood,
    micro_description: d.micro_description,
  }));
}

/**
 * Calculate walking time in minutes between two points
 */
function walkingTimeMinutes(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const distanceKm = haversineDistance(lat1, lng1, lat2, lng2);
  return (distanceKm / WALKING_SPEED_KMH) * 60;
}

/**
 * Calculate the centroid of a set of destinations
 */
function calculateCentroid(
  destinations: ClusterDestination[]
): { lat: number; lng: number } {
  const sumLat = destinations.reduce((sum, d) => sum + d.latitude, 0);
  const sumLng = destinations.reduce((sum, d) => sum + d.longitude, 0);
  return {
    lat: sumLat / destinations.length,
    lng: sumLng / destinations.length,
  };
}

/**
 * Get the most common neighborhood in a cluster
 */
function getMostCommonNeighborhood(
  destinations: ClusterDestination[]
): string | null {
  const counts: Record<string, number> = {};
  for (const d of destinations) {
    if (d.neighborhood) {
      counts[d.neighborhood] = (counts[d.neighborhood] || 0) + 1;
    }
  }
  let maxCount = 0;
  let mostCommon: string | null = null;
  for (const [neighborhood, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = neighborhood;
    }
  }
  return mostCommon;
}

/**
 * Cluster destinations by walking proximity using a greedy algorithm
 */
function clusterByProximity(
  destinations: ClusterDestination[],
  options: {
    maxWalkingMinutes: number;
    optimizeFor: OptimizeFor;
  }
): Cluster[] {
  const { maxWalkingMinutes, optimizeFor } = options;

  if (destinations.length === 0) {
    return [];
  }

  // Sort destinations based on optimization strategy
  let sortedDestinations = [...destinations];
  if (optimizeFor === 'rating') {
    sortedDestinations.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (optimizeFor === 'category_variety') {
    // Group by category first, then interleave
    const byCategory: Record<string, ClusterDestination[]> = {};
    for (const d of destinations) {
      if (!byCategory[d.category]) {
        byCategory[d.category] = [];
      }
      byCategory[d.category].push(d);
    }
    sortedDestinations = [];
    const categories = Object.keys(byCategory);
    let maxLen = Math.max(...categories.map((c) => byCategory[c].length));
    for (let i = 0; i < maxLen; i++) {
      for (const cat of categories) {
        if (byCategory[cat][i]) {
          sortedDestinations.push(byCategory[cat][i]);
        }
      }
    }
  }
  // For 'time', we keep original order or can sort by geography later

  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const destination of sortedDestinations) {
    if (assigned.has(destination.slug)) {
      continue;
    }

    // Start a new cluster with this destination
    const clusterDestinations: ClusterDestination[] = [destination];
    assigned.add(destination.slug);

    // Find all nearby unassigned destinations
    for (const other of sortedDestinations) {
      if (assigned.has(other.slug)) {
        continue;
      }

      // Check if this destination is within walking distance of any destination in the cluster
      const isNearby = clusterDestinations.some((cd) => {
        const walkTime = walkingTimeMinutes(
          cd.latitude,
          cd.longitude,
          other.latitude,
          other.longitude
        );
        return walkTime <= maxWalkingMinutes;
      });

      if (isNearby) {
        clusterDestinations.push(other);
        assigned.add(other.slug);
      }
    }

    const centroid = calculateCentroid(clusterDestinations);
    const categories = [...new Set(clusterDestinations.map((d) => d.category))];
    const totalRating = clusterDestinations.reduce(
      (sum, d) => sum + (d.rating || 0),
      0
    );

    clusters.push({
      id: clusters.length + 1,
      centroid,
      destinations: clusterDestinations,
      neighborhood: getMostCommonNeighborhood(clusterDestinations),
      totalRating,
      categories,
    });
  }

  return clusters;
}

/**
 * Assign clusters to days based on constraints
 */
function assignClustersToDays(
  clusters: Cluster[],
  options: {
    maxItemsPerDay: number;
    balanceCategories: boolean;
  }
): DayAssignment[] {
  const { maxItemsPerDay, balanceCategories } = options;

  if (clusters.length === 0) {
    return [];
  }

  const days: DayAssignment[] = [];
  const unassignedClusters = [...clusters];

  // Sort clusters by size (largest first) to pack efficiently
  unassignedClusters.sort(
    (a, b) => b.destinations.length - a.destinations.length
  );

  while (unassignedClusters.length > 0) {
    const dayNumber = days.length + 1;
    const dayClusters: Cluster[] = [];
    let dayDestinations: ClusterDestination[] = [];
    const dayCategories: Record<string, number> = {};

    // Try to fill this day with clusters
    for (let i = 0; i < unassignedClusters.length; i++) {
      const cluster = unassignedClusters[i];
      const wouldHaveItems = dayDestinations.length + cluster.destinations.length;

      // Check if adding this cluster would exceed the limit
      if (wouldHaveItems <= maxItemsPerDay) {
        // If balancing categories, check if this adds variety
        if (balanceCategories) {
          const newCategories = cluster.categories.filter(
            (c) => !dayCategories[c]
          );
          // Prefer clusters that add new categories, but still add if under limit
          if (newCategories.length > 0 || dayDestinations.length === 0) {
            dayClusters.push(cluster);
            dayDestinations = dayDestinations.concat(cluster.destinations);
            for (const d of cluster.destinations) {
              dayCategories[d.category] = (dayCategories[d.category] || 0) + 1;
            }
            unassignedClusters.splice(i, 1);
            i--; // Adjust index after removal
          }
        } else {
          dayClusters.push(cluster);
          dayDestinations = dayDestinations.concat(cluster.destinations);
          for (const d of cluster.destinations) {
            dayCategories[d.category] = (dayCategories[d.category] || 0) + 1;
          }
          unassignedClusters.splice(i, 1);
          i--;
        }
      }
    }

    // If we couldn't add any clusters due to category balancing, force add one
    if (dayClusters.length === 0 && unassignedClusters.length > 0) {
      const cluster = unassignedClusters.shift()!;
      dayClusters.push(cluster);
      dayDestinations = cluster.destinations;
      for (const d of cluster.destinations) {
        dayCategories[d.category] = (dayCategories[d.category] || 0) + 1;
      }
    }

    if (dayClusters.length > 0) {
      days.push({
        day: dayNumber,
        clusters: dayClusters,
        destinations: dayDestinations,
        totalItems: dayDestinations.length,
        categoryBreakdown: dayCategories,
      });
    }
  }

  return days;
}

/**
 * POST /api/intelligence/cluster-destinations
 *
 * Clusters nearby destinations for efficient trip planning.
 * Groups destinations within walking distance and suggests optimal day assignments.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { destinationSlugs, optimizeFor = 'time' } = body;

  // Validate required fields
  if (!destinationSlugs || !Array.isArray(destinationSlugs)) {
    throw createValidationError('destinationSlugs array is required');
  }

  if (destinationSlugs.length === 0) {
    return NextResponse.json({
      clusters: [],
      dayAssignments: [],
      message: 'No destinations provided',
    });
  }

  // Validate optimizeFor
  const validOptimizations: OptimizeFor[] = ['time', 'category_variety', 'rating'];
  if (!validOptimizations.includes(optimizeFor)) {
    throw createValidationError(
      `optimizeFor must be one of: ${validOptimizations.join(', ')}`
    );
  }

  // Fetch destinations with coordinates
  const destinations = await getDestinationsWithCoords(destinationSlugs);

  if (destinations.length === 0) {
    return NextResponse.json({
      clusters: [],
      dayAssignments: [],
      message: 'No destinations found with valid coordinates',
      missingDestinations: destinationSlugs,
    });
  }

  // Track destinations that couldn't be found or lack coordinates
  const foundSlugs = new Set(destinations.map((d) => d.slug));
  const missingSlugs = destinationSlugs.filter((s: string) => !foundSlugs.has(s));

  // Cluster by walking distance
  const clusters = clusterByProximity(destinations, {
    maxWalkingMinutes: 15,
    optimizeFor,
  });

  // Assign clusters to days
  const dayAssignments = assignClustersToDays(clusters, {
    maxItemsPerDay: 6,
    balanceCategories: true,
  });

  // Calculate summary statistics
  const totalDays = dayAssignments.length;
  const avgItemsPerDay =
    totalDays > 0
      ? Math.round(
          (destinations.length / totalDays) * 10
        ) / 10
      : 0;

  return NextResponse.json({
    clusters,
    dayAssignments,
    summary: {
      totalDestinations: destinations.length,
      totalClusters: clusters.length,
      totalDays,
      avgItemsPerDay,
      optimizeFor,
    },
    ...(missingSlugs.length > 0 && {
      warnings: {
        missingDestinations: missingSlugs,
        message: `${missingSlugs.length} destination(s) could not be found or lack coordinates`,
      },
    }),
  });
});
