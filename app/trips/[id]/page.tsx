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
  Bookmark,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  GripVertical,
  MapPin,
  Plane,
  Plus,
  Settings,
  Trash2,
  Users,
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
import DayTimelineAnalysis from '@/components/trips/DayTimelineAnalysis';
import CrowdIndicator from '@/components/trips/CrowdIndicator';
import TransitOptions from '@/components/trips/TransitOptions';
import AvailabilityAlert from '@/components/trips/AvailabilityAlert';
import TripBucketList, { type BucketItem } from '@/components/trips/TripBucketList';
import { formatTripDate, parseDateString } from '@/lib/utils';
import { getEstimatedDuration, formatDuration } from '@/lib/trip-intelligence';
import type { Trip, ItineraryItem, ItineraryItemNotes, FlightData } from '@/types/trip';
import { parseItineraryNotes, stringifyItineraryNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: (ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes })[];
}

// Sortable item wrapper for drag-and-drop
function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showTransitFor, setShowTransitFor] = useState<string | null>(null);
  const [showBucketList, setShowBucketList] = useState(false);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // Handle drag-and-drop reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentDayData = days.find((d) => d.dayNumber === selectedDay);
    if (!currentDayData) return;

    const oldIndex = currentDayData.items.findIndex((i) => i.id === active.id);
    const newIndex = currentDayData.items.findIndex((i) => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newItems = arrayMove(currentDayData.items, oldIndex, newIndex);
    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === selectedDay ? { ...d, items: newItems } : d
      )
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      await Promise.all(
        newItems.map((item, index) =>
          supabase
            .from('itinerary_items')
            .update({ order_index: index })
            .eq('id', item.id)
        )
      );
    } catch (err) {
      console.error('Error reordering:', err);
      fetchTrip();
    }
  };

  // Open destination drawer for a place
  const openDestinationDrawer = (item: ItineraryItem & { destination?: Destination }) => {
    if (item.destination) {
      const dest = item.destination;
      openDrawer('destination', {
        place: {
          name: dest.name,
          category: dest.category,
          neighborhood: dest.neighborhood ?? undefined,
          michelinRating: dest.michelin_stars ?? undefined,
          hasMichelin: !!dest.michelin_stars,
          googleRating: dest.rating ?? undefined,
          googleReviews: dest.user_ratings_total ?? undefined,
          priceLevel: dest.price_level ?? undefined,
          description: dest.description ?? undefined,
          image: dest.image ?? undefined,
          image_thumbnail: dest.image_thumbnail ?? undefined,
          latitude: dest.latitude ?? undefined,
          longitude: dest.longitude ?? undefined,
        },
        hideAddToTrip: true,
      });
    }
  };

  // Bucket list handlers
  const handleAddBucketItem = (item: Omit<BucketItem, 'id' | 'addedAt'>) => {
    const newItem: BucketItem = {
      ...item,
      id: crypto.randomUUID(),
      addedAt: new Date().toISOString(),
    };
    setBucketItems((prev) => [...prev, newItem]);
  };

  const handleRemoveBucketItem = (id: string) => {
    setBucketItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleReorderBucketItems = (items: BucketItem[]) => {
    setBucketItems(items);
  };

  const handleAssignBucketItemToDay = (item: BucketItem, dayNumber: number) => {
    // For now, just remove from bucket list
    // In a full implementation, you'd add it to the day's itinerary
    handleRemoveBucketItem(item.id);
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

  // Prepare items for timeline analysis
  const timelineItems = currentDay?.items
    .filter((item) => item.parsedNotes?.type !== 'flight')
    .map((item) => ({
      id: item.id,
      title: item.title,
      time: item.time,
      category: item.destination?.category || item.parsedNotes?.category,
      latitude: item.parsedNotes?.latitude ?? item.destination?.latitude,
      longitude: item.parsedNotes?.longitude ?? item.destination?.longitude,
    })) || [];

  // Prepare map places
  const mapPlaces = currentDay?.items
    .filter((item) => item.parsedNotes?.type !== 'flight')
    .map((item, index) => ({
      id: item.id,
      name: item.title,
      latitude: item.parsedNotes?.latitude ?? item.destination?.latitude ?? undefined,
      longitude: item.parsedNotes?.longitude ?? item.destination?.longitude ?? undefined,
      category: item.destination?.category || item.parsedNotes?.category,
      order: index + 1,
    })) || [];

  return (
    <main className="w-full min-h-screen">
      {/* Header */}
      <div className="px-6 md:px-10 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Link
              href="/trips"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back to Trips
            </Link>
            <input
              type="text"
              value={trip.title}
              onChange={(e) => updateTrip({ title: e.target.value })}
              className="text-xl font-light bg-transparent border-none outline-none w-full focus:outline-none"
              placeholder="Trip name"
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBucketList(!showBucketList)}
              className={`p-2 rounded-lg transition-colors ${
                showBucketList
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Bucket List"
            >
              <Bookmark className="w-5 h-5" />
            </button>
            <button
              onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
              className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Split-Screen Canvas */}
      <div className="flex h-[calc(100vh-120px)]">
        {/* Left Panel: Itinerary */}
        <div className={`flex flex-col overflow-hidden transition-all ${showBucketList ? 'w-1/2 lg:w-2/5' : 'w-1/2 lg:w-3/5'}`}>
          {/* Weather & Alerts Bar */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <TripWeatherForecast
              destination={trip.destination}
              startDate={trip.start_date}
              endDate={trip.end_date}
              compact
            />
          </div>

          {/* Day Tabs */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay === 1}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1 flex-1 overflow-x-auto">
              {days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                    selectedDay === day.dayNumber
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Day {day.dayNumber}
                  {day.date && (
                    <span className="ml-1 opacity-60 hidden sm:inline">
                      {formatTripDate(day.date)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedDay(Math.min(days.length, selectedDay + 1))}
              disabled={selectedDay === days.length}
              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Timeline Analysis */}
          {timelineItems.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <DayTimelineAnalysis items={timelineItems} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800 flex gap-2">
            <UMActionPill onClick={() => openFlightDrawer(selectedDay)}>
              <Plane className="w-4 h-4 mr-1" />
              Flight
            </UMActionPill>
            <UMActionPill variant="primary" onClick={() => openPlaceSelector(selectedDay)}>
              <Plus className="w-4 h-4 mr-1" />
              Place
            </UMActionPill>
          </div>

          {/* Itinerary Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {currentDay && currentDay.items.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={currentDay.items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {currentDay.items.map((item, index) => {
                      const isFlight = item.parsedNotes?.type === 'flight';
                      const prevItem = index > 0 ? currentDay.items[index - 1] : null;
                      const isExpanded = expandedItem === item.id;
                      const showingTransit = showTransitFor === item.id;
                      const category = item.destination?.category || item.parsedNotes?.category;
                      const estimatedDuration = getEstimatedDuration(category);

                      // Get coordinates for transit
                      const prevLat = prevItem?.parsedNotes?.latitude ?? prevItem?.destination?.latitude;
                      const prevLon = prevItem?.parsedNotes?.longitude ?? prevItem?.destination?.longitude;
                      const currLat = item.parsedNotes?.latitude ?? item.destination?.latitude;
                      const currLon = item.parsedNotes?.longitude ?? item.destination?.longitude;

                      return (
                        <SortableItem key={item.id} id={item.id}>
                          {/* Transit Options (between items) */}
                          {prevItem && !isFlight && prevItem.parsedNotes?.type !== 'flight' && (
                            <div className="mb-2">
                              {showingTransit ? (
                                <TransitOptions
                                  fromLat={prevLat}
                                  fromLon={prevLon}
                                  toLat={currLat}
                                  toLon={currLon}
                                  fromName={prevItem.title}
                                  toName={item.title}
                                />
                              ) : (
                                <button
                                  onClick={() => setShowTransitFor(showingTransit ? null : item.id)}
                                  className="w-full"
                                >
                                  <TransitOptions
                                    fromLat={prevLat}
                                    fromLon={prevLon}
                                    toLat={currLat}
                                    toLon={currLon}
                                    compact
                                  />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Item Card */}
                          <div
                            className={`rounded-xl border transition-colors ${
                              isFlight
                                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-start gap-3 p-3">
                              {/* Drag Handle */}
                              <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 mt-1">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Time Input */}
                              <div className="w-14 flex-shrink-0">
                                <input
                                  type="time"
                                  value={item.time || ''}
                                  onChange={(e) => updateItemTime(item.id, e.target.value)}
                                  className="w-full text-xs text-center bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
                                  placeholder="--:--"
                                />
                              </div>

                              {/* Thumbnail */}
                              <button
                                onClick={() => !isFlight && openDestinationDrawer(item)}
                                className={`relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden ${
                                  isFlight ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'
                                } ${!isFlight && item.destination ? 'cursor-pointer hover:ring-2 hover:ring-black dark:hover:ring-white' : ''}`}
                                disabled={isFlight || !item.destination}
                              >
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
                                    sizes="56px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </button>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={() => !isFlight && openDestinationDrawer(item)}
                                  className={`text-left w-full ${!isFlight && item.destination ? 'cursor-pointer' : ''}`}
                                  disabled={isFlight || !item.destination}
                                >
                                  <div className="text-sm font-medium truncate">
                                    {item.title}
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                                      {item.description}
                                    </div>
                                  )}
                                </button>

                                {/* Meta info */}
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  {!isFlight && (
                                    <>
                                      {/* Duration estimate */}
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        <span>~{formatDuration(estimatedDuration)}</span>
                                      </div>

                                      {/* Wait time indicator */}
                                      {item.time && (
                                        <AvailabilityAlert
                                          placeName={item.title}
                                          category={category}
                                          scheduledTime={item.time}
                                          scheduledDate={currentDay.date}
                                          compact
                                        />
                                      )}
                                    </>
                                  )}

                                  {isFlight && item.parsedNotes?.departureTime && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                      <Clock className="w-3 h-3" />
                                      {item.parsedNotes.departureTime}
                                      {item.parsedNotes.arrivalTime && ` → ${item.parsedNotes.arrivalTime}`}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Availability & Wait Time Alert */}
                            {!isFlight && item.time && (
                              <div className="px-3 pb-3">
                                <AvailabilityAlert
                                  placeName={item.title}
                                  category={category}
                                  scheduledTime={item.time}
                                  scheduledDate={currentDay.date}
                                  onTimeChange={(time) => updateItemTime(item.id, time)}
                                />
                              </div>
                            )}

                            {/* Expanded content */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 dark:border-gray-800 p-3">
                                {isFlight && item.parsedNotes && (
                                  <FlightStatusCard
                                    flight={item.parsedNotes}
                                    departureDate={item.parsedNotes.departureDate}
                                  />
                                )}
                                {!isFlight && item.parsedNotes && (
                                  <NearbyDiscoveries
                                    currentPlace={{
                                      name: item.title,
                                      latitude: currLat ?? undefined,
                                      longitude: currLon ?? undefined,
                                      city: item.destination?.city || trip?.destination || undefined,
                                    }}
                                    excludeSlugs={currentDay.items.map((i) => i.destination?.slug).filter(Boolean) as string[]}
                                    onAddPlace={(destination) => addItem(selectedDay, destination)}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </SortableItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-4">No items for Day {selectedDay}</p>
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
          </div>
        </div>

        {/* Right Panel: Map (always visible) */}
        <div className={`border-l border-gray-200 dark:border-gray-800 transition-all ${showBucketList ? 'w-1/4 lg:w-2/5' : 'w-1/2 lg:w-2/5'}`}>
          <TripMapView
            places={mapPlaces}
            className="h-full"
          />
        </div>

        {/* Right Sidebar: Bucket List */}
        {showBucketList && (
          <div className="w-1/4 lg:w-1/5 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <TripBucketList
              items={bucketItems}
              onAdd={handleAddBucketItem}
              onRemove={handleRemoveBucketItem}
              onReorder={handleReorderBucketItems}
              onAssignToDay={handleAssignBucketItemToDay}
              availableDays={days.map((d) => d.dayNumber)}
            />
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
