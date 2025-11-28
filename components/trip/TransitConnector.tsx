'use client';

import { useMemo } from 'react';
import { Car, Footprints, Train } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';

type TransitMode = 'walk' | 'transit' | 'drive';

interface TransitConnectorProps {
  fromLat?: number | null;
  fromLng?: number | null;
  toLat?: number | null;
  toLng?: number | null;
  className?: string;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate travel time based on distance and mode
 */
function estimateTravelTime(distanceKm: number, mode: TransitMode): number {
  const speeds: Record<TransitMode, number> = {
    walk: 5,     // 5 km/h walking
    transit: 25, // 25 km/h average for public transit
    drive: 35,   // 35 km/h city driving average
  };
  return Math.round((distanceKm / speeds[mode]) * 60); // minutes
}

const modeConfig: { mode: TransitMode; icon: typeof Car; label: string }[] = [
  { mode: 'walk', icon: Footprints, label: 'Walk' },
  { mode: 'transit', icon: Train, label: 'Transit' },
  { mode: 'drive', icon: Car, label: 'Drive' },
];

/**
 * TransitConnector - Shows estimated travel time between two locations
 * Displays all three travel modes (walk, transit, drive) with times
 */
export default function TransitConnector({
  fromLat,
  fromLng,
  toLat,
  toLng,
  className = '',
}: TransitConnectorProps) {
  const { distance, times } = useMemo(() => {
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
      return { distance: null, times: null };
    }
    const dist = calculateDistance(fromLat, fromLng, toLat, toLng);
    const travelTimes = {
      walk: estimateTravelTime(dist, 'walk'),
      transit: estimateTravelTime(dist, 'transit'),
      drive: estimateTravelTime(dist, 'drive'),
    };
    return { distance: dist, times: travelTimes };
  }, [fromLat, fromLng, toLat, toLng]);

  // Always render the connector - show placeholder if no coordinates
  return (
    <div className={`flex items-center gap-2 py-2 px-2 ${className}`}>
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className="w-px h-2 bg-stone-300 dark:bg-gray-600" />
        <div className="w-2 h-2 rounded-full border-2 border-stone-300 dark:border-gray-600 bg-white dark:bg-gray-900" />
        <div className="w-px h-2 bg-stone-300 dark:bg-gray-600" />
      </div>

      {/* Travel modes with times */}
      <div className="flex items-center gap-3 flex-1">
        {times ? (
          <>
            {modeConfig.map(({ mode, icon: Icon, label }) => (
              <div
                key={mode}
                className="flex items-center gap-1 text-stone-500 dark:text-gray-400"
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs tabular-nums font-medium">
                  {formatDuration(times[mode])}
                </span>
              </div>
            ))}

            {/* Distance */}
            {distance && distance > 0.1 && (
              <>
                <span className="text-stone-300 dark:text-gray-600">·</span>
                <span className="text-xs text-stone-400 dark:text-gray-500 tabular-nums">
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-xs text-stone-400 dark:text-gray-500 italic">
            Travel time
          </span>
        )}
      </div>
    </div>
  );
}
