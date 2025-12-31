'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface DayWeather {
  tempMax?: number;
  description?: string;
}

interface CollapsibleDayTabsProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  weatherByDate?: Record<string, DayWeather>;
  className?: string;
}

/**
 * CollapsibleDayTabs - Horizontal scrollable day selector with collapsible past dates
 *
 * UX Features:
 * - Hides past dates behind a collapsible "Past (X days)" button
 * - Shows current day (today) and future dates prominently
 * - Reduces visual clutter and focuses user attention on relevant dates
 * - Past dates are still accessible via expand/collapse toggle
 */
export default function CollapsibleDayTabs({
  days,
  selectedDayNumber,
  onSelectDay,
  weatherByDate = {},
  className = '',
}: CollapsibleDayTabsProps) {
  const [showPastDates, setShowPastDates] = useState(false);
  const currentFutureRef = useRef<HTMLDivElement>(null);

  // Get today's date at midnight for comparison
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  // Split days into past and current/future
  const { pastDays, currentFutureDays, todayDayNumber } = useMemo(() => {
    const past: TripDay[] = [];
    const currentFuture: TripDay[] = [];
    let todayNum: number | null = null;

    for (const day of days) {
      if (!day.date) {
        // No date, put in current/future to be safe
        currentFuture.push(day);
        continue;
      }

      const dayDate = new Date(day.date + 'T00:00:00');

      if (dayDate < today) {
        past.push(day);
      } else {
        currentFuture.push(day);
        if (dayDate.getTime() === today.getTime()) {
          todayNum = day.dayNumber;
        }
      }
    }

    return {
      pastDays: past,
      currentFutureDays: currentFuture,
      todayDayNumber: todayNum,
    };
  }, [days, today]);

  // Auto-scroll to selected day when it changes
  useEffect(() => {
    if (currentFutureRef.current) {
      const selectedButton = currentFutureRef.current.querySelector(
        `[data-day-number="${selectedDayNumber}"]`
      ) as HTMLElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [selectedDayNumber]);

  // Format date for display
  const formatDayDate = (date: string | null): string | null => {
    if (!date) return null;
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Render a single day tab button
  const renderDayTab = (
    day: TripDay,
    isPast: boolean = false
  ) => {
    const isSelected = day.dayNumber === selectedDayNumber;
    const isToday = day.dayNumber === todayDayNumber;
    const dayDate = formatDayDate(day.date);
    const dayWeather = day.date ? weatherByDate[day.date] : undefined;

    return (
      <button
        key={day.dayNumber}
        data-day-number={day.dayNumber}
        onClick={() => onSelectDay(day.dayNumber)}
        className={`
          flex-shrink-0 flex flex-col items-center px-5 py-2.5 rounded-full text-sm font-medium
          whitespace-nowrap transition-all relative
          ${isSelected
            ? 'bg-[var(--editorial-accent)] text-white'
            : isPast
              ? 'bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)] border border-[var(--editorial-border)] opacity-70'
              : 'bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-secondary)] hover:bg-[var(--editorial-border-subtle)] border border-[var(--editorial-border)]'
          }
        `}
        aria-label={`${dayDate || `Day ${day.dayNumber}`}${isToday ? ' (today)' : ''}${isPast ? ' (past)' : ''}`}
        aria-current={isToday ? 'date' : undefined}
      >
        <span className="flex items-center gap-1.5">
          {dayDate || `Day ${day.dayNumber}`}
          {isToday && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSelected ? 'bg-white' : 'bg-[var(--editorial-accent)]'
              }`}
              aria-hidden="true"
            />
          )}
        </span>
        {dayWeather && (
          <span
            className={`text-xs mt-0.5 ${
              isSelected ? 'text-white/80' : 'text-[var(--editorial-text-tertiary)]'
            }`}
          >
            {dayWeather.tempMax}° {dayWeather.description?.split(' ')[0]}
          </span>
        )}
      </button>
    );
  };

  // If no past days, just render the standard list
  if (pastDays.length === 0) {
    return (
      <div className={`flex gap-2 overflow-x-auto no-scrollbar pb-1 ${className}`}>
        {days.map((day) => renderDayTab(day, false))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Collapsed Past Days Toggle + Current/Future Days Row */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" ref={currentFutureRef}>
        {/* Past Days Toggle Button */}
        <button
          onClick={() => setShowPastDates(!showPastDates)}
          className={`
            flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium
            whitespace-nowrap transition-all
            ${showPastDates
              ? 'bg-[var(--editorial-text-tertiary)] text-white'
              : 'bg-[var(--editorial-bg-elevated)] text-[var(--editorial-text-tertiary)] hover:bg-[var(--editorial-border-subtle)] border border-[var(--editorial-border)] border-dashed'
            }
          `}
          aria-expanded={showPastDates}
          aria-label={`${showPastDates ? 'Hide' : 'Show'} ${pastDays.length} past days`}
        >
          {showPastDates ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <span>
            Past ({pastDays.length})
          </span>
        </button>

        {/* Current & Future Day Tabs */}
        {currentFutureDays.map((day) => renderDayTab(day, false))}
      </div>

      {/* Expanded Past Days Row */}
      {showPastDates && (
        <div
          className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pl-4 border-l-2 border-[var(--editorial-border)] ml-2"
          role="region"
          aria-label="Past trip days"
        >
          {pastDays.map((day) => renderDayTab(day, true))}
        </div>
      )}
    </div>
  );
}
