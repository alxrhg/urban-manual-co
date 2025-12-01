'use client';

import { memo } from 'react';

interface TimeGridProps {
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
  showHalfHours?: boolean;
}

/**
 * TimeGrid - Clean hour markers following Apple HIG
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
        {/* Separator line */}
        <div className="flex-1 h-px bg-black/[0.04] dark:bg-white/[0.06]" />
      </div>
    );

    if (showHalfHours && hour !== endHour) {
      const halfTop = minutesToPixels(hour * 60 + 30);
      rows.push(
        <div
          key={`half-${hour}`}
          className="absolute left-12 right-0 flex items-center pointer-events-none"
          style={{ top: halfTop }}
        >
          <div className="flex-1 h-px border-t border-dashed border-black/[0.04] dark:border-white/[0.08]" />
        </div>
      );
    }
  }

  return <>{rows}</>;
}

export const TimeGrid = memo(TimeGridComponent);
