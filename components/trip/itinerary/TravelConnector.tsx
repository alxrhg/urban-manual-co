'use client';

import React from 'react';
import { Footprints, Car, Train, Navigation, ChevronDown } from 'lucide-react';

export type TravelMode = 'walking' | 'driving' | 'transit';

interface TravelConnectorProps {
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TravelMode;
  onGetDirections?: () => void;
  className?: string;
}

const modeIcons: Record<TravelMode, typeof Car> = {
  walking: Footprints,
  driving: Car,
  transit: Train,
};

const modeLabels: Record<TravelMode, string> = {
  walking: 'Walk',
  driving: 'Drive',
  transit: 'Transit',
};

const modeEmojis: Record<TravelMode, string> = {
  walking: '🚶',
  driving: '🚗',
  transit: '🚇',
};

/**
 * TravelConnector - Clean connector showing travel time between items
 * Shows: "🚗 39 min · 16 km" style with directions link
 */
export default function TravelConnector({
  durationMinutes,
  distanceKm,
  mode = 'walking',
  onGetDirections,
  className = '',
}: TravelConnectorProps) {
  // Format duration
  const formatDuration = (mins?: number): string => {
    if (!mins) return '--';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Format distance
  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const durationText = formatDuration(durationMinutes);
  const distanceText = formatDistance(distanceKm);

  return (
    <div className={`flex items-center py-3 ${className}`}>
      {/* Vertical connector line */}
      <div className="w-8 flex flex-col items-center">
        <div className="w-0.5 h-3 bg-stone-200 dark:bg-gray-700" />
        <ChevronDown className="w-3 h-3 text-stone-300 dark:text-gray-600 -my-0.5" />
        <div className="w-0.5 h-3 bg-stone-200 dark:bg-gray-700" />
      </div>

      {/* Transport info pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full border border-stone-200 dark:border-gray-700">
        {/* Mode emoji */}
        <span className="text-sm">{modeEmojis[mode]}</span>

        {/* Duration */}
        <span className="text-xs font-medium text-stone-700 dark:text-gray-300 tabular-nums">
          {durationText}
        </span>

        {/* Distance */}
        {distanceText && (
          <>
            <span className="text-stone-300 dark:text-gray-600">·</span>
            <span className="text-xs text-stone-500 dark:text-gray-400 tabular-nums">
              {distanceText}
            </span>
          </>
        )}

        {/* Directions link */}
        {onGetDirections && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGetDirections();
            }}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium ml-1"
          >
            <Navigation className="w-3 h-3" />
            <span>Directions</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Interactive Travel Connector (with mode selector)
// ============================================================================

interface InteractiveTravelConnectorProps {
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TravelMode;
  onModeChange?: (mode: TravelMode) => void;
  onGetDirections?: () => void;
  durations?: Partial<Record<TravelMode, number>>;
  className?: string;
}

/**
 * InteractiveTravelConnector - Connector with mode selector
 * Allows switching between walking, transit, and driving
 */
export function InteractiveTravelConnector({
  durationMinutes,
  distanceKm,
  mode = 'walking',
  onModeChange,
  onGetDirections,
  durations,
  className = '',
}: InteractiveTravelConnectorProps) {
  const [selectedMode, setSelectedMode] = React.useState<TravelMode>(mode);

  const handleModeChange = (newMode: TravelMode) => {
    setSelectedMode(newMode);
    onModeChange?.(newMode);
  };

  // Format duration
  const formatDuration = (mins?: number): string => {
    if (!mins && mins !== 0) return '--';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Format distance
  const formatDistance = (km?: number): string => {
    if (!km) return '';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const distanceText = formatDistance(distanceKm);

  return (
    <div className={`flex items-center py-3 ${className}`}>
      {/* Vertical connector line */}
      <div className="w-8 flex flex-col items-center">
        <div className="w-0.5 h-3 bg-stone-200 dark:bg-gray-700" />
        <ChevronDown className="w-3 h-3 text-stone-300 dark:text-gray-600 -my-0.5" />
        <div className="w-0.5 h-3 bg-stone-200 dark:bg-gray-700" />
      </div>

      {/* Transport segment card */}
      <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-stone-50 dark:bg-gray-800/50 rounded-xl border border-stone-200 dark:border-gray-700">
        {/* Mode selector pills */}
        <div className="flex items-center gap-0.5 p-0.5 bg-white dark:bg-gray-700 rounded-full shadow-sm">
          {(['walking', 'transit', 'driving'] as TravelMode[]).map((m) => {
            const duration = durations?.[m] ?? (m === selectedMode ? durationMinutes : undefined);
            const isSelected = selectedMode === m;

            return (
              <button
                key={m}
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeChange(m);
                }}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-full transition-all text-xs font-medium
                  ${isSelected
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900'
                    : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                  }
                `}
              >
                <span>{modeEmojis[m]}</span>
                <span className="tabular-nums">
                  {duration !== undefined ? formatDuration(duration) : '--'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Distance */}
        {distanceText && (
          <span className="text-xs text-stone-500 dark:text-gray-400 tabular-nums">
            {distanceText}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Directions link */}
        {onGetDirections && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGetDirections();
            }}
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            <Navigation className="w-3 h-3" />
            <span className="hidden sm:inline">Directions</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Travel Connector (inline style)
// ============================================================================

interface CompactTravelConnectorProps {
  durationMinutes?: number;
  mode?: TravelMode;
  className?: string;
}

/**
 * CompactTravelConnector - Very minimal inline connector
 * Shows just: "↓ 15m walk"
 */
export function CompactTravelConnector({
  durationMinutes,
  mode = 'walking',
  className = '',
}: CompactTravelConnectorProps) {
  const modeLabels: Record<TravelMode, string> = {
    walking: 'walk',
    driving: 'drive',
    transit: 'transit',
  };

  const formatDuration = (mins?: number): string => {
    if (!mins) return '--';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className={`flex items-center justify-end py-1.5 ${className}`}>
      <span className="text-[10px] text-stone-400 dark:text-gray-500">
        ↓ {formatDuration(durationMinutes)} {modeLabels[mode]}
      </span>
    </div>
  );
}
