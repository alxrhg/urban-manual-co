'use client';

import { useRef, useEffect } from 'react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface DayTabNavProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  className?: string;
}

/**
 * DayTabNav - Horizontal scrolling day tabs matching main tab navigation design
 */
export default function DayTabNav({
  days,
  selectedDayNumber,
  onSelectDay,
  className = '',
}: DayTabNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Scroll selected tab into view
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const tab = selectedRef.current;
      const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedDayNumber]);

  return (
    <div className={`relative flex-1 min-w-0 overflow-hidden ${className}`}>
      {/* Tabs Container - scrollable horizontally */}
      <div
        ref={scrollRef}
        className="flex gap-x-4 text-xs overflow-x-auto scrollbar-hide border-b border-gray-100 dark:border-gray-800"
      >
        {days.map((day) => {
          const isSelected = day.dayNumber === selectedDayNumber;

          return (
            <button
              key={day.dayNumber}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelectDay(day.dayNumber)}
              className={`
                transition-all flex items-center gap-1.5 whitespace-nowrap
                pb-2
                ${isSelected
                  ? 'font-medium text-gray-900 dark:text-white border-b-2 border-gray-900 dark:border-white -mb-[1px]'
                  : 'font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }
              `}
            >
              Day {day.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}
