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

  // Don't render if we don't have valid coordinates
  if (distance === null || times === null) {
    return (
      <div className={`flex items-center justify-center py-1 ${className}`}>
        <div className="h-4 border-l border-dashed border-stone-200 dark:border-gray-700" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 ${className}`}>
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className="w-px h-2 bg-stone-200 dark:bg-gray-700" />
        <div className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-gray-600" />
        <div className="w-px h-2 bg-stone-200 dark:bg-gray-700" />
      </div>

      {/* All three travel modes with times */}
      <div className="flex items-center gap-3 flex-1">
        {modeConfig.map(({ mode, icon: Icon, label }) => (
          <div
            key={mode}
            className="flex items-center gap-1 text-stone-500 dark:text-gray-400"
            title={label}
          >
            <Icon className="w-3 h-3" />
            <span className="text-[10px] tabular-nums">
              {formatDuration(times[mode])}
            </span>
          </div>
        ))}

        {/* Distance */}
        {distance > 0.1 && (
          <>
            <span className="text-stone-300 dark:text-gray-600">·</span>
            <span className="text-[10px] text-stone-400 dark:text-gray-500 tabular-nums">
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
