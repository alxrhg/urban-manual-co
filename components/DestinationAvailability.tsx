'use client';

import { useMemo } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTrip } from '@/contexts/TripContext';
import {
  getTripDateRange,
  isOpenOnDate,
  formatDateShort,
} from '@/lib/utils/opening-hours';

interface DestinationAvailabilityProps {
  openingHours: any; // opening_hours_json from destination
  destinationName?: string;
}

interface DayAvailability {
  date: Date;
  isOpen: boolean;
  hours: string | null;
}

/**
 * Shows destination availability during the user's active trip dates.
 * Only renders when the user has an active trip with defined dates.
 */
export function DestinationAvailability({
  openingHours,
  destinationName,
}: DestinationAvailabilityProps) {
  const { activeTrip } = useTrip();

  // Calculate availability for each day of the trip
  const availability = useMemo((): DayAvailability[] => {
    if (!activeTrip?.start_date || !activeTrip?.end_date) {
      return [];
    }

    const tripDates = getTripDateRange(activeTrip.start_date, activeTrip.end_date);

    // Limit to reasonable number of days to avoid performance issues
    const limitedDates = tripDates.slice(0, 14);

    return limitedDates.map((date) => {
      const { isOpen, hours } = isOpenOnDate(openingHours, date);
      return {
        date,
        isOpen,
        hours,
      };
    });
  }, [activeTrip?.start_date, activeTrip?.end_date, openingHours]);

  // Don't render if no active trip or no dates
  if (!activeTrip || availability.length === 0) {
    return null;
  }

  // Don't render if no opening hours data
  if (!openingHours) {
    return null;
  }

  // Calculate summary stats
  const openDays = availability.filter((d) => d.isOpen).length;
  const closedDays = availability.filter((d) => !d.isOpen && d.hours !== null).length;
  const unknownDays = availability.filter((d) => d.hours === null).length;

  // If all days have unknown hours, don't show the widget
  if (unknownDays === availability.length) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
          During your trip to {activeTrip.destination || 'your destination'}
        </h4>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 mb-3 text-xs">
        {openDays > 0 && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            {openDays} day{openDays !== 1 ? 's' : ''} open
          </span>
        )}
        {closedDays > 0 && (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            {closedDays} day{closedDays !== 1 ? 's' : ''} closed
          </span>
        )}
      </div>

      {/* Daily breakdown */}
      <div className="space-y-1.5">
        {availability.map(({ date, isOpen, hours }) => (
          <div
            key={date.toISOString()}
            className="flex items-center justify-between text-sm py-1"
          >
            <span className="text-gray-700 dark:text-gray-300">
              {formatDateShort(date)}
            </span>
            <span
              className={`font-medium ${
                hours === null
                  ? 'text-gray-400 dark:text-gray-500'
                  : isOpen
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
              }`}
            >
              {hours === null ? (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Hours unknown
                </span>
              ) : (
                hours
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Truncation notice */}
      {availability.length === 14 &&
        activeTrip.start_date &&
        activeTrip.end_date && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
            Showing first 14 days of your trip
          </p>
        )}
    </div>
  );
}

export default DestinationAvailability;
