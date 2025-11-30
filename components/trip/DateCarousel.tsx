'use client';

import { useRef, useEffect, useCallback } from 'react';
import { format, addDays, isSameDay } from 'date-fns';

interface DateCarouselProps {
  startDate: Date;
  endDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates?: Date[]; // Dates that have events (show indicator dot)
  className?: string;
}

/**
 * DateCarousel - Horizontal scrolling date picker for trips
 * Features: snap-to-center, inertial scroll, fade masks, event indicators
 */
export default function DateCarousel({
  startDate,
  endDate,
  selectedDate,
  onSelectDate,
  eventDates = [],
  className = '',
}: DateCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Generate array of dates from start to end
  const dates: Date[] = [];
  let current = new Date(startDate);
  while (current <= endDate) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  // Check if a date has events
  const hasEvents = useCallback((date: Date) => {
    return eventDates.some(eventDate => isSameDay(eventDate, date));
  }, [eventDates]);

  // Scroll selected date to center
  const scrollToCenter = useCallback((date: Date) => {
    const container = scrollRef.current;
    const dateKey = format(date, 'yyyy-MM-dd');
    const item = itemRefs.current.get(dateKey);

    if (container && item) {
      const containerWidth = container.offsetWidth;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;
      const scrollLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);

      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth',
      });
    }
  }, []);

  // Scroll to selected date on mount and when it changes
  useEffect(() => {
    scrollToCenter(selectedDate);
  }, [selectedDate, scrollToCenter]);

  const handleSelect = (date: Date) => {
    onSelectDate(date);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left fade mask */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />

      {/* Right fade mask */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none" />

      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-2 snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {dates.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayNumber = index + 1;

          return (
            <button
              key={dateKey}
              ref={(el) => {
                if (el) itemRefs.current.set(dateKey, el);
              }}
              onClick={() => handleSelect(date)}
              className={`
                flex-shrink-0 snap-center
                flex flex-col items-center justify-center
                px-3 py-2 rounded-2xl
                min-w-[56px]
                transition-all duration-200
                ${isSelected
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }
              `}
            >
              {/* Day number */}
              <span className={`text-[10px] font-medium uppercase tracking-wide ${
                isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-400 dark:text-gray-500'
              }`}>
                Day {dayNumber}
              </span>

              {/* Weekday */}
              <span className={`text-xs font-medium ${
                isSelected ? 'text-white/80 dark:text-black/80' : ''
              }`}>
                {format(date, 'EEE')}
              </span>

              {/* Date number */}
              <span className={`text-lg font-semibold ${
                isToday && !isSelected ? 'text-black dark:text-white' : ''
              }`}>
                {format(date, 'd')}
              </span>

              {/* Event indicator dot */}
              {hasEvents(date) && (
                <div className={`
                  w-1.5 h-1.5 rounded-full mt-1
                  ${isSelected ? 'bg-white/60 dark:bg-black/60' : 'bg-black dark:bg-white'}
                `} />
              )}
            </button>
          );
        })}
      </div>

      {/* Hide scrollbar style */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
