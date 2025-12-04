'use client';

import { useMemo } from 'react';
import { Car, Footprints, Train, Plus } from 'lucide-react';
import type { ItineraryItem } from '@/types/trip';
import type { TravelMode } from '@/lib/trip/travel';
import { estimateRideCost, getRecommendedMode } from '@/lib/trip/travel';
import { formatDuration } from '@/lib/utils/time-calculations';

export interface TripSettings {
  city?: string;
  defaultTransportMode?: TravelMode;
  showRideCosts?: boolean;
}

interface TravelConnectorProps {
  from: ItineraryItem;
  to: ItineraryItem;
  travelTime: number; // minutes
  distance: number; // km
  mode: TravelMode;
  estimatedCost?: number;
  tripSettings?: TripSettings;
  onAddItem?: () => void;
  className?: string;
}

const modeIcons: Record<TravelMode, typeof Car> = {
  walking: Footprints,
  driving: Car,
  transit: Train,
};

const modeLabels: Record<TravelMode, string> = {
  walking: 'walk',
  driving: 'car',
  transit: 'transit',
};

/**
 * Check if either item is an airport route
 */
function isAirportRoute(from: ItineraryItem, to: ItineraryItem): boolean {
  const fromTitle = from.title?.toLowerCase() || '';
  const toTitle = to.title?.toLowerCase() || '';

  return (
    fromTitle.includes('airport') ||
    toTitle.includes('airport') ||
    fromTitle.includes('terminal') ||
    toTitle.includes('terminal')
  );
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Determine if we should show the ride cost estimate
 */
function shouldShowRideCost(
  mode: TravelMode,
  distance: number,
  isAirport: boolean,
  tripSettings?: TripSettings
): boolean {
  // Always show for airport routes
  if (isAirport) return true;

  // Show for car trips over 5km
  if (mode === 'driving' && distance > 5) return true;

  // Show if settings explicitly enable it
  if (tripSettings?.showRideCosts && mode === 'driving') return true;

  return false;
}

/**
 * Get the effective display mode - prevents unreasonable walking times
 */
function getEffectiveMode(
  mode: TravelMode,
  distance: number,
  travelTime: number,
  isAirport: boolean
): TravelMode {
  // Don't show walking for > 5km or > 60 minutes walk
  if (mode === 'walking' && (distance > 5 || travelTime > 60)) {
    return isAirport ? 'driving' : getRecommendedMode(distance, isAirport);
  }

  // Airport routes should always be driving
  if (isAirport && mode !== 'driving') {
    return 'driving';
  }

  return mode;
}

/**
 * TravelConnector - Displays travel time between itinerary items
 *
 * Display logic:
 * - < 1km: "5m walk . 400m"
 * - 1-5km: "12m . 2.3km" with mode icon
 * - > 5km (car): "24m by car . 16km" + "[Uber ~$25]"
 * - Airport routes: Always show car + cost estimate
 */
export default function TravelConnector({
  from,
  to,
  travelTime,
  distance,
  mode,
  estimatedCost,
  tripSettings,
  onAddItem,
  className = '',
}: TravelConnectorProps) {
  const isAirport = useMemo(() => isAirportRoute(from, to), [from, to]);

  // Get effective mode (prevents showing "3h walk" for 16km)
  const effectiveMode = useMemo(
    () => getEffectiveMode(mode, distance, travelTime, isAirport),
    [mode, distance, travelTime, isAirport]
  );

  // Calculate cost if needed
  const rideCost = useMemo(() => {
    if (estimatedCost !== undefined) return estimatedCost;
    if (shouldShowRideCost(effectiveMode, distance, isAirport, tripSettings)) {
      return estimateRideCost(distance, tripSettings?.city || 'default');
    }
    return undefined;
  }, [estimatedCost, effectiveMode, distance, isAirport, tripSettings]);

  // Recalculate travel time if mode changed
  const effectiveTravelTime = useMemo(() => {
    if (effectiveMode === mode) return travelTime;

    // Rough estimates based on mode
    const speeds: Record<TravelMode, number> = {
      walking: 5, // 5 km/h
      transit: 25, // 25 km/h
      driving: 40, // 40 km/h city driving
    };

    return Math.ceil((distance / speeds[effectiveMode]) * 60);
  }, [effectiveMode, mode, travelTime, distance]);

  const ModeIcon = modeIcons[effectiveMode];
  const showModeLabel = distance >= 1 || isAirport;
  const showRideCostButtons = shouldShowRideCost(effectiveMode, distance, isAirport, tripSettings);

  return (
    <div className={`group relative flex flex-col items-center py-2 ${className}`}>
      {/* Main connector line and info */}
      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
        {/* Down arrow / connector */}
        <span className="text-xs">&#x2193;</span>

        {/* Mode icon */}
        <ModeIcon className="w-3 h-3" strokeWidth={1.5} />

        {/* Travel time */}
        <span className="text-xs font-medium tabular-nums">
          {formatDuration(effectiveTravelTime)}
        </span>

        {/* Mode label for longer distances */}
        {showModeLabel && (
          <span className="text-xs">by {modeLabels[effectiveMode]}</span>
        )}

        {/* Separator */}
        <span className="text-xs">.</span>

        {/* Distance */}
        <span className="text-xs tabular-nums">{formatDistance(distance)}</span>
      </div>

      {/* Ride cost estimates */}
      {showRideCostButtons && rideCost !== undefined && (
        <div className="flex items-center gap-2 mt-1">
          <button
            className="px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400
                       bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700
                       transition-colors"
          >
            Uber ~${Math.round(rideCost)}
          </button>
          <button
            className="px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400
                       bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700
                       transition-colors"
          >
            Lyft
          </button>
        </div>
      )}

      {/* Add item button (shows on hover) */}
      {onAddItem && (
        <button
          onClick={onAddItem}
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
                     opacity-0 group-hover:opacity-100 transition-opacity
                     w-5 h-5 flex items-center justify-center
                     bg-blue-500 hover:bg-blue-600 text-white rounded-full
                     shadow-sm"
          aria-label="Add item between"
        >
          <Plus className="w-3 h-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
