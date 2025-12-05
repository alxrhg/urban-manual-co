'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { TripState, TripStats } from '@/lib/trip';

// Activity type icons
const ACTIVITY_ICONS: Record<string, string> = {
  flight: '✈️',
  hotel: '🏨',
  restaurant: '🍽️',
  cafe: '☕',
  culture: '🏛️',
  place: '📍',
  bar: '🍸',
  breakfast: '🍳',
  event: '🎫',
  activity: '🎯',
  custom: '📌',
};

// Get icon for an activity type
function getActivityIcon(type: string): string {
  return ACTIVITY_ICONS[type.toLowerCase()] || '📍';
}

// Activity item from itinerary
export interface CalendarActivity {
  id: string;
  date: string; // ISO date
  day: number;
  type: string;
  title: string;
  time?: string;
}

// Day column data
interface DayColumn {
  date: Date;
  dayOfWeek: string;
  dayNumber: number;
  activities: CalendarActivity[];
  isToday: boolean;
  hasActivities: boolean;
}

export interface CalendarTripCardProps {
  trip: {
    id: string;
    title: string;
    emoji?: string;
    start_date: string | null;
    end_date: string | null;
    stats: TripStats;
  };
  activities: CalendarActivity[];
  state: TripState;
  timeLabel: string | null;
}

// Day of week abbreviations
const DAY_ABBREVS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Get days between two dates
function getDaysBetween(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Format date range
function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();

  if (!endDate) {
    return `${startMonth} ${startDay}`;
  }

  const end = new Date(endDate);
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

// Generate day columns for the calendar preview
function generateDayColumns(
  startDate: string | null,
  endDate: string | null,
  activities: CalendarActivity[],
  maxDays: number = 7
): { columns: DayColumn[]; isCondensed: boolean; totalDays: number } {
  if (!startDate || !endDate) {
    return { columns: [], isCondensed: false, totalDays: 0 };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = getDaysBetween(start, end);
  const isCondensed = totalDays > maxDays;

  // Build columns for each day
  const columns: DayColumn[] = [];

  // Determine which days to show
  let daysToShow: Date[] = [];

  if (totalDays <= maxDays) {
    // Show all days
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      daysToShow.push(date);
    }
  } else {
    // Show first 5 days + last day (or condensed week view for very long trips)
    for (let i = 0; i < Math.min(5, totalDays); i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      daysToShow.push(date);
    }
    // Add last day if not already included
    if (totalDays > 5) {
      daysToShow.push(end);
    }
  }

  // Build column for each day
  for (const date of daysToShow) {
    const dateStr = date.toISOString().split('T')[0];
    const dayActivities = activities.filter(a => a.date === dateStr);

    columns.push({
      date,
      dayOfWeek: DAY_ABBREVS[date.getDay()],
      dayNumber: date.getDate(),
      activities: dayActivities,
      isToday: date.getTime() === today.getTime(),
      hasActivities: dayActivities.length > 0,
    });
  }

  return { columns, isCondensed, totalDays };
}

// Week view for long trips (23+ days)
interface WeekData {
  weekNumber: number;
  startDate: Date;
  daysWithActivities: number;
  totalItems: number;
}

function generateWeekView(
  startDate: string | null,
  endDate: string | null,
  activities: CalendarActivity[]
): WeekData[] {
  if (!startDate || !endDate) return [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = getDaysBetween(start, end);
  const weeks: WeekData[] = [];

  for (let weekNum = 0; weekNum < Math.ceil(totalDays / 7); weekNum++) {
    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + weekNum * 7);

    // Get activities for this week
    let daysWithActivities = 0;
    let totalItems = 0;

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      if (date > end) break;

      const dateStr = date.toISOString().split('T')[0];
      const dayActivities = activities.filter(a => a.date === dateStr);

      if (dayActivities.length > 0) {
        daysWithActivities++;
        totalItems += dayActivities.length;
      }
    }

    weeks.push({
      weekNumber: weekNum + 1,
      startDate: weekStart,
      daysWithActivities,
      totalItems,
    });
  }

  return weeks;
}

export function CalendarTripCard({ trip, activities, state, timeLabel }: CalendarTripCardProps) {
  const isPast = state === 'past';
  const totalItems = trip.stats.flights + trip.stats.hotels + trip.stats.restaurants + trip.stats.places;
  const hasActivities = totalItems > 0;

  // Calculate trip duration
  let daysCount = 0;
  if (trip.start_date && trip.end_date) {
    daysCount = getDaysBetween(new Date(trip.start_date), new Date(trip.end_date));
  }

  const dateDisplay = formatDateRange(trip.start_date, trip.end_date);
  const { columns, isCondensed, totalDays } = generateDayColumns(trip.start_date, trip.end_date, activities);
  const showWeekView = totalDays > 14;
  const weeks = showWeekView ? generateWeekView(trip.start_date, trip.end_date, activities) : [];

  // Status styling
  const statusStyles = isPast
    ? 'text-gray-400 dark:text-gray-500'
    : timeLabel === 'Today'
      ? 'text-blue-600 dark:text-blue-400 font-medium'
      : 'text-blue-600 dark:text-blue-400';

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={`
        group block bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        rounded-xl p-4
        hover:border-gray-300 dark:hover:border-gray-700
        hover:shadow-md
        transition-all duration-200 ease-out
        cursor-pointer
        ${isPast ? 'opacity-90' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          {/* Title with emoji */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {trip.emoji && <span className="mr-1.5">{trip.emoji}</span>}
            {trip.title}
          </h3>

          {/* Date range and duration */}
          {dateDisplay && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {dateDisplay}
              {daysCount > 0 && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' · '}{daysCount} day{daysCount !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Time label / Status */}
        {timeLabel && (
          <span className={`text-sm flex-shrink-0 ml-3 ${statusStyles}`}>
            {timeLabel}
          </span>
        )}
      </div>

      {/* Calendar Preview */}
      {hasActivities && trip.start_date && trip.end_date ? (
        <>
          {showWeekView ? (
            /* Week view for long trips */
            <div className="flex gap-2 overflow-x-auto py-2 -mx-1 px-1 scrollbar-hide">
              {weeks.slice(0, 4).map((week, idx) => (
                <div
                  key={idx}
                  className={`
                    flex-shrink-0 min-w-[72px] p-2 rounded-lg text-center
                    ${week.totalItems > 0
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                    }
                  `}
                >
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Week {week.weekNumber}
                  </div>
                  {/* Mini heatmap */}
                  <div className="flex justify-center gap-0.5 mb-1">
                    {[0, 1, 2, 3, 4, 5, 6].map(d => {
                      const date = new Date(week.startDate);
                      date.setDate(date.getDate() + d);
                      const dateStr = date.toISOString().split('T')[0];
                      const hasActivity = activities.some(a => a.date === dateStr);
                      return (
                        <div
                          key={d}
                          className={`
                            w-2 h-2 rounded-sm
                            ${hasActivity
                              ? 'bg-blue-500 dark:bg-blue-400'
                              : 'bg-gray-200 dark:bg-gray-700'
                            }
                          `}
                        />
                      );
                    })}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {week.totalItems} item{week.totalItems !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
              {weeks.length > 4 && (
                <div className="flex-shrink-0 min-w-[48px] flex items-center justify-center text-gray-400 text-sm">
                  +{weeks.length - 4}
                </div>
              )}
            </div>
          ) : (
            /* Day columns for shorter trips */
            <div className="flex gap-2 overflow-x-auto py-2 -mx-1 px-1 scrollbar-hide">
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className={`
                    flex-shrink-0 min-w-[56px] p-2 rounded-lg flex flex-col items-center
                    ${col.isToday
                      ? 'ring-2 ring-blue-500 dark:ring-blue-400'
                      : ''
                    }
                    ${col.hasActivities
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                    }
                  `}
                >
                  {/* Day label */}
                  <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    {col.dayOfWeek}
                  </div>
                  {/* Date number */}
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {col.dayNumber}
                  </div>
                  {/* Activity icons */}
                  <div className="flex flex-col gap-0.5 items-center min-h-[40px]">
                    {col.activities.slice(0, 3).map((activity, aIdx) => (
                      <span key={aIdx} className="text-xs leading-tight">
                        {getActivityIcon(activity.type)}
                      </span>
                    ))}
                    {col.activities.length > 3 && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        +{col.activities.length - 3}
                      </span>
                    )}
                  </div>
                  {/* Item count */}
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-auto">
                    {col.activities.length > 0
                      ? `${col.activities.length} item${col.activities.length !== 1 ? 's' : ''}`
                      : ''
                    }
                  </div>
                </div>
              ))}
              {isCondensed && totalDays > 6 && (
                <div className="flex-shrink-0 w-8 flex items-center justify-center text-gray-400 text-sm">
                  ...
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty state */
        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">📍</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            No activities planned yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            Start adding places to your trip
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
            <Plus className="w-3 h-3" />
            Start Planning
          </span>
        </div>
      )}
    </Link>
  );
}
