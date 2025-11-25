'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import {
  ArrowLeft,
  Calendar,
  Clock,
  GripVertical,
  List,
  Loader2,
  Map,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Settings,
  StickyNote,
  Trash2,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PageLoader } from '@/components/LoadingStates';
import UMActionPill from '@/components/ui/UMActionPill';
import TripMapView from '@/components/trips/TripMapView';
import TripWeatherForecast from '@/components/trips/TripWeatherForecast';
import TripSafetyAlerts from '@/components/trips/TripSafetyAlerts';
import NearbyDiscoveries from '@/components/trips/NearbyDiscoveries';
import FlightStatusCard from '@/components/trips/FlightStatusCard';
import OpeningHoursIndicator from '@/components/trips/OpeningHoursIndicator';
import { formatTripDate, parseDateString } from '@/lib/utils';
import type { Trip, ItineraryItem, ItineraryItemNotes, FlightData } from '@/types/trip';
import { parseItineraryNotes, stringifyItineraryNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: (ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes })[];
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
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Fetch trip and items
  const fetchTrip = useCallback(async () => {
    if (!tripId || !user) return;

    try {
      setLoading(true);
      const supabase = createClient();
      if (!supabase) return;

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

      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      const slugs = (items || [])
        .map((i) => i.destination_slug)
        .filter((s): s is string => Boolean(s));

      const destinationsMap: Record<string, Destination> = {};
      if (slugs.length > 0) {
        const { data: destinations } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image, image_thumbnail, latitude, longitude')
          .in('slug', slugs);

        destinations?.forEach((d) => {
          destinationsMap[d.slug] = d;
        });
      }

      const numDays = calculateDays(tripData.start_date, tripData.end_date);
      const daysArray: TripDay[] = [];

      for (let i = 1; i <= Math.max(numDays, 1); i++) {
        const dayItems = (items || [])
          .filter((item) => item.day === i)
          .map((item) => ({
            ...item,
            destination: item.destination_slug
              ? destinationsMap[item.destination_slug]
              : undefined,
            parsedNotes: parseItineraryNotes(item.notes),
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

  const updateTrip = async (updates: Partial<Trip>) => {
    if (!trip || !user) return;

    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTrip({ ...trip, ...updates });

      if (updates.start_date || updates.end_date) {
        fetchTrip();
      }
    } catch (err) {
      console.error('Error updating trip:', err);
    }
  };

  const addItem = async (dayNumber: number, destination: Destination) => {
    if (!trip || !user) return;

    try {
      const supabase = createClient();
      if (!supabase) return;

      const currentDay = days.find((d) => d.dayNumber === dayNumber);
      const orderIndex = currentDay?.items.length || 0;

      // Store location data and category in notes
      const notesData: ItineraryItemNotes = {
        type: 'place',
        latitude: destination.latitude ?? undefined,
        longitude: destination.longitude ?? undefined,
        category: destination.category ?? undefined,
        image: destination.image_thumbnail || destination.image || undefined,
      };

      const { error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: destination.slug,
        day: dayNumber,
        order_index: orderIndex,
        title: destination.name,
        description: destination.city,
        notes: stringifyItineraryNotes(notesData),
      });

      if (error) throw error;
      fetchTrip();
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const addFlight = async (dayNumber: number, flightData: FlightData) => {
    if (!trip || !user) return;

    try {
      const supabase = createClient();
      if (!supabase) return;

      const currentDay = days.find((d) => d.dayNumber === dayNumber);
      const orderIndex = currentDay?.items.length || 0;

      const notesData: ItineraryItemNotes = {
        type: 'flight',
        airline: flightData.airline,
        flightNumber: flightData.flightNumber,
        from: flightData.from,
        to: flightData.to,
        departureDate: flightData.departureDate,
        departureTime: flightData.departureTime,
        arrivalDate: flightData.arrivalDate,
        arrivalTime: flightData.arrivalTime,
        confirmationNumber: flightData.confirmationNumber,
        raw: flightData.notes,
      };

      const { error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: null,
        day: dayNumber,
        order_index: orderIndex,
        time: flightData.departureTime,
        title: `${flightData.airline} ${flightData.flightNumber || 'Flight'}`,
        description: `${flightData.from} → ${flightData.to}`,
        notes: stringifyItineraryNotes(notesData),
      });

      if (error) throw error;
      fetchTrip();
    } catch (err) {
      console.error('Error adding flight:', err);
    }
  };

  const updateItemTime = async (itemId: string, time: string) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update({ time })
        .eq('id', itemId);

      if (error) throw error;
      fetchTrip();
    } catch (err) {
      console.error('Error updating time:', err);
    }
  };

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

  const openPlaceSelector = (dayNumber: number) => {
    openDrawer('place-selector', {
      tripId: trip?.id,
      dayNumber,
      city: trip?.destination,
      onSelect: (destination: Destination) => addItem(dayNumber, destination),
    });
  };

  const openFlightDrawer = (dayNumber: number) => {
    openDrawer('add-flight', {
      tripId: trip?.id,
      dayNumber,
      onAdd: (flightData: FlightData) => addFlight(dayNumber, flightData),
    });
  };

  // Calculate travel time estimate between two coordinates (simple approximation)
  const estimateTravelTime = (
    lat1: number | undefined,
    lon1: number | undefined,
    lat2: number | undefined,
    lon2: number | undefined
  ): { time: string; distance: string } | null => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    // Haversine formula for distance
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimate time: ~30km/h average city speed
    const timeMinutes = Math.round((distance / 30) * 60);

    if (distance < 0.5) return null; // Too close, skip

    return {
      time: timeMinutes < 60 ? `${timeMinutes} min` : `${Math.round(timeMinutes / 60)}h ${timeMinutes % 60}m`,
      distance: distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`,
    };
  };

  if (loading) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-gray-500">Trip not found</p>
        </div>
      </main>
    );
  }

  const currentDay = days.find((d) => d.dayNumber === selectedDay) || days[0];
  const totalPlaces = days.reduce((acc, d) => acc + d.items.length, 0);

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full">
        {/* Back Link */}
        <Link
          href="/trips"
          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Trips
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={trip.title}
                onChange={(e) => updateTrip({ title: e.target.value })}
                className="text-2xl font-light bg-transparent border-none outline-none w-full focus:outline-none"
                placeholder="Trip name"
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                <button
                  onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  {trip.destination || 'Add destination'}
                </button>
                <button
                  onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <Calendar className="w-3 h-3" />
                  {trip.start_date ? formatTripDate(trip.start_date) : 'Add dates'}
                  {trip.end_date && ` – ${formatTripDate(trip.end_date)}`}
                </button>
              </div>
            </div>
            <button
              onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
              className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="text-2xl font-light mb-1">{days.length}</div>
            <div className="text-xs text-gray-500">Days</div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="text-2xl font-light mb-1">{totalPlaces}</div>
            <div className="text-xs text-gray-500">Places</div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
            <div className="text-2xl font-light mb-1 capitalize">{trip.status}</div>
            <div className="text-xs text-gray-500">Status</div>
          </div>
        </div>

        {/* Weather Forecast */}
        <div className="mb-12">
          <TripWeatherForecast
            destination={trip.destination}
            startDate={trip.start_date}
            endDate={trip.end_date}
          />
        </div>

        {/* Day Tabs - Minimal style like account page */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {days.map((day) => (
              <button
                key={day.dayNumber}
                onClick={() => setSelectedDay(day.dayNumber)}
                className={`transition-all ${
                  selectedDay === day.dayNumber
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                Day {day.dayNumber}
                {day.date && (
                  <span className="ml-1 opacity-60">
                    ({formatTripDate(day.date)})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Day Content */}
        {currentDay && (
          <div className="space-y-8 fade-in">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {currentDay.items.length} {currentDay.items.length === 1 ? 'item' : 'items'}
                </h2>
                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === 'map'
                        ? 'bg-white dark:bg-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    title="Map view"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <UMActionPill onClick={() => openFlightDrawer(selectedDay)}>
                  <Plane className="w-4 h-4 mr-1" />
                  Add Flight
                </UMActionPill>
                <UMActionPill onClick={() => openPlaceSelector(selectedDay)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Place
                </UMActionPill>
              </div>
            </div>

            {/* Map View */}
            {viewMode === 'map' && (
              <TripMapView
                places={currentDay.items
                  .filter((item) => item.parsedNotes?.type !== 'flight')
                  .map((item, index) => ({
                    id: item.id,
                    name: item.title,
                    latitude: item.parsedNotes?.latitude ?? item.destination?.latitude ?? undefined,
                    longitude: item.parsedNotes?.longitude ?? item.destination?.longitude ?? undefined,
                    category: item.destination?.category || item.parsedNotes?.category,
                    order: index + 1,
                  }))}
                className="h-[400px]"
              />
            )}

            {/* Items List */}
            {viewMode === 'list' && (
              <>
                {currentDay.items.length > 0 ? (
                  <div className="space-y-1">
                    {currentDay.items.map((item, index) => {
                      const isFlight = item.parsedNotes?.type === 'flight';
                      const prevItem = index > 0 ? currentDay.items[index - 1] : null;

                      // Calculate travel time from previous item
                      let travelInfo = null;
                      if (prevItem && !isFlight && prevItem.parsedNotes?.type !== 'flight') {
                        const prevLat = prevItem.parsedNotes?.latitude ?? prevItem.destination?.latitude ?? undefined;
                        const prevLon = prevItem.parsedNotes?.longitude ?? prevItem.destination?.longitude ?? undefined;
                        const currLat = item.parsedNotes?.latitude ?? item.destination?.latitude ?? undefined;
                        const currLon = item.parsedNotes?.longitude ?? item.destination?.longitude ?? undefined;
                        travelInfo = estimateTravelTime(prevLat, prevLon, currLat, currLon);
                      }

                      return (
                        <div key={item.id}>
                          {/* Travel Time Indicator */}
                          {travelInfo && (
                            <div className="flex items-center gap-2 py-2 px-4 text-xs text-gray-400">
                              <Navigation className="w-3 h-3" />
                              <span>{travelInfo.time}</span>
                              <span className="opacity-60">({travelInfo.distance})</span>
                            </div>
                          )}

                          {/* Item Card */}
                          <div
                            className={`flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors group ${
                              isFlight ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            {/* Time Input */}
                            <div className="w-16 flex-shrink-0">
                              <input
                                type="time"
                                value={item.time || ''}
                                onChange={(e) => updateItemTime(item.id, e.target.value)}
                                className="w-full text-xs text-center bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg py-1 px-1 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                placeholder="--:--"
                              />
                            </div>

                            {/* Icon/Image */}
                            <div className={`relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden ${
                              isFlight ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {isFlight ? (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Plane className="w-5 h-5 text-blue-500" />
                                </div>
                              ) : item.destination?.image || item.destination?.image_thumbnail ? (
                                <Image
                                  src={item.destination.image_thumbnail || item.destination.image || ''}
                                  alt={item.title}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.title}</div>
                              {item.description && (
                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                  {item.description}
                                </div>
                              )}
                              {isFlight && item.parsedNotes?.departureTime && (
                                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {item.parsedNotes.departureTime}
                                  {item.parsedNotes.arrivalTime && ` → ${item.parsedNotes.arrivalTime}`}
                                </div>
                              )}
                              {!isFlight && (item.destination?.category || item.parsedNotes?.category) && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {item.destination?.category || item.parsedNotes?.category}
                                </div>
                              )}
                            </div>

                            {/* Remove */}
                            <button
                              onClick={() => removeItem(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-4">No items added to this day</p>
                    <div className="flex justify-center gap-2">
                      <UMActionPill onClick={() => openFlightDrawer(selectedDay)}>
                        <Plane className="w-4 h-4 mr-1" />
                        Add Flight
                      </UMActionPill>
                      <UMActionPill variant="primary" onClick={() => openPlaceSelector(selectedDay)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Place
                      </UMActionPill>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function calculateDays(start: string | null, end: string | null): number {
  if (!start) return 1;
  if (!end) return 1;
  const startDate = parseDateString(start);
  const endDate = parseDateString(end);
  if (!startDate || !endDate) return 1;
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

function addDays(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  if (!date) return dateStr;
  date.setDate(date.getDate() + days);
  // Return in YYYY-MM-DD format
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
