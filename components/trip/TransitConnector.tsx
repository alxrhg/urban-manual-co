'use client';

import { useState, useMemo } from 'react';
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

const modeIcons: Record<TransitMode, typeof Car> = {
  walk: Footprints,
  transit: Train,
  drive: Car,
};

/**
 * TransitConnector - Shows estimated travel time between two locations
 * Uses local Haversine calculation for instant results
 */
export default function TransitConnector({
  fromLat,
  fromLng,
  toLat,
  toLng,
  className = '',
}: TransitConnectorProps) {
  const [mode, setMode] = useState<TransitMode>('walk');

  const { distance, travelTime } = useMemo(() => {
    if (fromLat == null || fromLng == null || toLat == null || toLng == null) {
      return { distance: null, travelTime: null };
    }
    const dist = calculateDistance(fromLat, fromLng, toLat, toLng);
    const time = estimateTravelTime(dist, mode);
    return { distance: dist, travelTime: time };
  }, [fromLat, fromLng, toLat, toLng, mode]);

  // Don't render if we don't have valid coordinates
  if (distance === null || travelTime === null) {
    return (
      <div className={`flex items-center justify-center py-1 ${className}`}>
        <div className="h-4 border-l border-dashed border-stone-200 dark:border-gray-700" />
      </div>
    );
  }

  const Icon = modeIcons[mode];
  const modes: TransitMode[] = ['walk', 'transit', 'drive'];

  return (
    <div className={`flex items-center gap-2 py-1 px-2 ${className}`}>
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className="w-px h-1.5 bg-stone-200 dark:bg-gray-700" />
        <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
        <div className="w-px h-1.5 bg-stone-200 dark:bg-gray-700" />
      </div>

      {/* Mode selector and time */}
      <div className="flex items-center gap-1.5 flex-1">
        <div className="flex items-center bg-stone-100 dark:bg-gray-800 rounded-full p-0.5">
          {modes.map((m) => {
            const ModeIcon = modeIcons[m];
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`p-1 rounded-full transition-colors ${
                  mode === m
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-stone-700 dark:text-white'
                    : 'text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                }`}
                title={m.charAt(0).toUpperCase() + m.slice(1)}
              >
                <ModeIcon className="w-2.5 h-2.5" />
              </button>
            );
          })}
        </div>

        <span className="text-[10px] text-stone-500 dark:text-gray-400 tabular-nums">
          {formatDuration(travelTime)}
        </span>

        {distance > 0.1 && (
          <span className="text-[9px] text-stone-400 dark:text-gray-500 tabular-nums">
            {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
          </span>
        )}
      </div>
    </div>
  );
}
