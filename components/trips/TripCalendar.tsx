import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseDateString } from '@/lib/utils';

interface TripCalendarDay {
  dayNumber: number;
  date: string | null;
  itemCount?: number;
}

interface TripCalendarProps {
  startDate?: string | null;
  endDate?: string | null;
  days: TripCalendarDay[];
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWithinRange(date: Date, start?: Date | null, end?: Date | null) {
  if (!start || !end) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export default function TripCalendar({
  startDate,
  endDate,
  days,
  selectedDay,
  onSelectDay,
}: TripCalendarProps) {
  const parsedStart = useMemo(() => (startDate ? parseDateString(startDate) : null), [startDate]);
  const parsedEnd = useMemo(() => (endDate ? parseDateString(endDate) : null), [endDate]);

  const [currentMonth, setCurrentMonth] = useState<Date>(
    parsedStart || new Date()
  );

  useEffect(() => {
    if (parsedStart) {
      setCurrentMonth(parsedStart);
    }
  }, [parsedStart]);

  const monthStart = getMonthStart(currentMonth);
  const monthEnd = getMonthEnd(currentMonth);
  const daysInMonth = monthEnd.getDate();
  const startDayOfWeek = monthStart.getDay();

  const weeks: (Date | null)[] = useMemo(() => {
    const calendarDays: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      calendarDays.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    return calendarDays;
  }, [currentMonth, daysInMonth, startDayOfWeek]);

  const dayMap = useMemo(() => {
    const map = new Map<string, TripCalendarDay>();
    days.forEach((day) => {
      if (day.date) {
        map.set(day.date, day);
      }
    });
    return map;
  }, [days]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <div className="bg-white/70 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-semibold">Calendar</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {monthStart.toLocaleString('default', { month: 'long' })}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{monthStart.getFullYear()}</span>
          </div>
          {parsedStart && parsedEnd && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {parsedStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
              {parsedEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-7 gap-2 text-[11px] text-gray-400 uppercase tracking-[0.18em] font-semibold mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weeks.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} />;
            }

            const isoDate = toISODate(date);
            const tripDay = dayMap.get(isoDate);
            const isTripDay = isWithinRange(date, parsedStart, parsedEnd) && !!tripDay;
            const isSelected = tripDay?.dayNumber === selectedDay;
            const hasItems = (tripDay?.itemCount || 0) > 0;

            return (
              <button
                key={isoDate}
                disabled={!isTripDay}
                onClick={() => tripDay && onSelectDay(tripDay.dayNumber)}
                className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-sm transition-all duration-150 border ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-lg'
                    : isTripDay
                      ? 'bg-white/80 dark:bg-gray-950/80 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      : 'bg-gray-50/70 dark:bg-gray-900/50 border-gray-100 dark:border-gray-900 text-gray-300 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-semibold">{date.getDate()}</span>
                  {tripDay && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      isSelected
                        ? 'border-white/40'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      Day {tripDay.dayNumber}
                    </span>
                  )}
                </div>
                {hasItems ? (
                  <div className={`text-[11px] font-medium ${isSelected ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                    {tripDay?.itemCount} item{tripDay?.itemCount === 1 ? '' : 's'}
                  </div>
                ) : (
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isSelected
                      ? 'bg-white'
                      : isTripDay
                        ? 'bg-gray-300 dark:bg-gray-600'
                        : 'bg-transparent'
                  }`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
