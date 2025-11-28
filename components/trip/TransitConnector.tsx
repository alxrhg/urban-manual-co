'use client';

import { useState, useEffect } from 'react';
import { Car, Footprints, Train } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';

type TransitMode = 'walk' | 'drive' | 'transit';

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
 * TransitConnector - Travel time connector between timeline items
 * Calculates actual travel time via API when coordinates provided
 */
export default function TransitConnector({
  from,
  to,
  durationMinutes: propDuration,
  mode = 'walk',
  className = '',
}: TransitConnectorProps) {
  const [selectedMode, setSelectedMode] = useState<TransitMode>(mode);
  const [durations, setDurations] = useState<Record<TransitMode, number | null>>({
    walk: null,
    drive: null,
    transit: null,
  });
  const [loading, setLoading] = useState(false);

  // Calculate travel times when coordinates change
  useEffect(() => {
    async function fetchTravelTimes() {
      const fromLat = from?.latitude;
      const fromLng = from?.longitude;
      const toLat = to?.latitude;
      const toLng = to?.longitude;

      if (!fromLat || !fromLng || !toLat || !toLng) {
        return;
      }

      setLoading(true);
      try {
        // Fetch all modes in parallel
        const modes: TransitMode[] = ['walk', 'drive', 'transit'];
        const results = await Promise.all(
          modes.map(async (m) => {
            try {
              const response = await fetch('/api/distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  origins: [{ lat: fromLat, lng: fromLng, name: 'From' }],
                  destinations: [{ lat: toLat, lng: toLng, name: 'To' }],
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
        setDurations(newDurations);
      } catch (err) {
        console.error('Error fetching travel times:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTravelTimes();
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude]);

  const currentDuration = durations[selectedMode] ?? propDuration;
  const Icon = modeIcons[selectedMode];

  return (
    <div
      className={`
        relative flex items-center justify-center
        py-2
        ${className}
      `}
    >
      {/* Mode Selector Pills */}
      <div className="flex items-center gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full">
        {(['walk', 'transit', 'drive'] as TransitMode[]).map((m) => {
          const ModeIcon = modeIcons[m];
          const duration = durations[m];
          const isSelected = selectedMode === m;

          return (
            <button
              key={m}
              onClick={() => setSelectedMode(m)}
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-full transition-all text-[10px] font-medium
                ${isSelected
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <ModeIcon className="w-3 h-3" strokeWidth={1.5} />
              {duration !== null ? (
                <span className="tabular-nums">{formatDuration(duration)}</span>
              ) : loading ? (
                <span className="w-6 h-2 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              ) : (
                <span>{modeLabels[m]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
