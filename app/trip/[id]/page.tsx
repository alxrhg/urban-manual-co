'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Utensils,
} from 'lucide-react';

type UseTripResult = ReturnType<typeof useTrip>;
type TripWithDays = NonNullable<UseTripResult['trip']>;
type TripDay = TripWithDays['days'][number];

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string | null;
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const { trip, loading, error } = useTrip(tripId);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    if (!trip?.days || trip.days.length === 0) {
      setSelectedDayIndex(0);
      return;
    }
    setSelectedDayIndex((prev) =>
      prev >= trip.days.length ? trip.days.length - 1 : prev
    );
  }, [trip?.id, trip?.days?.length]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={() => router.push('/trips')}
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
          >
            Back to trips
          </button>
        </div>
      </div>
    );
  }

  // Not found
  if (!trip) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-neutral-500 text-sm">Trip not found</p>
          <button
            onClick={() => router.push('/trips')}
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition"
          >
            Back to trips
          </button>
        </div>
      </div>
    );
  }

  const hasDays = trip.days && trip.days.length > 0;
  const selectedDay = hasDays ? trip.days[selectedDayIndex] : null;

  // Format date helper
  const formatDateShort = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateRange = () => {
    if (!trip.start_date || !trip.end_date) return null;
    const start = formatDateShort(trip.start_date);
    const end = formatDateShort(trip.end_date);
    return `${start} – ${end}`;
  };

  const goToPrevDay = () => {
    if (selectedDayIndex > 0) setSelectedDayIndex(selectedDayIndex - 1);
  };

  const goToNextDay = () => {
    if (hasDays && selectedDayIndex < trip.days.length - 1) {
      setSelectedDayIndex(selectedDayIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-100 dark:border-neutral-900">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.push('/trips')}
              className="p-2 -ml-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>

            <div className="flex-1 min-w-0 text-center">
              <h1 className="text-base font-semibold text-neutral-900 dark:text-white truncate">
                {trip.title}
              </h1>
              {trip.destination && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {trip.destination}
                </p>
              )}
            </div>

            <button
              onClick={() => openDrawer('trip-overview', { trip })}
              className="p-2 -mr-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <MoreHorizontal className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto">
        {/* Trip Info Bar */}
        {(trip.start_date || trip.destination) && (
          <div className="px-4 py-4 border-b border-neutral-100 dark:border-neutral-900">
            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              {formatDateRange() && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formatDateRange()}
                </span>
              )}
              {trip.destination && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {trip.destination}
                </span>
              )}
              {hasDays && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Day Navigator */}
        {hasDays && (
          <div className="sticky top-[57px] z-30 bg-white dark:bg-neutral-950 border-b border-neutral-100 dark:border-neutral-900">
            <div className="px-4 py-3 flex items-center justify-between gap-2">
              <button
                onClick={goToPrevDay}
                disabled={selectedDayIndex === 0}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>

              <div className="flex-1 text-center">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  Day {selectedDayIndex + 1}
                </p>
                {selectedDay?.date && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {formatDateShort(selectedDay.date)}
                  </p>
                )}
              </div>

              <button
                onClick={goToNextDay}
                disabled={selectedDayIndex === trip.days.length - 1}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {/* Day Pills */}
            <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
              <div className="flex gap-1.5 min-w-max">
                {trip.days.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDayIndex(i)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition ${
                      selectedDayIndex === i
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-6">
          {hasDays && selectedDay ? (
            <DayContent
              day={selectedDay}
              dayIndex={selectedDayIndex}
              trip={trip}
              openDrawer={openDrawer}
            />
          ) : (
            <EmptyState trip={trip} openDrawer={openDrawer} />
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      {hasDays && selectedDay && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() =>
              openDrawer('place-selector', {
                day: selectedDay,
                trip,
                index: selectedDayIndex,
                replaceIndex: null,
              })
            }
            className="w-14 h-14 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-lg shadow-neutral-900/20 dark:shadow-black/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function DayContent({
  day,
  dayIndex,
  trip,
  openDrawer,
}: {
  day: TripDay;
  dayIndex: number;
  trip: TripWithDays;
  openDrawer: (type: string, props: any) => void;
}) {
  // Build timeline entries from meals and activities
  const entries = buildEntries(day);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => openDrawer('trip-day', { day, dayIndex, trip })}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition"
        >
          <Pencil className="w-4 h-4" />
          Edit Day
        </button>
        <button
          onClick={() => openDrawer('trip-ai', { trip, suggestions: [] })}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition"
        >
          <Sparkles className="w-4 h-4" />
          Ideas
        </button>
      </div>

      {/* Timeline */}
      {entries.length > 0 ? (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <TimelineItem
              key={entry.id}
              entry={entry}
              isLast={i === entries.length - 1}
              openDrawer={openDrawer}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-neutral-400" />
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            No activities planned for this day
          </p>
          <button
            onClick={() =>
              openDrawer('place-selector', {
                day,
                trip,
                index: dayIndex,
                replaceIndex: null,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Add first place
          </button>
        </div>
      )}
    </div>
  );
}

interface TimelineEntry {
  id: string;
  title: string;
  type: 'meal' | 'activity';
  mealType?: string;
  time?: string;
  image?: string | null;
  slug?: string;
}

function TimelineItem({
  entry,
  isLast,
  openDrawer,
}: {
  entry: TimelineEntry;
  isLast: boolean;
  openDrawer: (type: string, props: any) => void;
}) {
  const isMeal = entry.type === 'meal';
  const iconBg = isMeal
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';

  return (
    <button
      onClick={() => entry.slug && openDrawer('destination', { slug: entry.slug })}
      className="w-full flex gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition text-left group"
    >
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`}>
          {isMeal ? <Utensils className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
        </div>
        {!isLast && <div className="w-px flex-1 bg-neutral-200 dark:bg-neutral-800 my-1" />}
      </div>

      {/* Image */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
        {entry.image ? (
          <Image
            src={entry.image}
            alt={entry.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
          {entry.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {entry.mealType && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
              {entry.mealType}
            </span>
          )}
          {entry.time && (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
              <Clock className="w-3 h-3" />
              {entry.time}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyState({
  trip,
  openDrawer,
}: {
  trip: TripWithDays;
  openDrawer: (type: string, props: any) => void;
}) {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Calendar className="w-7 h-7 text-neutral-400" />
      </div>
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        Start planning your trip
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-6">
        Add dates to create your day-by-day itinerary, then fill it with places and activities.
      </p>
      <button
        onClick={() => openDrawer('trip-overview', { trip })}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition"
      >
        <Plus className="w-4 h-4" />
        Set trip dates
      </button>
    </div>
  );
}

function buildEntries(day: TripDay): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Helper to parse image from item
  const getImage = (item: any): string | null => {
    if (item?.image) return item.image;
    if (item?.image_thumbnail) return item.image_thumbnail;
    if (item?.notes) {
      try {
        const notes = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes;
        return notes?.image || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // Add meals
  const mealTypes = ['breakfast', 'lunch', 'dinner'] as const;
  mealTypes.forEach((mealType) => {
    const meal = day.meals?.[mealType];
    if (meal) {
      entries.push({
        id: `meal-${mealType}`,
        title: meal.title || meal.name || mealType.charAt(0).toUpperCase() + mealType.slice(1),
        type: 'meal',
        mealType,
        time: meal.time,
        image: getImage(meal),
        slug: meal.slug || meal.destination_slug,
      });
    }
  });

  // Add activities
  if (day.activities?.length) {
    day.activities.forEach((activity: any, i: number) => {
      entries.push({
        id: `activity-${i}`,
        title: activity.title || activity.name || 'Activity',
        type: 'activity',
        time: activity.time,
        image: getImage(activity),
        slug: activity.slug || activity.destination_slug,
      });
    });
  }

  // Sort by time if available
  return entries.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });
}
