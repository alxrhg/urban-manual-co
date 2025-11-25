'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useTrip } from '@/hooks/useTrip';
import { ArrowLeft, Calendar, Loader2, MapPin, Plus, Settings } from 'lucide-react';

type UseTripResult = ReturnType<typeof useTrip>;
type TripWithDays = NonNullable<UseTripResult['trip']>;
type TripDay = TripWithDays['days'][number];

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string | null;
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const { trip, loading, error } = useTrip(tripId);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    if (trip?.days?.length && selectedDay >= trip.days.length) {
      setSelectedDay(trip.days.length - 1);
    }
  }, [trip?.days?.length, selectedDay]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-neutral-500">{error || 'Trip not found'}</p>
        <button
          onClick={() => router.push('/trips')}
          className="text-sm underline text-neutral-600 dark:text-neutral-400"
        >
          Back to trips
        </button>
      </div>
    );
  }

  const days = trip.days || [];
  const currentDay = days[selectedDay];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <button
              onClick={() => router.push('/trips')}
              className="mt-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white truncate">
                {trip.title}
              </h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                {[trip.destination, formatDateRange(trip.start_date, trip.end_date)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>

            <button
              onClick={() => openDrawer('trip-overview', { trip })}
              className="mt-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {days.length > 0 ? (
          <div className="space-y-6">
            {/* Day Selector */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
              {days.map((day, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDay(i)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    selectedDay === i
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  Day {i + 1}
                </button>
              ))}
            </div>

            {/* Day Content */}
            {currentDay && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide">
                      {currentDay.date && formatDate(currentDay.date)}
                    </p>
                    {currentDay.city && (
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5">
                        {currentDay.city}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => openDrawer('trip-day', { day: currentDay, dayIndex: selectedDay, trip })}
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                  >
                    Edit
                  </button>
                </div>

                {/* Items List */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {buildItems(currentDay).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => item.slug && openDrawer('destination', { slug: item.slug })}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                    >
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        {item.label && (
                          <p className="text-xs text-neutral-500 capitalize">{item.label}</p>
                        )}
                      </div>
                    </button>
                  ))}

                  {buildItems(currentDay).length === 0 && (
                    <div className="p-8 text-center">
                      <p className="text-sm text-neutral-500">No activities yet</p>
                    </div>
                  )}

                  {/* Add Place Button */}
                  <button
                    onClick={() =>
                      openDrawer('place-selector', {
                        day: currentDay,
                        trip,
                        index: selectedDay,
                        replaceIndex: null,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 p-4 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add place
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="py-20 text-center">
            <Calendar className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <p className="text-neutral-900 dark:text-white font-medium mb-1">No days yet</p>
            <p className="text-sm text-neutral-500 mb-6">Add dates to start planning</p>
            <button
              onClick={() => openDrawer('trip-overview', { trip })}
              className="px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium"
            >
              Add dates
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) {
    const s = formatDate(start);
    const e = formatDate(end);
    return `${s} – ${e}`;
  }
  return start ? formatDate(start) : end ? formatDate(end) : null;
}

interface Item {
  title: string;
  label?: string;
  image?: string | null;
  slug?: string;
}

function buildItems(day: TripDay): Item[] {
  const items: Item[] = [];

  // Meals
  (['breakfast', 'lunch', 'dinner'] as const).forEach((meal) => {
    const m = day.meals?.[meal];
    if (m) {
      items.push({
        title: m.title || m.name || meal,
        label: meal,
        image: getImage(m),
        slug: m.slug || m.destination_slug,
      });
    }
  });

  // Activities
  day.activities?.forEach((a: any) => {
    items.push({
      title: a.title || a.name || 'Activity',
      label: a.category,
      image: getImage(a),
      slug: a.slug || a.destination_slug,
    });
  });

  return items;
}

function getImage(item: any): string | null {
  if (item?.image) return item.image;
  if (item?.image_thumbnail) return item.image_thumbnail;
  try {
    const notes = typeof item?.notes === 'string' ? JSON.parse(item.notes) : item?.notes;
    return notes?.image || null;
  } catch {
    return null;
  }
}
