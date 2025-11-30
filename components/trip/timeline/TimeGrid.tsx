'use client';

import { memo } from 'react';

interface TimeGridProps {
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
  showHalfHours?: boolean;
}

/**
 * TimeGrid - Hour labels with light grey horizontal lines
 */
function TimeGridComponent({
  startHour,
  endHour,
  minutesToPixels,
}: TimeGridProps) {
  const rows = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const top = minutesToPixels(hour * 60);
    const label = `${hour.toString().padStart(2, '0')}:00`;

    rows.push(
      <div
        key={`hour-${hour}`}
        className="absolute left-0 right-0 flex items-center pointer-events-none"
        style={{ top }}
      >
        {/* Time label */}
        <span className="w-12 text-[11px] text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
          {label}
        </span>
        {/* Horizontal line - lighter */}
        <div className="flex-1 h-px bg-gray-100/60 dark:bg-gray-800/50" />
      </div>
    );
  }

  return <>{rows}</>;
}

export const TimeGrid = memo(TimeGridComponent);
