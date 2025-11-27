'use client';

import { useRef, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface DayTabNavProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  className?: string;
}

/**
 * DayTabNav - Horizontal scrolling day tabs with elegant pill design
 * Journal aesthetic: Understated pills, smooth scroll snapping
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
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedDayNumber]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return {
        weekday: format(date, 'EEE'),
        day: format(date, 'd'),
        month: format(date, 'MMM'),
      };
    } catch {
      return null;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Scroll Buttons */}
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-[#faf9f7] via-[#faf9f7] to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-transparent"
      >
        <ChevronLeft className="w-5 h-5 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-gradient-to-l from-[#faf9f7] via-[#faf9f7] to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-transparent"
      >
        <ChevronRight className="w-5 h-5 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors" />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar px-10 py-2 scroll-smooth snap-x snap-mandatory"
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
                flex-shrink-0 snap-center
                flex flex-col items-center gap-0.5
                px-5 py-3 rounded-2xl
                transition-all duration-300
                ${isSelected
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 shadow-lg shadow-stone-900/20 dark:shadow-white/20 scale-105'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }
              `}
            >
              {/* Day Label */}
              <span className={`
                text-[10px] uppercase tracking-[0.15em] font-medium
                ${isSelected ? 'text-white/70 dark:text-stone-900/70' : 'text-stone-400 dark:text-stone-500'}
              `}>
                {dateInfo?.weekday || `Day`}
              </span>

              {/* Day Number */}
              <span className="text-xl font-display">
                {dateInfo?.day || day.dayNumber}
              </span>

              {/* Month (if date) */}
              {dateInfo && (
                <span className={`
                  text-[9px] uppercase tracking-wider
                  ${isSelected ? 'text-white/50 dark:text-stone-900/50' : 'text-stone-400 dark:text-stone-600'}
                `}>
                  {dateInfo.month}
                </span>
              )}

              {/* Item count indicator */}
              {day.items.length > 0 && (
                <div className={`
                  mt-1 w-1 h-1 rounded-full
                  ${isSelected ? 'bg-white/50 dark:bg-stone-900/50' : 'bg-stone-300 dark:bg-stone-600'}
                `} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
