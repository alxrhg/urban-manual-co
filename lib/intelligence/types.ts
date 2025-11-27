/**
 * Centralized Type Definitions for Travel Intelligence
 * Used across planner, itinerary, and recommendation systems
 */

import type { Destination } from '@/types/destination';

// =============================================================================
// Core Time Block Types
// =============================================================================

export type TimeBlockType = 'activity' | 'meal' | 'transit' | 'lodging' | 'gap' | 'flight';

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'very_high';

export type TransitMode = 'walk' | 'bike' | 'transit' | 'drive';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'hot' | 'cold' | 'storm';

/**
 * Smart contextual data attached to time blocks
 */
export interface SmartBlockData {
  /** Predicted crowd level for this time */
  crowdLevel?: CrowdLevel;
  /** Weather forecast for this time slot */
  weather?: WeatherCondition;
  /** Transit mode to reach this block from previous */
  transitMode?: TransitMode;
  /** Transit duration in minutes */
  transitMinutes?: number;
  /** Transit distance in km */
  transitDistanceKm?: number;
  /** Smart badge to display (e.g., "High Demand", "Rainy Day Option") */
  badge?: string;
  /** Best alternative times if current time is busy */
  betterTimes?: string[];
  /** Outdoor activity flag */
  isOutdoor?: boolean;
  /** Reservation required flag */
  requiresReservation?: boolean;
}

/**
 * Transit information calculated automatically
 */
export interface TransitToNext {
  mode: 'walk' | 'drive' | 'transit';
  duration: number;
  distanceKm: number;
}

/**
 * Smart insights from ForecastingService
 */
export interface SmartInsights {
  crowdLevel?: 'low' | 'moderate' | 'high';
  weatherWarning?: string;
}

/**
 * A single time block in the itinerary
 * Replaces the old fixed meal slot system (breakfast/lunch/dinner)
 */
export interface TimeBlock {
  id: string;
  type: TimeBlockType;
  title: string;
  /** Associated place/destination */
  place?: Place;
  /** Destination slug for DB lookup */
  destinationSlug?: string;
  /** Start time in HH:MM format */
  startTime?: string;
  /** End time in HH:MM format */
  endTime?: string;
  /** Duration in minutes */
  durationMinutes: number;
  /** If true, optimizer won't move this block */
  isLocked: boolean;
  /** Transit info to next block (calculated automatically) */
  transitToNext?: TransitToNext;
  /** Smart insights from ForecastingService */
  smartInsights?: SmartInsights;
  /** Category for display */
  category?: string;
  /** User notes */
  notes?: string;
  /** Smart contextual data (extended) */
  smartData?: SmartBlockData;
}

/**
 * Simplified place interface for time blocks
 */
export interface Place {
  id?: string | number;
  slug?: string;
  name: string;
  city?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  image?: string;
  imageThumbnail?: string;
  rating?: number;
  priceLevel?: number;
  description?: string;
}

// =============================================================================
// Day Plan Types
// =============================================================================

/**
 * Statistics for a day plan
 */
export interface DayPlanStats {
  /** Total walking distance in km */
  totalWalkingKm: number;
  /** Total transit time in minutes */
  totalTransitMinutes: number;
  /** Estimated total cost */
  estimatedCost: number;
  /** Number of activities */
  activityCount: number;
  /** Total planned time in minutes */
  totalPlannedMinutes: number;
  /** Free time remaining */
  freeTimeMinutes: number;
}

/**
 * A complete day plan with time blocks
 */
export interface DayPlan {
  id: string;
  /** Day number (1, 2, 3...) */
  dayNumber: number;
  /** ISO date string */
  date?: string;
  /** Ordered list of time blocks */
  blocks: TimeBlock[];
  /** Computed statistics */
  stats: DayPlanStats;
  /** Weather forecast for this day */
  weatherForecast?: string;
  /** Flag indicating weather adjustments were made */
  weatherAdjusted?: boolean;
}

// =============================================================================
// Trip Planning Types
// =============================================================================

/**
 * User preferences for trip planning
 */
export interface TripPreferences {
  /** Preferred categories (restaurant, museum, etc.) */
  categories?: string[];
  /** Budget level (1-4) */
  budgetLevel?: number;
  /** Pace preference */
  pace?: 'relaxed' | 'moderate' | 'packed';
  /** Wake up time preference */
  startTime?: string;
  /** End time preference */
  endTime?: string;
  /** Avoid outdoor activities */
  avoidOutdoor?: boolean;
  /** Must-visit place slugs */
  mustVisit?: string[];
}

/**
 * Intelligence warnings for the planner
 */
export interface PlannerWarning {
  id: string;
  type: 'weather' | 'crowd' | 'timing' | 'distance' | 'availability' | 'transit';
  severity: 'high' | 'medium' | 'low';
  message: string;
  /** Affected block ID */
  blockId?: string;
  /** Suggested action */
  suggestion?: string;
  /** Alternative to suggest */
  alternative?: {
    blockId?: string;
    newTime?: string;
    newPlace?: Place;
  };
}

// =============================================================================
// Cluster Types (for route optimization)
// =============================================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * A geographic cluster of destinations
 */
export interface DestinationCluster {
  id: string;
  /** Center point of the cluster */
  centroid: Coordinates;
  /** Destinations in this cluster */
  destinations: Place[];
  /** Cluster label (e.g., neighborhood name) */
  label?: string;
  /** Total items in cluster */
  count: number;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response from itinerary generation API
 */
export interface GeneratedItinerary {
  city: string;
  durationDays: number;
  days: DayPlan[];
  warnings?: PlannerWarning[];
  /** Demand trend used for pacing */
  demandTrend?: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Response from smart-fill API
 */
export interface SmartFillSuggestion {
  day: number;
  order: number;
  startTime?: string;
  destination: Place;
  reason: string;
  smartData?: SmartBlockData;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new time block with default values
 */
export function createTimeBlock(
  type: TimeBlockType,
  title: string,
  durationMinutes: number = 90,
  overrides?: Partial<TimeBlock>
): TimeBlock {
  return {
    id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    title,
    durationMinutes,
    isLocked: false,
    ...overrides,
  };
}

/**
 * Create a transit block between two places
 */
export function createTransitBlock(
  fromPlace: Place,
  toPlace: Place,
  transitData: { durationMinutes: number; mode: TransitMode; distanceKm: number }
): TimeBlock {
  return createTimeBlock('transit', `To ${toPlace.name}`, transitData.durationMinutes, {
    smartData: {
      transitMode: transitData.mode,
      transitMinutes: transitData.durationMinutes,
      transitDistanceKm: transitData.distanceKm,
    },
  });
}

/**
 * Calculate day plan statistics
 */
export function calculateDayStats(blocks: TimeBlock[]): DayPlanStats {
  let totalWalkingKm = 0;
  let totalTransitMinutes = 0;
  let estimatedCost = 0;
  let activityCount = 0;
  let totalPlannedMinutes = 0;

  for (const block of blocks) {
    totalPlannedMinutes += block.durationMinutes;

    if (block.type === 'transit') {
      totalTransitMinutes += block.durationMinutes;
      if (block.smartData?.transitMode === 'walk') {
        totalWalkingKm += block.smartData.transitDistanceKm || 0;
      }
    } else if (block.type === 'activity' || block.type === 'meal') {
      activityCount++;
    }
  }

  const usableDayMinutes = 10 * 60; // 10 hours
  const freeTimeMinutes = Math.max(0, usableDayMinutes - totalPlannedMinutes);

  return {
    totalWalkingKm: Math.round(totalWalkingKm * 10) / 10,
    totalTransitMinutes,
    estimatedCost,
    activityCount,
    totalPlannedMinutes,
    freeTimeMinutes,
  };
}

/**
 * Format time from minutes since midnight to HH:MM
 */
export function formatTimeFromMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Parse HH:MM time to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}
