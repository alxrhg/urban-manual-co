'use client';

import { memo } from 'react';

interface TimeGridProps {
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
  showHalfHours?: boolean;
}

/**
 * TimeGrid - Renders the hour and half-hour markers on the timeline
 */
function TimeGridComponent({
  startHour,
  endHour,
  minutesToPixels,
  showHalfHours = true,
}: TimeGridProps) {
  const labels = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    const top = minutesToPixels(hour * 60);
    const label = `${hour.toString().padStart(2, '0')}:00`;

    // Hour marker
    labels.push(
      <div
        key={`hour-${hour}`}
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 text-[11px] text-right text-gray-400 dark:text-gray-500 tabular-nums pr-1">
            {label}
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );

    // Half-hour marker (30 minutes after the hour)
    if (showHalfHours && hour < endHour) {
      const halfHourTop = minutesToPixels(hour * 60 + 30);
      labels.push(
        <div
          key={`half-${hour}`}
          className="absolute left-0 right-0 pointer-events-none"
          style={{ top: halfHourTop }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12" /> {/* Spacer for alignment */}
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800 border-dashed" style={{ borderTopWidth: '1px', borderStyle: 'dashed' }} />
          </div>
        </div>
      );
    }
  }

  return <>{labels}</>;
}

export const TimeGrid = memo(TimeGridComponent);
