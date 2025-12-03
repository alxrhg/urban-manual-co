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
        {/* Time badge with glow effect */}
        <div className="relative mr-1">
          <span className="absolute inset-0 bg-orange-500/30 blur-sm rounded-full" />
          <span className="relative inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-semibold rounded-full shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {timeLabel}
          </span>
        </div>
        {/* Connecting line with gradient */}
        <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-500 via-orange-400 to-transparent rounded-full shadow-sm" />
      </div>
    </div>
  );
}

export const CurrentTimeIndicator = memo(CurrentTimeIndicatorComponent);
