'use client';

import { memo, useEffect, useState } from 'react';
import { isToday } from 'date-fns';
import { formatMinutesToTime, formatTimeDisplay } from '@/lib/utils/time-calculations';

interface CurrentTimeIndicatorProps {
  date: string | null;
  startHour: number;
  endHour: number;
  minutesToPixels: (minutes: number) => number;
  onAutoScroll?: (top: number) => void;
}

/**
 * CurrentTimeIndicator - Shows the current time line on today's timeline
 */
function CurrentTimeIndicatorComponent({
  date,
  startHour,
  endHour,
  minutesToPixels,
  onAutoScroll,
}: CurrentTimeIndicatorProps) {
  const [currentMinutes, setCurrentMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!date || !isToday(new Date(date))) {
      setCurrentMinutes(null);
      return;
    }

    const updateTime = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setCurrentMinutes(minutes);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  useEffect(() => {
    if (currentMinutes !== null && onAutoScroll) {
      const top = minutesToPixels(currentMinutes);
      onAutoScroll(top);
    }
  }, [currentMinutes, minutesToPixels, onAutoScroll]);

  if (currentMinutes === null) return null;
  if (currentMinutes < startHour * 60 || currentMinutes > endHour * 60) return null;

  const top = minutesToPixels(currentMinutes);
  const timeLabel = formatTimeDisplay(formatMinutesToTime(currentMinutes));

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-20"
      style={{ top }}
      role="status"
      aria-label={`Current time: ${timeLabel}`}
    >
      <div className="flex items-center">
        <div className="w-12 text-[11px] text-right text-red-500 font-medium tabular-nums pr-2">
          {timeLabel}
        </div>
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  );
}

export const CurrentTimeIndicator = memo(CurrentTimeIndicatorComponent);
