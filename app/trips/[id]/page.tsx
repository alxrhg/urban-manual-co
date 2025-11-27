'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  MapPin,
  Plane,
  Plus,
  Settings,
  Sparkles,
  Trash2,
  Users,
  Map,
  LayoutGrid,
  Loader2,
  ListTodo,
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
import TripNotesEditor from '@/components/trips/TripNotesEditor';
import { formatTripDate, parseDateString } from '@/lib/utils';
import { getEstimatedDuration, formatDuration } from '@/lib/trip-intelligence';
import type { Trip, ItineraryItem, ItineraryItemNotes, FlightData, TripNotes } from '@/types/trip';
import { parseItineraryNotes, stringifyItineraryNotes, parseTripNotes, stringifyTripNotes } from '@/types/trip';
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
  const [mobileView, setMobileView] = useState<'itinerary' | 'map'>('itinerary');
  const [isAIPlanning, setIsAIPlanning] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [tripNotes, setTripNotes] = useState<TripNotes>({ items: [] });

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
      setTripNotes(parseTripNotes(tripData.notes));

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

  const updateTripNotes = async (newNotes: TripNotes) => {
    if (!trip || !user) return;

    // Update local state immediately for responsive UI
    setTripNotes(newNotes);

    try {
      const supabase = createClient();
      if (!supabase) return;

      const notesJson = stringifyTripNotes(newNotes);
      const { error } = await supabase
        .from('trips')
        .update({ notes: notesJson })
        .eq('id', trip.id)
        .eq('user_id', user.id);

      if (error) throw error;
      setTrip({ ...trip, notes: notesJson });
    } catch (err) {
      console.error('Error updating notes:', err);
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

  // AI Trip Planning - fill empty days with AI-generated itinerary
  const handleAITripPlanning = async () => {
    if (!trip || !user) return;

    // Check if trip has required fields
    if (!trip.destination) {
      alert('Please add a destination to your trip first');
      return;
    }
    if (!trip.start_date || !trip.end_date) {
      alert('Please add dates to your trip first');
      return;
    }

    // Check if there are already items in the trip
    const allItems = days.flatMap(day => day.items);
    const totalItems = allItems.length;

    try {
      setIsAIPlanning(true);
      const supabase = createClient();
      if (!supabase) return;

      if (totalItems > 0) {
        // Use smart-fill API for contextual recommendations
        const existingItemsForAPI = allItems.map(item => ({
          day: days.find(d => d.items.includes(item))?.dayNumber || 1,
          time: item.time,
          title: item.title,
          destination_slug: item.destination_slug,
          category: item.parsedNotes?.category || item.destination?.category,
          parsedNotes: item.parsedNotes,
        }));

        const response = await fetch('/api/intelligence/smart-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: trip.destination,
            existingItems: existingItemsForAPI,
            tripDays: days.length,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get AI suggestions');
        }

        const result = await response.json();

        if (!result.suggestions || result.suggestions.length === 0) {
          alert('Your trip looks complete! No additional suggestions needed.');
          return;
        }

        // Insert smart suggestions into the database
        for (const suggestion of result.suggestions) {
          const dest = suggestion.destination;
          if (!dest) continue;

          // Find the current max order_index for this day
          const dayItems = days.find(d => d.dayNumber === suggestion.day)?.items || [];
          const maxOrder = dayItems.length > 0
            ? Math.max(...dayItems.map(i => i.order_index || 0))
            : -1;

          const notesData: ItineraryItemNotes = {
            type: 'place',
            latitude: dest.latitude ?? undefined,
            longitude: dest.longitude ?? undefined,
            category: dest.category ?? undefined,
            image: dest.image_thumbnail || dest.image || undefined,
          };

          await supabase.from('itinerary_items').insert({
            trip_id: trip.id,
            destination_slug: dest.slug,
            day: suggestion.day,
            order_index: maxOrder + 1 + (suggestion.order || 0),
            time: suggestion.startTime,
            title: dest.name,
            description: `${dest.category ? dest.category + ' • ' : ''}${suggestion.reason || 'AI suggested'}`,
            notes: stringifyItineraryNotes(notesData),
          });
        }
      } else {
        // Use multi-day planning API for empty trips
        const response = await fetch('/api/intelligence/multi-day-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: trip.destination,
            startDate: trip.start_date,
            endDate: trip.end_date,
            userId: user.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate trip plan');
        }

        const plan = await response.json();

        if (!plan.days || plan.days.length === 0) {
          throw new Error('No itinerary generated');
        }

        // Fetch destination details for the generated items
        const destinationIds = plan.days.flatMap((day: any) =>
          day.items.map((item: any) => item.destinationId)
        ).filter(Boolean);

        let destinationsMap: Record<number, any> = {};
        if (destinationIds.length > 0) {
          const { data: destinations } = await supabase
            .from('destinations')
            .select('id, slug, name, city, category, image, image_thumbnail, latitude, longitude')
            .in('id', destinationIds);

          if (destinations) {
            destinations.forEach((d) => {
              destinationsMap[d.id] = d;
            });
          }
        }

        // Insert items for each day
        for (const day of plan.days) {
          for (const item of day.items) {
            const destination = destinationsMap[item.destinationId];
            if (!destination) continue;

            const notesData: ItineraryItemNotes = {
              type: 'place',
              latitude: destination.latitude ?? undefined,
              longitude: destination.longitude ?? undefined,
              category: destination.category ?? undefined,
              image: destination.image_thumbnail || destination.image || undefined,
              duration: item.durationMinutes,
            };

            await supabase.from('itinerary_items').insert({
              trip_id: trip.id,
              destination_slug: destination.slug,
              day: day.dayNumber,
              order_index: item.order,
              time: item.startTime,
              title: destination.name,
              description: destination.city,
              notes: stringifyItineraryNotes(notesData),
            });
          }
        }
      }

      // Refresh trip data
      await fetchTrip();
    } catch (err: any) {
      console.error('Error with AI trip planning:', err);
      alert(err.message || 'Failed to generate AI trip plan. Please try again.');
    } finally {
      setIsAIPlanning(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full px-4 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="w-full px-4 md:px-10 py-20">
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

  const totalDays = calculateDays(trip.start_date, trip.end_date);
  const totalItems = days.reduce((acc, day) => acc + day.items.length, 0);
  const flightsCount = days.reduce(
    (acc, day) => acc + day.items.filter((item) => item.parsedNotes?.type === 'flight').length,
    0
  );
  const startDate = trip.start_date ? parseDateString(trip.start_date) : null;
  const countdownDays = startDate
    ? Math.max(0, Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const countdownLabel = countdownDays === null
    ? 'Flexible dates'
    : countdownDays === 0
      ? 'Starts today'
      : `Starts in ${countdownDays} day${countdownDays === 1 ? '' : 's'}`;
  const coverImage =
    trip.cover_image ||
    currentDay?.items.find((item) => item.destination?.image)?.destination?.image ||
    null;

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Header */}
      <div className="px-4 md:px-10 pt-6 pb-4">
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
          {coverImage && (
            <Image
              src={coverImage}
              alt={trip.title || 'Trip cover'}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/50" />

          <div className="relative p-5 sm:p-8 lg:p-10 space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex-1 space-y-3">
                <Link
                  href="/trips"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white/80 hover:text-white transition-colors group bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit border border-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Back to Trips
                </Link>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={trip.title}
                    onChange={(e) => updateTrip({ title: e.target.value })}
                    className="text-3xl md:text-5xl font-semibold bg-transparent border-none outline-none w-full focus:outline-none placeholder-white/40 text-white p-0 drop-shadow-sm"
                    placeholder="Name this adventure"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-colors text-xs font-semibold text-white"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {trip.destination || 'Add destination'}
                    </button>
                    <button
                      onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 transition-colors text-xs font-semibold text-white"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {trip.start_date ? formatTripDate(trip.start_date) : 'Add dates'}
                      {trip.end_date && ` – ${formatTripDate(trip.end_date)}`}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[13px] text-white/90">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                      <Clock className="w-4 h-4" />
                      {trip.start_date && trip.end_date ? `${totalDays} days on the road` : 'Set trip length'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                      <Plane className="w-4 h-4" />
                      {countdownLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10">
                      <Users className="w-4 h-4" />
                      Private itinerary
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className={`relative p-2.5 rounded-xl transition-all duration-200 border border-white/20 bg-white/10 hover:bg-white/20 ${showNotes ? 'ring-2 ring-white/40' : ''}`}
                    title="Notes & Lists"
                  >
                    <ListTodo className="w-5 h-5" />
                    {tripNotes.items.length > 0 && !showNotes && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                        {tripNotes.items.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowBucketList(!showBucketList)}
                    className={`p-2.5 rounded-xl transition-all duration-200 hidden md:flex border border-white/20 bg-white/10 hover:bg-white/20 ${showBucketList ? 'ring-2 ring-white/40' : ''}`}
                    title="Bucket List"
                  >
                    <Bookmark className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                    className="p-2.5 border border-white/20 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileView(mobileView === 'itinerary' ? 'map' : 'itinerary')}
                    className="md:hidden p-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
                    aria-label={mobileView === 'itinerary' ? 'Show Map' : 'Show Itinerary'}
                  >
                    {mobileView === 'itinerary' ? <Map className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={handleAITripPlanning}
                    disabled={isAIPlanning}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-orange-100 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                    title="Fill trip with AI-recommended places"
                  >
                    {isAIPlanning ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>{isAIPlanning ? 'Planning...' : 'Smart Fill'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 sm:p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/70">Trip status</p>
                <p className="text-lg font-semibold mt-1 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {trip.status === 'completed' ? 'Completed' : 'Planning'}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/70">Itinerary items</p>
                <p className="text-lg font-semibold mt-1">{totalItems || 'Add plans'}</p>
                <p className="text-[11px] text-white/60">{flightsCount} flights in schedule</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/70">Next milestone</p>
                <p className="text-lg font-semibold mt-1">{countdownLabel}</p>
                <p className="text-[11px] text-white/60">{trip.destination || 'Add a city'}</p>
              </div>
              <div className="p-3 sm:p-4 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                <p className="text-xs text-white/70">Dates</p>
                <p className="text-lg font-semibold mt-1">
                  {trip.start_date && trip.end_date
                    ? `${formatTripDate(trip.start_date)} – ${formatTripDate(trip.end_date)}`
                    : 'Tap to set'}
                </p>
                <p className="text-[11px] text-white/60">{totalDays > 1 ? `${totalDays} days` : 'Flexible length'}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => openPlaceSelector(selectedDay)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-orange-100 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                New activity
              </button>
              <button
                onClick={() => openFlightDrawer(selectedDay)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-semibold text-sm border border-white/20 hover:bg-white/20 transition-all"
              >
                <Plane className="w-4 h-4" />
                Add flight
              </button>
              <button
                onClick={() => setShowNotes(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-semibold text-sm border border-white/20 hover:bg-white/20 transition-all"
              >
                <ListTodo className="w-4 h-4" />
                Trip notes
              </button>
              <button
                onClick={() => openDrawer('trip-settings', { trip, onUpdate: updateTrip, onDelete: () => router.push('/trips') })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-semibold text-sm border border-white/20 hover:bg-white/20 transition-all"
              >
                <Settings className="w-4 h-4" />
                Customize
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Split-Screen Canvas */}
      <div className="flex min-h-[600px] lg:h-[calc(100vh-260px)] max-w-7xl mx-auto w-full relative">
        {/* Left Panel: Itinerary */}
        <div className={`
          flex flex-col h-full transition-all duration-300
          ${mobileView === 'itinerary' ? 'w-full' : 'hidden'} 
          md:flex md:w-1/2 
          ${showBucketList ? 'lg:w-2/5' : 'lg:w-3/5'}
        `}>
          {/* Weather & Alerts Bar */}
          <div className="px-4 md:px-10 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
            <TripWeatherForecast
              destination={trip.destination}
              startDate={trip.start_date}
              endDate={trip.end_date}
              compact
            />
          </div>

          {/* Notes & Lists Panel */}
          {showNotes && (
            <div className="px-4 md:px-10 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <TripNotesEditor
                notes={tripNotes}
                onChange={updateTripNotes}
              />
            </div>
          )}

          {/* Day Tabs */}
          <div className="px-4 md:px-10 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedDay(Math.max(1, selectedDay - 1))}
              disabled={selectedDay === 1}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2 flex-1 overflow-x-auto no-scrollbar px-2">
              {days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setSelectedDay(day.dayNumber)}
                  className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl min-w-[80px] transition-all duration-200 border flex-shrink-0 ${
                    selectedDay === day.dayNumber
                      ? 'bg-black dark:bg-white text-white dark:text-black border-transparent shadow-md transform scale-105'
                      : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">Day {day.dayNumber}</span>
                  {day.date && (
                    <span className={`text-[10px] mt-0.5 ${selectedDay === day.dayNumber ? 'opacity-80' : 'opacity-60'}`}>
                      {formatTripDate(day.date) ?? ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelectedDay(Math.min(days.length, selectedDay + 1))}
              disabled={selectedDay === days.length}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Summary & Actions */}
          <div className="px-4 md:px-10 py-4 flex items-center justify-between gap-4 bg-white dark:bg-gray-950 sticky top-0 z-20">
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
                <span className="hidden sm:inline">Flight</span>
              </UMActionPill>
              <UMActionPill variant="primary" onClick={() => openPlaceSelector(selectedDay)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Place
              </UMActionPill>
            </div>
          </div>

          {/* Itinerary Items */}
          <div className="flex-1 overflow-y-auto px-4 md:px-10 pb-10 custom-scrollbar">
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

        {/* Right Panel: Map */}
        <div className={`
          border-l border-gray-200 dark:border-gray-800 transition-all duration-300
          ${mobileView === 'map' ? 'w-full h-full absolute inset-0 z-20 bg-white dark:bg-gray-950' : 'hidden'} 
          md:block md:relative md:w-1/2 md:inset-auto md:z-0
          ${showBucketList ? 'lg:w-2/5' : 'lg:w-2/5'}
        `}>
          <TripMapView
            places={mapPlaces}
            className="h-full w-full"
          />
        </div>

        {/* Right Sidebar: Bucket List */}
        {showBucketList && (
          <div className="hidden md:block w-1/4 lg:w-1/5 border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 backdrop-blur-xl">
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
