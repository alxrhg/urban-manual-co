'use client';

import { memo } from 'react';

interface TripTimelineMarkerProps {
  time: string;
  duration: string;
  isFirst?: boolean;
  isLast?: boolean;
  isActive?: boolean;
}

/**
 * TripTimelineMarker - Vertical line with circle marker and time display
 * Inspired by modern timeline marker UI patterns
 */
function TripTimelineMarkerComponent({
  time,
  duration,
  isFirst = false,
  isLast = false,
  isActive = false,
}: TripTimelineMarkerProps) {
  return (
    <div className="flex flex-col items-center w-16 flex-shrink-0">
      {/* Time display */}
      <div className="text-right w-full pr-2 mb-1">
        <p className={`text-sm font-medium tabular-nums ${
          isActive
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {time}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
          {duration}
        </p>
      </div>

      {/* Vertical line and marker */}
      <div className="relative flex flex-col items-center flex-1 min-h-[60px]">
        {/* Top line segment (hidden for first item) */}
        {!isFirst && (
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        )}

        {/* Circle marker */}
        <div className={`
          relative z-10 w-3 h-3 rounded-full border-2 flex-shrink-0
          ${isActive
            ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white'
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
          }
        `} />

        {/* Bottom line segment (hidden for last item) */}
        {!isLast && (
          <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 min-h-[40px]" />
        )}
      </div>
    </div>
  );
}

export const TripTimelineMarker = memo(TripTimelineMarkerComponent);
