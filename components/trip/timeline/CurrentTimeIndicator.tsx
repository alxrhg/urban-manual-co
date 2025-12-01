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
 * CurrentTimeIndicator - Square UI inspired time indicator
 * Features: Purple/violet theme, triangle marker, animated pulse
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
        {/* Time label - Square UI violet style */}
        <div className="w-12 text-[11px] text-right text-violet-600 dark:text-violet-400 font-semibold tabular-nums pr-1.5">
          {timeLabel}
        </div>

        {/* Triangle marker - Square UI style */}
        <div className="relative flex items-center">
          {/* Triangle pointing right */}
          <div
            className="w-0 h-0 -mr-px"
            style={{
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '6px solid rgb(139 92 246)', // violet-500
            }}
          />
          {/* Pulsing dot for animation effect */}
          <div className="absolute -left-1 w-2 h-2 rounded-full bg-violet-500 animate-pulse opacity-50" />
        </div>

        {/* Line - violet gradient */}
        <div className="flex-1 h-[2px] bg-gradient-to-r from-violet-500 to-violet-400/50 dark:from-violet-500 dark:to-violet-500/30" />
      </div>

      {/* Vertical indicator line extending below (Square UI style) */}
      <div className="absolute left-12 top-full w-[2px] h-4 bg-gradient-to-b from-violet-500 to-transparent" />
    </div>
  );
}

export const CurrentTimeIndicator = memo(CurrentTimeIndicatorComponent);
