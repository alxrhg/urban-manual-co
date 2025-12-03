'use client';

import { memo } from 'react';

interface TimeGridProps {
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
  showHalfHours?: boolean;
}

// Time of day labels
function getTimeOfDayLabel(hour: number): string | null {
  if (hour === 6) return 'Morning';
  if (hour === 12) return 'Afternoon';
  if (hour === 18) return 'Evening';
  if (hour === 21) return 'Night';
  return null;
}

// Get time of day color
function getTimeOfDayColor(hour: number): string {
  if (hour >= 6 && hour < 12) return 'text-amber-500 dark:text-amber-400'; // Morning
  if (hour >= 12 && hour < 18) return 'text-orange-500 dark:text-orange-400'; // Afternoon
  if (hour >= 18 && hour < 21) return 'text-purple-500 dark:text-purple-400'; // Evening
  return 'text-indigo-500 dark:text-indigo-400'; // Night
}

/**
 * TimeGrid - Enhanced hour markers with time-of-day indicators
 */
function TimeGridComponent({
  startHour,
  endHour,
  minutesToPixels,
  showHalfHours = true,
}: TimeGridProps) {
  const rows = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const top = minutesToPixels(hour * 60);
    const label = `${hour.toString().padStart(2, '0')}:00`;
    const timeOfDayLabel = getTimeOfDayLabel(hour);
    const isPrimaryHour = hour % 3 === 0; // Make every 3rd hour more prominent

    // Hour marker
    rows.push(
      <div
        key={`hour-${hour}`}
        className="absolute left-0 right-0 flex items-center pointer-events-none"
        style={{ top }}
      >
        {/* Time label */}
        <span className={`w-12 text-[11px] tabular-nums flex-shrink-0 ${
          isPrimaryHour
            ? 'font-medium text-gray-600 dark:text-gray-300'
            : 'text-gray-400 dark:text-gray-500'
        }`}>
          {label}
        </span>
        {/* Time of day badge */}
        {timeOfDayLabel && (
          <span className={`text-[9px] font-semibold uppercase tracking-wider mr-2 ${getTimeOfDayColor(hour)}`}>
            {timeOfDayLabel}
          </span>
        )}
        {/* Separator line */}
        <div className={`flex-1 h-px ${
          isPrimaryHour
            ? 'bg-black/[0.08] dark:bg-white/[0.1]'
            : 'bg-black/[0.04] dark:bg-white/[0.06]'
        }`} />
      </div>
    );

    // Half-hour marker (subtle dotted line)
    if (showHalfHours && hour < endHour) {
      const halfHourTop = minutesToPixels(hour * 60 + 30);
      rows.push(
        <div
          key={`half-${hour}`}
          className="absolute left-0 right-0 flex items-center pointer-events-none"
          style={{ top: halfHourTop }}
        >
          <span className="w-12 flex-shrink-0" />
          <div className="flex-1 border-t border-dashed border-black/[0.03] dark:border-white/[0.04]" />
        </div>
      );
    }
  }

  return <>{rows}</>;
}

export const TimeGrid = memo(TimeGridComponent);
