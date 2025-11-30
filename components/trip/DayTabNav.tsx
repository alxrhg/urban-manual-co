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
    <div className={`relative min-w-0 flex-1 ${className}`}>
      {/* Tabs Container - scrollable horizontally */}
      <div
        ref={scrollRef}
        className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide"
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
                px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                min-h-[40px] sm:min-h-0
                ${isSelected
                  ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                  : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
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
