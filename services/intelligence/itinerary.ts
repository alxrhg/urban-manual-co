/**
 * Itinerary Intelligence Service
 * AI-powered itinerary generation and optimization
 *
 * Features:
 * - Cluster-based routing (minimizes travel time)
 * - Weather-adaptive scheduling
 * - Demand-aware pacing
 * - TSP-lite nearest neighbor routing
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { knowledgeGraphService } from './knowledge-graph';
import { forecastingService } from './forecasting';
import { haversineDistance } from '@/services/intelligence/planner/utils';
import { estimateTransit, type TransitEstimate } from '@/services/intelligence/planner/transit';

export interface ItineraryItem {
  destination_id: string;
  order: number;
  day?: number;
  time_of_day?: 'morning' | 'afternoon' | 'evening' | 'night';
  duration_minutes?: number;
  notes?: string;
  /** Transit info to reach this item from previous */
  transit_to_next?: {
    duration: number;
    mode: string;
    distance_km?: number;
  };
  /** Smart badge for UI (e.g., "High Demand", "Rainy Day Option") */
  smart_badge?: string;
}

export interface Itinerary {
  id?: string;
  city: string;
  duration_days: number;
  items: ItineraryItem[];
  optimization_criteria?: {
    minimize_travel?: boolean;
    maximize_experience?: boolean;
    budget_constraint?: number;
    category_balance?: boolean;
  };
}

/** Cluster radius in kilometers */
const CLUSTER_RADIUS_KM = 2.0;

/** Destination with location data */
interface DestinationWithLocation {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  price_level?: number;
  tags?: string[];
  description?: string;
  latitude?: number;
  longitude?: number;
}

/** Cluster of nearby destinations */
interface DestinationCluster {
  centroid: { lat: number; lng: number };
  destinations: DestinationWithLocation[];
}

export class ItineraryIntelligenceService {
  private supabase;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
      console.warn('ItineraryIntelligenceService: Supabase client not available');
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Group destinations by geographic proximity
   * Uses simple clustering: pick unvisited destination, find all neighbors within radius
   */
  private groupDestinationsByLocation(
    destinations: DestinationWithLocation[]
  ): DestinationCluster[] {
    // Filter destinations with valid coordinates
    const withCoords = destinations.filter(
      (d) => d.latitude != null && d.longitude != null
    );
    const withoutCoords = destinations.filter(
      (d) => d.latitude == null || d.longitude == null
    );

    const clusters: DestinationCluster[] = [];
    const assigned = new Set<string>();

    for (const dest of withCoords) {
      if (assigned.has(dest.id)) continue;

      // Start new cluster
      const cluster: DestinationWithLocation[] = [dest];
      assigned.add(dest.id);

      // Find all unassigned neighbors within radius
      for (const other of withCoords) {
        if (assigned.has(other.id)) continue;

        const distance = haversineDistance(
          dest.latitude!,
          dest.longitude!,
          other.latitude!,
          other.longitude!
        );

        if (distance <= CLUSTER_RADIUS_KM) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }

      // Calculate centroid
      const centroid = {
        lat: cluster.reduce((sum, d) => sum + d.latitude!, 0) / cluster.length,
        lng: cluster.reduce((sum, d) => sum + d.longitude!, 0) / cluster.length,
      };

      clusters.push({ centroid, destinations: cluster });
    }

    // Add destinations without coordinates as a single cluster
    if (withoutCoords.length > 0) {
      clusters.push({
        centroid: { lat: 0, lng: 0 },
        destinations: withoutCoords,
      });
    }

    return clusters;
  }

  /**
   * Sort destinations by nearest neighbor (TSP-lite)
   * Greedy algorithm: always visit closest unvisited destination next
   */
  private sortByNearestNeighbor(
    destinations: DestinationWithLocation[],
    startPoint?: { lat: number; lng: number }
  ): DestinationWithLocation[] {
    if (destinations.length <= 1) return destinations;

    const withCoords = destinations.filter(
      (d) => d.latitude != null && d.longitude != null
    );
    const withoutCoords = destinations.filter(
      (d) => d.latitude == null || d.longitude == null
    );

    if (withCoords.length === 0) return destinations;

    const sorted: DestinationWithLocation[] = [];
    const remaining = [...withCoords];

    // Start from given point or first destination
    let current = startPoint || {
      lat: remaining[0].latitude!,
      lng: remaining[0].longitude!,
    };

    while (remaining.length > 0) {
      // Find nearest unvisited
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const dist = haversineDistance(
          current.lat,
          current.lng,
          remaining[i].latitude!,
          remaining[i].longitude!
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0];
      sorted.push(nearest);
      current = { lat: nearest.latitude!, lng: nearest.longitude! };
    }

    // Append destinations without coordinates at the end
    return [...sorted, ...withoutCoords];
  }

  /**
   * Calculate transit between consecutive items and add to itinerary
   */
  private addTransitInfo(items: ItineraryItem[], destinationsMap: Map<string, DestinationWithLocation>): void {
    for (let i = 0; i < items.length - 1; i++) {
      const current = destinationsMap.get(items[i].destination_id);
      const next = destinationsMap.get(items[i + 1].destination_id);

      if (
        current?.latitude != null &&
        current?.longitude != null &&
        next?.latitude != null &&
        next?.longitude != null
      ) {
        const transit = estimateTransit(
          { lat: current.latitude, lng: current.longitude },
          { lat: next.latitude, lng: next.longitude }
        );

        items[i].transit_to_next = {
          duration: transit.durationMinutes,
          mode: transit.mode,
          distance_km: transit.distanceKm,
        };
      }
    }
  }

  /**
   * Generate itinerary for a city
   * Enhanced with demand forecasting and cluster-based routing
   */
  async generateItinerary(
    city: string,
    durationDays: number,
    preferences?: {
      categories?: string[];
      budget?: number;
      style?: string;
      mustVisit?: string[];
    },
    userId?: string
  ): Promise<Itinerary | null> {
    if (!this.supabase) return null;

    try {
      // Get destinations in city with location data
      const { data: destinations } = await this.supabase
        .from('destinations')
        .select('id, name, category, rating, price_level, tags, description, latitude, longitude')
        .ilike('city', `%${city}%`)
        .order('rating', { ascending: false })
        .limit(100);

      if (!destinations || destinations.length === 0) {
        return null;
      }

      // Inject forecasting to determine busy factor
      let busyFactor = 1.0;
      try {
        const forecast = await forecastingService.forecastDemand(city, undefined, durationDays);
        if (forecast?.trend === 'increasing') {
          busyFactor = 1.2; // Add 20% buffer for busy periods
        } else if (forecast?.trend === 'decreasing') {
          busyFactor = 0.9; // Can fit slightly more in quieter periods
        }
      } catch (forecastError) {
        // Forecasting is optional, continue without it
        console.warn('Forecasting unavailable, using default pacing');
      }

      // Filter by preferences
      let filtered = destinations;
      if (preferences?.categories && preferences.categories.length > 0) {
        filtered = filtered.filter((d) =>
          preferences.categories!.some((cat) =>
            d.category?.toLowerCase().includes(cat.toLowerCase())
          )
        );
      }

      // Include must-visit destinations first
      if (preferences?.mustVisit && preferences.mustVisit.length > 0) {
        const mustVisitIds = preferences.mustVisit;
        filtered = [
          ...filtered.filter((d) => mustVisitIds.includes(d.id)),
          ...filtered.filter((d) => !mustVisitIds.includes(d.id)),
        ];
      }

      // Generate itinerary using AI or algorithm
      if (this.genAI) {
        return await this.generateWithAI(city, durationDays, filtered, preferences);
      } else {
        return this.generateBasic(city, durationDays, filtered, busyFactor);
      }
    } catch (error) {
      console.error('Error generating itinerary:', error);
      return null;
    }
  }

  /**
   * Generate itinerary using AI
   */
  private async generateWithAI(
    city: string,
    durationDays: number,
    destinations: any[],
    preferences?: any
  ): Promise<Itinerary> {
    const model = this.genAI!.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const destinationsSummary = destinations.slice(0, 50).map(d => ({
      id: d.id,
      name: d.name,
      category: d.category,
      tags: d.tags || [],
    }));

    const prompt = `Generate a ${durationDays}-day travel itinerary for ${city}.

Available destinations:
${JSON.stringify(destinationsSummary, null, 2)}

Preferences: ${JSON.stringify(preferences || {}, null, 2)}

Create a balanced itinerary with:
- Good mix of categories (dining, culture, relaxation)
- Realistic timing (don't over-schedule)
- Logical sequence (group by location/time)
- Must-visit items included if specified

Return ONLY valid JSON:
{
  "city": "${city}",
  "duration_days": ${durationDays},
  "items": [
    {
      "destination_id": "uuid",
      "order": 1,
      "day": 1,
      "time_of_day": "morning|afternoon|evening",
      "duration_minutes": 120,
      "notes": "brief note"
    }
  ]
}

Return only JSON, no other text:`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          optimization_criteria: {
            maximize_experience: true,
            category_balance: true,
          },
        };
      }
    } catch (error) {
      console.error('AI itinerary generation failed:', error);
    }

    // Fallback to basic generation
    return this.generateBasic(city, durationDays, destinations);
  }

  /**
   * Basic itinerary generation (no AI)
   * Enhanced with cluster-based routing and TSP-lite optimization
   */
  private generateBasic(
    city: string,
    durationDays: number,
    destinations: any[],
    busyFactor: number = 1.0
  ): Itinerary {
    const items: ItineraryItem[] = [];

    // Step 1: Cluster destinations by location
    const clusters = this.groupDestinationsByLocation(destinations);

    // Step 2: Sort clusters by size (largest first) for better distribution
    clusters.sort((a, b) => b.destinations.length - a.destinations.length);

    // Step 3: Assign clusters to days
    const daysAssignment: DestinationWithLocation[][] = Array.from(
      { length: durationDays },
      () => []
    );

    // Round-robin assignment of clusters to days
    let dayIdx = 0;
    for (const cluster of clusters) {
      // If cluster is large, split across multiple days
      if (cluster.destinations.length > 5) {
        const chunkSize = Math.ceil(cluster.destinations.length / 2);
        const sortedCluster = this.sortByNearestNeighbor(cluster.destinations, cluster.centroid);

        for (let i = 0; i < sortedCluster.length; i += chunkSize) {
          const chunk = sortedCluster.slice(i, i + chunkSize);
          daysAssignment[dayIdx % durationDays].push(...chunk);
          dayIdx++;
        }
      } else {
        daysAssignment[dayIdx % durationDays].push(...cluster.destinations);
        dayIdx++;
      }
    }

    // Step 4: Within each day, sort by nearest neighbor (TSP-lite)
    let order = 1;
    const timesOfDay: Array<'morning' | 'afternoon' | 'evening'> = [
      'morning',
      'afternoon',
      'evening',
    ];

    // Build destinations map for transit calculations
    const destinationsMap = new Map<string, DestinationWithLocation>();
    destinations.forEach((d) => destinationsMap.set(d.id, d));

    for (let day = 1; day <= durationDays; day++) {
      const dayDestinations = daysAssignment[day - 1] || [];

      // Sort by nearest neighbor within the day
      const sorted = this.sortByNearestNeighbor(dayDestinations);

      // Limit items per day based on busy factor (typically 4-6)
      const maxItemsPerDay = Math.floor(6 / busyFactor);
      const limitedSorted = sorted.slice(0, maxItemsPerDay);

      // Calculate duration with busy factor
      const baseDuration = 90; // Base 90 minutes per activity
      const adjustedDuration = Math.ceil(baseDuration * busyFactor);

      // Assign times and create items
      limitedSorted.forEach((dest, idx) => {
        const item: ItineraryItem = {
          destination_id: dest.id,
          order: order++,
          day,
          time_of_day: timesOfDay[idx % timesOfDay.length],
          duration_minutes: adjustedDuration,
        };

        // Add smart badge for high-demand periods
        if (busyFactor > 1.1) {
          item.smart_badge = 'High Demand';
        }

        items.push(item);
      });
    }

    // Step 5: Add transit info between consecutive items
    this.addTransitInfo(items, destinationsMap);

    return {
      city,
      duration_days: durationDays,
      items,
      optimization_criteria: {
        minimize_travel: true,
        category_balance: true,
      },
    };
  }

  /**
   * Optimize existing itinerary
   */
  async optimizeItinerary(
    itinerary: Itinerary,
    criteria?: {
      minimize_travel?: boolean;
      maximize_experience?: boolean;
    }
  ): Promise<Itinerary> {
    // For now, return as-is
    // In production, would reorder based on location, opening hours, etc.
    return itinerary;
  }

  /**
   * Save itinerary template
   */
  async saveItinerary(itinerary: Itinerary, userId: string): Promise<string | null> {
    if (!this.supabase) return null;
    
    try {
      const { data, error } = await this.supabase
        .from('itinerary_templates')
        .insert({
          user_id: userId,
          city: itinerary.city,
          duration_days: itinerary.duration_days,
          destinations: itinerary.items.map(item => ({
            id: item.destination_id,
            order: item.order,
            day: item.day,
            time_of_day: item.time_of_day,
            duration_minutes: item.duration_minutes,
            notes: item.notes,
          })),
          optimization_criteria: itinerary.optimization_criteria,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error saving itinerary:', error);
      return null;
    }
  }
}

export const itineraryIntelligenceService = new ItineraryIntelligenceService();

