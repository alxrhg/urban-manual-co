'use client';

import { MapPin, Calendar, Clock, Route } from 'lucide-react';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface TripStatsProps {
  days: TripDay[];
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  className?: string;
}

/**
 * TripStats - Stats grid matching Account page profile stats
 * Uses: border rounded-2xl, text-2xl font-light numbers, text-xs labels
 */
export default function TripStats({
  days,
  destination,
  startDate,
  endDate,
  className = '',
}: TripStatsProps) {
  const totalStops = days.reduce((acc, day) => acc + day.items.length, 0);
  const totalDays = days.length;

  // Calculate unique categories
  const categories = new Set<string>();
  days.forEach(day => {
    day.items.forEach(item => {
      const category = item.parsedNotes?.category || item.destination?.category;
      if (category) categories.add(category);
    });
  });

  // Format date range
  const formatDateRange = () => {
    if (!startDate && !endDate) return null;
    const start = startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const end = endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return start && end ? `${start} – ${end}` : start || end;
  };

  const dateRange = formatDateRange();

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {/* Total Stops */}
      <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-2xl">
        <div className="text-2xl font-light mb-1 text-stone-900 dark:text-white">{totalStops}</div>
        <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
          <MapPin className="w-3 h-3" />
          Stops
        </div>
      </div>

      {/* Total Days */}
      <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-2xl">
        <div className="text-2xl font-light mb-1 text-stone-900 dark:text-white">{totalDays}</div>
        <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Days
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-2xl">
        <div className="text-2xl font-light mb-1 text-stone-900 dark:text-white">{categories.size}</div>
        <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
          <Route className="w-3 h-3" />
          Categories
        </div>
      </div>

      {/* Date or Destination */}
      <div className="p-4 border border-stone-200 dark:border-stone-800 rounded-2xl">
        {dateRange ? (
          <>
            <div className="text-sm font-light mb-1 text-stone-900 dark:text-white truncate">{dateRange}</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Dates
            </div>
          </>
        ) : destination ? (
          <>
            <div className="text-sm font-light mb-1 text-stone-900 dark:text-white truncate">{destination}</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              Destination
            </div>
          </>
        ) : (
          <>
            <div className="text-2xl font-light mb-1 text-stone-400">—</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">No dates set</div>
          </>
        )}
      </div>
    </div>
  );
}
