'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { format, addDays, isSameDay, isToday as checkIsToday, differenceInDays } from 'date-fns';
import { Sun, Cloud, CloudRain, CloudSnow, CloudSun } from 'lucide-react';

// Weather data type
export interface DayWeather {
  date: string; // YYYY-MM-DD
  icon: 'sun' | 'cloud' | 'cloud-sun' | 'rain' | 'snow';
  high: number;
  low: number;
}

interface DateCarouselProps {
  startDate: Date;
  endDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates?: Date[]; // Dates that have events (show indicator dot)
  weather?: DayWeather[]; // Weather data per day
  showDayCounter?: boolean; // Show "Day X / Y" counter
  showWeather?: boolean; // Show weather icons
  highlightToday?: boolean; // Highlight today with special style
  className?: string;
}

// Weather icon mapping
const WeatherIcon = ({ icon, className }: { icon: DayWeather['icon']; className?: string }) => {
  switch (icon) {
    case 'sun':
      return <Sun className={className} />;
    case 'cloud':
      return <Cloud className={className} />;
    case 'cloud-sun':
      return <CloudSun className={className} />;
    case 'rain':
      return <CloudRain className={className} />;
    case 'snow':
      return <CloudSnow className={className} />;
    default:
      return <Sun className={className} />;
  }
};

/**
 * DateCarousel - Horizontal scrolling date picker for trips
 * Features: snap-to-center, weather display, day counter, event indicators
 */
export default function DateCarousel({
  startDate,
  endDate,
  selectedDate,
  onSelectDate,
  eventDates = [],
  weather = [],
  showDayCounter = true,
  showWeather = true,
  highlightToday = true,
  className = '',
}: DateCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Generate array of dates from start to end
  const dates = useMemo(() => {
    const result: Date[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      result.push(new Date(current));
      current = addDays(current, 1);
    }
    return result;
  }, [startDate, endDate]);

  // Total days for counter
  const totalDays = dates.length;

  // Current day number
  const currentDayNumber = useMemo(() => {
    return differenceInDays(selectedDate, startDate) + 1;
  }, [selectedDate, startDate]);

  // Weather lookup map
  const weatherMap = useMemo(() => {
    const map = new Map<string, DayWeather>();
    weather.forEach(w => map.set(w.date, w));
    return map;
  }, [weather]);

  // Check if a date has events
  const hasEvents = useCallback((date: Date) => {
    return eventDates.some(eventDate => isSameDay(eventDate, date));
  }, [eventDates]);

  // Get weather for a date
  const getWeather = useCallback((date: Date): DayWeather | null => {
    const key = format(date, 'yyyy-MM-dd');
    return weatherMap.get(key) || null;
  }, [weatherMap]);

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

  // Handle swipe for quick navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      const prevDay = addDays(selectedDate, -1);
      if (prevDay >= startDate) onSelectDate(prevDay);
    } else if (e.key === 'ArrowRight') {
      const nextDay = addDays(selectedDate, 1);
      if (nextDay <= endDate) onSelectDate(nextDay);
    }
  }, [selectedDate, startDate, endDate, onSelectDate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className={`relative ${className}`}>
      {/* Day Counter Header */}
      {showDayCounter && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Day {currentDayNumber} / {totalDays}
          </span>
        </div>
      )}

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
          const isToday = highlightToday && checkIsToday(date);
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayNumber = index + 1;
          const dayWeather = showWeather ? getWeather(date) : null;

          return (
            <button
              key={dateKey}
              ref={(el) => {
                if (el) itemRefs.current.set(dateKey, el);
              }}
              onClick={() => onSelectDate(date)}
              className={`
                flex-shrink-0 snap-center
                flex flex-col items-center justify-center
                px-3 py-2 rounded-2xl
                min-w-[56px]
                transition-all duration-200
                ${isSelected
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : isToday
                    ? 'bg-gray-100 dark:bg-gray-800 ring-2 ring-black dark:ring-white'
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

              {/* Weather */}
              {dayWeather && (
                <div className="flex items-center gap-0.5 mt-1">
                  <WeatherIcon
                    icon={dayWeather.icon}
                    className={`w-3 h-3 ${
                      isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-400'
                    }`}
                  />
                  <span className={`text-[9px] ${
                    isSelected ? 'text-white/70 dark:text-black/70' : 'text-gray-400'
                  }`}>
                    {dayWeather.high}°
                  </span>
                </div>
              )}

              {/* Event indicator dot */}
              {hasEvents(date) && !dayWeather && (
                <div className={`
                  w-1.5 h-1.5 rounded-full mt-1
                  ${isSelected ? 'bg-white/60 dark:bg-black/60' : 'bg-black dark:bg-white'}
                `} />
              )}

              {/* Today badge */}
              {isToday && !isSelected && (
                <span className="text-[8px] font-bold text-black dark:text-white mt-0.5">
                  TODAY
                </span>
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
