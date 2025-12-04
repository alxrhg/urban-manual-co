'use client';

import { memo } from 'react';
import { Car, Footprints, Train, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';
import type { ItineraryItemWithPosition } from './useItineraryItems';

export type TravelMode = 'walking' | 'driving' | 'transit';

interface TravelConnectorProps {
  from: ItineraryItemWithPosition;
  to: ItineraryItemWithPosition;
  travelTime?: number; // minutes
  travelMode?: TravelMode;
  onModeChange?: (mode: TravelMode) => void;
  className?: string;
}

const modeIcons: Record<TravelMode, typeof Car> = {
  walking: Footprints,
  driving: Car,
  transit: Train,
};

/**
 * TravelConnector - Visual connector showing travel time between timeline items
 * Displays estimated travel time and allows mode selection
 */
function TravelConnectorComponent({
  from,
  to,
  travelTime,
  travelMode = 'walking',
  onModeChange,
  className = '',
}: TravelConnectorProps) {
  // Calculate gap between items
  const gapMinutes = to.startMinutes - from.endMinutes;

  // Determine if there's meaningful travel time to show
  const showTravelTime = travelTime && travelTime > 0;
  const showGap = gapMinutes > 0;

  if (!showGap && !showTravelTime) {
    return null;
  }

  const Icon = modeIcons[travelMode];
  const displayTime = travelTime || Math.max(5, Math.round(gapMinutes * 0.3));

  return (
    <div
      className={`
        relative flex items-center justify-center py-2
        ${className}
      `}
    >
      {/* Vertical line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />

      {/* Travel info pill */}
      <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-900 rounded-full ring-1 ring-gray-200 dark:ring-gray-700">
        {/* Mode selector buttons */}
        {onModeChange ? (
          <div className="flex items-center gap-0.5">
            {(['walking', 'transit', 'driving'] as TravelMode[]).map((mode) => {
              const ModeIcon = modeIcons[mode];
              const isSelected = travelMode === mode;

              return (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`
                    p-1 rounded-full transition-colors
                    ${isSelected
                      ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }
                  `}
                  aria-label={`Travel by ${mode}`}
                >
                  <ModeIcon className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        ) : (
          <Icon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
        )}

        {/* Separator */}
        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />

        {/* Time */}
        <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
          <Clock className="w-3 h-3" />
          {formatDuration(displayTime)}
        </span>
      </div>
    </div>
  );
}

export const TravelConnector = memo(TravelConnectorComponent);
