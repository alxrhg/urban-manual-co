'use client';

import { useState, useEffect, useMemo } from 'react';
import { Car, Footprints, Train } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';

export type TransitMode = 'walk' | 'drive' | 'transit';

interface Location {
  latitude?: number | null;
  longitude?: number | null;
}

interface TransitConnectorProps {
  from?: Location | null;
  to?: Location | null;
  durationMinutes?: number;
  distanceKm?: number;
  mode?: TransitMode;
  itemId?: string; // ID of the "from" item for saving travel mode
  onModeChange?: (itemId: string, mode: TransitMode) => void;
  className?: string;
}

const modeIcons: Record<TransitMode, typeof Car> = {
  walk: Footprints,
  drive: Car,
  transit: Train,
};

const modeLabels: Record<TransitMode, string> = {
  walk: 'Walk',
  drive: 'Drive',
  transit: 'Transit',
};

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
    drive: 40,   // 40 km/h city driving average
  };
  return Math.round((distanceKm / speeds[mode]) * 60); // minutes
}

/**
 * TransitConnector - Travel time connector between timeline items
 * Shows travel time estimates between locations using local calculation + API
 */
export default function TransitConnector({
  from,
  to,
  durationMinutes: propDuration,
  mode = 'walk',
  itemId,
  onModeChange,
  className = '',
}: TransitConnectorProps) {
  const [selectedMode, setSelectedMode] = useState<TransitMode>(mode);

  // Update selectedMode when mode prop changes
  useEffect(() => {
    setSelectedMode(mode);
  }, [mode]);

  // Handle mode change and notify parent
  const handleModeChange = (newMode: TransitMode) => {
    setSelectedMode(newMode);
    if (onModeChange && itemId) {
      onModeChange(itemId, newMode);
    }
  };
  const [apiDurations, setApiDurations] = useState<Record<TransitMode, number | null>>({
    walk: null,
    drive: null,
    transit: null,
  });
  const [loading, setLoading] = useState(false);

  // Check if we have valid coordinates
  const hasValidCoords = Boolean(
    from?.latitude && from?.longitude && to?.latitude && to?.longitude
  );

  // Calculate local estimates using Haversine (instant, no API call)
  const localEstimates = useMemo(() => {
    if (!hasValidCoords) return null;

    const distance = haversineDistance(
      from!.latitude!,
      from!.longitude!,
      to!.latitude!,
      to!.longitude!
    );

    return {
      walk: estimateTravelTime(distance, 'walk'),
      transit: estimateTravelTime(distance, 'transit'),
      drive: estimateTravelTime(distance, 'drive'),
      distance,
    };
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude, hasValidCoords]);

  // Fetch from Distance API for more accurate times
  useEffect(() => {
    async function fetchTravelTimes() {
      if (!hasValidCoords) return;

      setLoading(true);
      try {
        const modes: TransitMode[] = ['walk', 'drive', 'transit'];
        const results = await Promise.all(
          modes.map(async (m) => {
            try {
              const response = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  origins: [{ lat: from!.latitude, lng: from!.longitude, name: 'From' }],
                  destinations: [{ lat: to!.latitude, lng: to!.longitude, name: 'To' }],
                  mode: m === 'walk' ? 'walking' : m === 'drive' ? 'driving' : 'transit',
                }),
              });
              const data = await response.json();
              if (data.results?.[0]?.duration) {
                return { mode: m, minutes: Math.round(data.results[0].duration / 60) };
              }
              return { mode: m, minutes: null };
            } catch {
              return { mode: m, minutes: null };
            }
          })
        );

        const newDurations: Record<TransitMode, number | null> = { walk: null, drive: null, transit: null };
        results.forEach((r) => {
          newDurations[r.mode] = r.minutes;
        });
        setApiDurations(newDurations);
      } catch (err) {
        console.error('Error fetching travel times:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTravelTimes();
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude, hasValidCoords]);

  // Use API durations if available, otherwise local estimates
  const getDuration = (m: TransitMode): number | null => {
    if (apiDurations[m] !== null) return apiDurations[m];
    if (localEstimates) return localEstimates[m];
    return null;
  };

  return (
    <div className={`relative flex items-center justify-center py-2 ${className}`}>
      {/* Mode Selector Pills */}
      <div className="flex items-center gap-1 p-0.5 bg-stone-100 dark:bg-gray-800 rounded-full">
        {(['walk', 'transit', 'drive'] as TransitMode[]).map((m) => {
          const ModeIcon = modeIcons[m];
          const duration = getDuration(m);
          const isSelected = selectedMode === m;

          return (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all text-[11px] font-medium
                ${isSelected
                  ? 'bg-white dark:bg-gray-700 text-stone-900 dark:text-white shadow-sm'
                  : 'text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-300'
                }
              `}
            >
              <ModeIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {duration !== null ? (
                <span className="tabular-nums">{formatDuration(duration)}</span>
              ) : loading ? (
                <span className="w-6 h-2 bg-stone-200 dark:bg-gray-600 rounded animate-pulse" />
              ) : (
                <span className="text-stone-400 dark:text-gray-500">--</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
