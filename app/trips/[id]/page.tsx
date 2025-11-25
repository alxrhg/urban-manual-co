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
import TransitOptions from '@/components/trips/TransitOptions';
import AvailabilityAlert from '@/components/trips/AvailabilityAlert';
import TripBucketList, { type BucketItem } from '@/components/trips/TripBucketList';
import { TripItemCard } from '@/components/trips/TripItemCard';
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
    zIndex: isDragging ? 50 : 'auto',
  };

  // Pass drag handle props to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, { 
        dragHandleProps: { ...attributes, ...listeners },
        isDragging
      });
    }
    return child;
  });

  return (
    <div ref={setNodeRef} style={style}>
      {childrenWithProps}
    </div>
  );
}

import React from 'react';

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
          .select('slug, name, city, neighborhood, category, description, image, image_thumbnail, latitude, longitude, rating, user_ratings_total, michelin_stars, price_level, formatted_address, website')
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
          city: dest.city ?? undefined,
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
          address: dest.formatted_address ?? undefined,
          website: dest.website ?? undefined,
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
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="px-6 md:px-10 py-8 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-start justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex-1 space-y-4">
            <Link
              href="/trips"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              Back to Trips
            </Link>
            
            <div className="space-y-2">
              <input
                type="text"
                value={trip.title}
                onChange={(e) => updateTrip({ title: e.target.value })}
                className="text-3xl md:text-4xl font-semibold bg-transparent border-none outline-none w-full focus:outline-none placeholder-gray-300 dark:placeholder-gray-700 text-gray-900 dark:text-white p-0"
                placeholder="Trip Name"
              />
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {trip.destination || 'Add destination'}
                </button>
                <button
                  onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {trip.start_date ? formatTripDate(trip.start_date) : 'Add dates'}
                  {trip.end_date && ` – ${formatTripDate(trip.end_date)}`}
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBucketList(!showBucketList)}
              className={`p-2.5 rounded-xl transition-all duration-200 ${
                showBucketList
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              title="Bucket List"
            >
              <Bookmark className="w-5 h-5" />
            </button>
            <button
              onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
              className="p-2.5 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl transition-all duration-200"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Split-Screen Canvas */}
      <div className="flex h-[calc(100vh-180px)] max-w-7xl mx-auto w-full">
        {/* Left Panel: Itinerary */}
        <div className={`flex flex-col h-full transition-all duration-300 ${showBucketList ? 'w-1/2 lg:w-2/5' : 'w-1/2 lg:w-3/5'}`}>
          {/* Weather & Alerts Bar */}
          <div className="px-6 md:px-10 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
            <TripWeatherForecast
              destination={trip.destination}
              startDate={trip.start_date}
              endDate={trip.end_date}
              compact
            />
          </div>

          {/* Day Tabs */}
          <div className="px-6 md:px-10 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay === 1}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2 flex-1 overflow-x-auto no-scrollbar px-2">
              {days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl min-w-[80px] transition-all duration-200 border ${
                    selectedDay === day.dayNumber
                      ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-md transform scale-105'
                      : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Day {day.dayNumber}</span>
                  {day.date && (
                    <span className={`text-[10px] mt-0.5 ${selectedDay === day.dayNumber ? 'opacity-80' : 'opacity-60'}`}>
                      {formatTripDate(day.date).split(',')[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedDay(Math.min(days.length, selectedDay + 1))}
              disabled={selectedDay === days.length}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Summary & Actions */}
          <div className="px-6 md:px-10 py-4 flex items-center justify-between gap-4 bg-white dark:bg-gray-950 sticky top-0 z-20">
            {/* Timeline summary */}
            <div className="flex-1 min-w-0">
              {timelineItems.length > 0 ? (
                <DayTimelineAnalysis items={timelineItems} />
              ) : (
                <span className="text-xs text-gray-400 italic">Start planning your day...</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <UMActionPill onClick={() => openFlightDrawer(selectedDay)} className="!bg-white dark:!bg-gray-900 border !border-gray-200 dark:!border-gray-800">
                <Plane className="w-3.5 h-3.5 mr-1.5" />
                Flight
              </UMActionPill>
              <UMActionPill variant="primary" onClick={() => openPlaceSelector(selectedDay)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Place
              </UMActionPill>
            </div>
          </div>

          {/* Itinerary Items */}
          <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 custom-scrollbar">
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
                  <div className="space-y-3 pb-20">
                    {currentDay.items.map((item, index) => {
                      const isFlight = item.parsedNotes?.type === 'flight';
                      const prevItem = index > 0 ? currentDay.items[index - 1] : null;
                      const isExpanded = expandedItem === item.id;
                      
                      // Get coordinates for transit
                      const prevLat = prevItem?.parsedNotes?.latitude ?? prevItem?.destination?.latitude;
                      const prevLon = prevItem?.parsedNotes?.longitude ?? prevItem?.destination?.longitude;
                      const currLat = item.parsedNotes?.latitude ?? item.destination?.latitude;
                      const currLon = item.parsedNotes?.longitude ?? item.destination?.longitude;

                      return (
                        <SortableItem key={item.id} id={item.id}>
                          {/* Transit between items */}
                          {prevItem && !isFlight && prevItem.parsedNotes?.type !== 'flight' && (
                            <div className="pl-8 py-2">
                              <TransitOptions
                                fromLat={prevLat}
                                fromLon={prevLon}
                                toLat={currLat}
                                toLon={currLon}
                                compact
                              />
                            </div>
                          )}

                          <TripItemCard 
                            item={item}
                            isExpanded={isExpanded}
                            onToggleExpand={() => setExpandedItem(isExpanded ? null : item.id)}
                            onUpdateTime={(time) => updateItemTime(item.id, time)}
                            onRemove={() => removeItem(item.id)}
                            onView={() => !isFlight && openDestinationDrawer(item)}
                            onAddPlace={(destination) => addItem(selectedDay, destination)}
                            currentDayDate={currentDay.date}
                          />
                        </SortableItem>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-20 px-6 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 mt-4">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Empty Day</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                  Add places or flights to build your itinerary for Day {selectedDay}.
                </p>
                <div className="flex justify-center gap-3">
                  <UMActionPill onClick={() => openFlightDrawer(selectedDay)} className="!py-2.5 !px-5">
                    <Plane className="w-4 h-4 mr-2" />
                    Add Flight
                  </UMActionPill>
                  <UMActionPill variant="primary" onClick={() => openPlaceSelector(selectedDay)} className="!py-2.5 !px-5">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Place
                  </UMActionPill>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Map (always visible) */}
        <div className={`border-l border-gray-200 dark:border-gray-800 transition-all duration-300 ${showBucketList ? 'w-1/4 lg:w-2/5' : 'w-1/2 lg:w-2/5'}`}>
          <TripMapView
            places={mapPlaces}
            className="h-full w-full"
          />
        </div>

        {/* Right Sidebar: Bucket List */}
        {showBucketList && (
          <div className="w-1/4 lg:w-1/5 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 backdrop-blur-xl">
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
