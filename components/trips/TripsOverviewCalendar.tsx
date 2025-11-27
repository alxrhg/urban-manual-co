import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { parseDateString } from '@/lib/utils';

interface CalendarTrip {
  id: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
}

interface TripsOverviewCalendarProps {
  trips: CalendarTrip[];
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

export default function TripsOverviewCalendar({ trips }: TripsOverviewCalendarProps) {
  const parsedTrips = useMemo(
    () =>
      trips
        .map((trip) => ({
          ...trip,
          start: trip.startDate ? parseDateString(trip.startDate) : null,
          end: trip.endDate ? parseDateString(trip.endDate) : null,
        }))
        .filter((trip) => trip.start && trip.end),
    [trips]
  );

  const initialMonth = useMemo(() => {
    if (parsedTrips.length === 0) return new Date();

    const earliestTrip = parsedTrips.reduce((earliest, current) =>
      current.start && (!earliest.start || current.start < earliest.start) ? current : earliest
    );

    return earliestTrip.start ?? new Date();
  }, [parsedTrips]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);

  const monthStart = getMonthStart(currentMonth);
  const monthEnd = getMonthEnd(currentMonth);
  const daysInMonth = monthEnd.getDate();
  const startDayOfWeek = monthStart.getDay();

  const calendarDays: (Date | null)[] = useMemo(() => {
    const days: (Date | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }

    return days;
  }, [currentMonth, daysInMonth, startDayOfWeek]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const activeTripsByDay = useMemo(() => {
    const map = new Map<string, CalendarTrip[]>();

    parsedTrips.forEach((trip) => {
      if (!trip.start || !trip.end) return;

      let cursor = new Date(trip.start);
      while (cursor <= trip.end) {
        const iso = toISODate(cursor);
        const existing = map.get(iso) || [];
        map.set(iso, [...existing, trip]);
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
    });

    return map;
  }, [parsedTrips]);

  if (trips.length === 0) {
    return (
      <div className="p-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/60 dark:bg-gray-900/60 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">Add dates to your trips to see them on the calendar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-gray-900/70 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 font-semibold">Trips Calendar</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {monthStart.toLocaleString('default', { month: 'long' })}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{monthStart.getFullYear()}</span>
          </div>
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
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} />;

            const isoDate = toISODate(date);
            const activeTripsForDay = activeTripsByDay.get(isoDate) || [];
            const hasTrips = activeTripsForDay.length > 0;

            return (
              <div
                key={isoDate}
                className={`flex flex-col gap-1 rounded-2xl p-2 text-sm border min-h-[84px] ${
                  hasTrips
                    ? 'bg-white/80 dark:bg-gray-950/80 border-gray-200 dark:border-gray-800'
                    : 'bg-gray-50/70 dark:bg-gray-900/50 border-gray-100 dark:border-gray-900 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-semibold text-gray-800 dark:text-white">{date.getDate()}</span>
                  {hasTrips && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                      {activeTripsForDay.length} trip{activeTripsForDay.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {hasTrips ? (
                  <div className="flex flex-col gap-1">
                    {activeTripsForDay.slice(0, 2).map((trip) => (
                      <div
                        key={trip.id}
                        className="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate"
                        title={trip.title}
                      >
                        {trip.title}
                      </div>
                    ))}
                    {activeTripsForDay.length > 2 && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        +{activeTripsForDay.length - 2} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
