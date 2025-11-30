'use client';

import { memo } from 'react';

interface TimeGridProps {
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
  showHalfHours?: boolean;
}

/**
 * TimeGrid - Simple time labels aligned to the left
 */
function TimeGridComponent({
  startHour,
  endHour,
  minutesToPixels,
  showHalfHours = false,
}: TimeGridProps) {
  const labels = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const top = minutesToPixels(hour * 60);
    const label = `${hour.toString().padStart(2, '0')}:00`;

    labels.push(
      <div
        key={`hour-${hour}`}
        className="absolute left-0 pointer-events-none"
        style={{ top: top - 6 }}
      >
        <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
          {label}
        </span>
      </div>
    );

    // Half-hour label (optional)
    if (showHalfHours && hour < endHour) {
      const halfHourTop = minutesToPixels(hour * 60 + 30);
      labels.push(
        <div
          key={`half-${hour}`}
          className="absolute left-0 pointer-events-none"
          style={{ top: halfHourTop - 6 }}
        >
          <span className="text-[10px] text-gray-300 dark:text-gray-600 tabular-nums">
            {hour.toString().padStart(2, '0')}:30
          </span>
        </div>
      );
    }
  }

  return <>{labels}</>;
}

export const TimeGrid = memo(TimeGridComponent);
