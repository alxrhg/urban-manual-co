'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Plus,
  Settings,
  Trash2,
  GripVertical,
} from 'lucide-react';
import type { Trip, ItineraryItem } from '@/types/trip';
import type { Destination } from '@/types/destination';

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: (ItineraryItem & { destination?: Destination })[];
}

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params?.id as string;
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch trip and items
  const fetchTrip = useCallback(async () => {
    if (!tripId || !user) return;

    try {
      setLoading(true);
      const supabase = createClient();
      if (!supabase) return;

      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', user.id)
        .single();

      if (tripError) throw tripError;
      if (!tripData) {
        router.push('/trips');
        return;
      }

      setTrip(tripData);

      // Fetch itinerary items
      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch destinations for items
      const slugs = (items || [])
        .map((i) => i.destination_slug)
        .filter((s): s is string => Boolean(s));

      let destinationsMap = new Map<string, Destination>();
      if (slugs.length > 0) {
        const { data: destinations } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, image_thumbnail, latitude, longitude')
          .in('slug', slugs);

        destinations?.forEach((d) => destinationsMap.set(d.slug, d));
      }

      // Build days
      const numDays = calculateDays(tripData.start_date, tripData.end_date);
      const daysArray: TripDay[] = [];

      for (let i = 1; i <= Math.max(numDays, 1); i++) {
        const dayItems = (items || [])
          .filter((item) => item.day === i)
          .map((item) => ({
            ...item,
            destination: item.destination_slug
              ? destinationsMap.get(item.destination_slug)
              : undefined,
          }));

        daysArray.push({
          dayNumber: i,
          date: tripData.start_date ? addDays(tripData.start_date, i - 1) : null,
          items: dayItems,
        });
      }

      setDays(daysArray);
    } catch (err) {
      console.error('Error fetching trip:', err);
    } finally {
      setLoading(false);
    }
  }, [tripId, user, router]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  // Update trip
  const updateTrip = async (updates: Partial<Trip>) => {
    if (!trip || !user) return;

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTrip({ ...trip, ...updates });

      // Refetch to update days if dates changed
      if (updates.start_date || updates.end_date) {
        fetchTrip();
      }
    } catch (err) {
      console.error('Error updating trip:', err);
    } finally {
      setSaving(false);
    }
  };

  // Add item to day
  const addItem = async (dayNumber: number, destination: Destination) => {
    if (!trip || !user) return;

    try {
      const supabase = createClient();
      if (!supabase) return;

      const currentDay = days.find((d) => d.dayNumber === dayNumber);
      const orderIndex = currentDay?.items.length || 0;

      const { error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: destination.slug,
        day: dayNumber,
        order_index: orderIndex,
        title: destination.name,
        description: destination.city,
      });

      if (error) throw error;
      fetchTrip();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  // Remove item
  const removeItem = async (itemId: string) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchTrip();
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  // Open place selector
  const openPlaceSelector = (dayNumber: number) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
      onSelect: (destination: Destination) => addItem(dayNumber, destination),
    });
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Trip not found</p>
      </div>
    );
  }

  const currentDay = days.find((d) => d.dayNumber === selectedDay) || days[0];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/trips')}
              className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={trip.title}
                onChange={(e) => updateTrip({ title: e.target.value })}
                className="w-full text-lg font-semibold text-neutral-900 dark:text-white bg-transparent border-none outline-none"
                placeholder="Trip name"
              />
              <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
                <button
                  onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip })}
                  className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {trip.destination || 'Set destination'}
                </button>
                <button
                  onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip })}
                  className="flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {trip.start_date ? formatDate(trip.start_date) : 'Set dates'}
                  {trip.end_date && ` – ${formatDate(trip.end_date)}`}
                </button>
              </div>
            </div>

            <button
              onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Day Navigation */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-[73px] z-30">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay === 1}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>

            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {days.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDay(day.dayNumber)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                      selectedDay === day.dayNumber
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    Day {day.dayNumber}
                    {day.date && (
                      <span className="ml-1.5 opacity-60">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(Math.min(days.length, selectedDay + 1))}
              disabled={selectedDay === days.length}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Day Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {currentDay && (
          <div className="space-y-4">
            {/* Items */}
            {currentDay.items.length > 0 ? (
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                {currentDay.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-4 group"
                  >
                    <div className="text-neutral-300 dark:text-neutral-600 cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex-shrink-0">
                      {item.destination?.image || item.destination?.image_thumbnail ? (
                        <Image
                          src={item.destination.image_thumbnail || item.destination.image || ''}
                          alt={item.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-sm text-neutral-500 truncate">{item.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-neutral-400" />
                </div>
                <p className="text-sm text-neutral-500 mb-4">No places added yet</p>
              </div>
            )}

            {/* Add Place Button */}
            <button
              onClick={() => openPlaceSelector(selectedDay)}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 transition"
            >
              <Plus className="w-5 h-5" />
              Add place
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// Helpers
function calculateDays(start: string | null, end: string | null): number {
  if (!start) return 1;
  if (!end) return 1;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
