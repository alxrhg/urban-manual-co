'use client';

import { useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface DayTabNavProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  className?: string;
}

/**
 * DayTabNav - Horizontal scrolling day tabs with text-based design
 * Clean, minimal text tabs that scroll horizontally
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

  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return format(date, 'EEE d');
    } catch {
      return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-stone-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-stone-50 dark:from-gray-950 to-transparent z-10 pointer-events-none" />

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto no-scrollbar px-2 py-1 scroll-smooth"
      >
        {days.map((day) => {
          const isSelected = day.dayNumber === selectedDayNumber;
          const dateInfo = formatDayDate(day.date);

          return (
            <button
              key={day.dayNumber}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelectDay(day.dayNumber)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 whitespace-nowrap
                ${isSelected
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-gray-800'
                }
              `}
            >
              {dateInfo || `Day ${day.dayNumber}`}
              {day.items.length > 0 && (
                <span className={`ml-1.5 ${isSelected ? 'text-white/60 dark:text-gray-900/60' : 'text-stone-400 dark:text-gray-500'}`}>
                  ({day.items.length})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
