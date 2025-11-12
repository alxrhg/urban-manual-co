'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Trash2,
  Plus,
  Loader2,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';
import { capitalizeCity } from '@/lib/utils';
import { TripDay } from '@/components/TripDay';
import { AddLocationToTrip } from '@/components/AddLocationToTrip';

interface Trip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_public: boolean;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

interface ItineraryItem {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}

export default function TripDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'day' | 'name'>('day');
  const [activeDayFilter, setActiveDayFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      fetchTripDetails();
    }
  }, [authLoading, user, tripId]);

  const fetchTripDetails = async () => {
    if (!tripId) return;
    setLoading(true);

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Fetch trip details
      const { data: tripData, error: tripError } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError || !tripData) {
        console.error('Error fetching trip:', tripError);
        router.push('/trips');
        return;
      }

      const trip = tripData as any;
      
      // Check if user owns this trip or if it's public
      if (!trip.is_public && trip.user_id !== user?.id) {
        router.push('/trips');
        return;
      }

      setTrip(trip);

      // Fetch itinerary items
      const { data: itemsData, error: itemsError } = await supabaseClient
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) {
        console.error('Error fetching itinerary items:', itemsError);
      } else {
        setItineraryItems(itemsData || []);

        // Fetch destinations for items with destination_slug
        const slugs = (itemsData || [])
          .map((item: any) => item.destination_slug)
          .filter((slug: string | null) => slug !== null) as string[];

        if (slugs.length > 0) {
          const { data: destData, error: destError } = await supabaseClient
            .from('destinations')
            .select('*')
            .in('slug', slugs);

          if (!destError && destData) {
            const destMap = new Map<string, Destination>();
            destData.forEach((dest: any) => {
              destMap.set(dest.slug, dest);
            });
            setDestinations(destMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteItineraryItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the trip?')) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setItineraryItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  const deleteTrip = async () => {
    if (!trip || !confirm(`Are you sure you want to delete "${trip.title}"?`)) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', trip.id);

      if (error) throw error;

      router.push('/trips');
    } catch (error) {
      console.error('Error deleting trip:', error);
      alert('Failed to delete trip. Please try again.');
    }
  };

  // Group items by day
  const itemsByDay = itineraryItems.reduce((acc, item) => {
    if (!acc[item.day]) {
      acc[item.day] = [];
    }
    acc[item.day].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  // Calculate date for a specific day based on trip start_date
  const getDateForDay = (dayNumber: number): string => {
    if (!trip?.start_date) {
      // If no start date, use today as base
      const date = new Date();
      date.setDate(date.getDate() + dayNumber - 1);
      return date.toISOString().split('T')[0];
    }
    const startDate = new Date(trip.start_date);
    startDate.setDate(startDate.getDate() + dayNumber - 1);
    return startDate.toISOString().split('T')[0];
  };

  const dayNumbers = useMemo(() => {
    const uniqueDays = new Set<number>();
    itineraryItems.forEach((item) => {
      if (typeof item.day === 'number') {
        uniqueDays.add(item.day);
      }
    });
    return Array.from(uniqueDays).sort((a, b) => a - b);
  }, [itineraryItems]);

  useEffect(() => {
    if (activeDayFilter !== 'all' && !dayNumbers.includes(activeDayFilter)) {
      setActiveDayFilter('all');
    }
  }, [activeDayFilter, dayNumbers]);

  // Transform itinerary items to TripLocation format
  const transformItemsToLocations = (items: ItineraryItem[]) => {
    return items.map((item) => {
      const destination = item.destination_slug
        ? destinations.get(item.destination_slug)
        : null;

      // Parse notes for additional data (cost, duration, mealType)
      let notesData: any = {};
      if (item.notes) {
        try {
          notesData = JSON.parse(item.notes);
        } catch {
          notesData = { raw: item.notes };
        }
      }

      return {
        id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
        name: destination?.name || item.title,
        city: destination?.city || notesData.city || '',
        category: destination?.category || item.description || '',
        image: destination?.image || notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
        notes: typeof notesData === 'string' ? notesData : notesData.raw || undefined,
        cost: notesData.cost || undefined,
        duration: notesData.duration || undefined,
        mealType: notesData.mealType || undefined,
      };
    });
  };

  interface EnrichedItineraryItem {
    id: string;
    day: number;
    order: number;
    title: string;
    city: string;
    category: string;
    image: string;
    slug: string | null;
    time?: string | null;
    notes?: string;
  }

  const enrichedItems = useMemo<EnrichedItineraryItem[]>(() => {
    return itineraryItems.map((item) => {
      const destination = item.destination_slug
        ? destinations.get(item.destination_slug)
        : null;

      let notesData: Record<string, any> = {};
      if (item.notes) {
        try {
          notesData = JSON.parse(item.notes);
        } catch {
          notesData = { raw: item.notes };
        }
      }

      const fallbackSlug =
        destination?.slug || item.destination_slug || item.title.toLowerCase().replace(/\s+/g, '-');

      return {
        id: item.id,
        day: item.day,
        order: item.order_index,
        title: destination?.name || item.title,
        city: destination?.city || notesData.city || '',
        category: destination?.category || item.description || '',
        image: destination?.image || notesData.image || '/placeholder-image.jpg',
        slug: fallbackSlug,
        time: item.time,
        notes: typeof notesData === 'string' ? notesData : notesData.raw || undefined,
      } satisfies EnrichedItineraryItem;
    });
  }, [itineraryItems, destinations]);

  const filteredItems = useMemo(() => {
    let items = [...enrichedItems];

    if (activeDayFilter !== 'all') {
      items = items.filter((item) => item.day === activeDayFilter);
    }

    items.sort((a, b) => {
      if (sortBy === 'name') {
        return a.title.localeCompare(b.title);
      }
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      return a.order - b.order;
    });

    return items;
  }, [enrichedItems, activeDayFilter, sortBy]);

  const formatTimeLabel = (time?: string | null) => {
    if (!time) return null;
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(Number(hours), Number(minutes));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return time;
    }
  };

  const openAddLocationModal = () => {
    const defaultDay =
      activeDayFilter !== 'all'
        ? activeDayFilter
        : dayNumbers.length > 0
        ? dayNumbers[dayNumbers.length - 1]
        : 1;
    setSelectedDay(defaultDay);
    setShowAddLocationModal(true);
  };

  const handleAddLocation = (dayNumber: number) => {
    setSelectedDay(dayNumber);
    setShowAddLocationModal(true);
  };

  const handleLocationAdded = async (location: {
    id: number;
    name: string;
    city: string;
    category: string;
    image: string;
    time?: string;
    notes?: string;
    cost?: number;
    duration?: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }) => {
    if (!trip || selectedDay === null) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient || !user) return;

      // Get the next order_index for this day
      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', trip.id)
        .eq('day', selectedDay)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = existingItems ? (existingItems.order_index || 0) + 1 : 0;

      // Store additional data in notes as JSON
      const notesData = {
        raw: location.notes || '',
        cost: location.cost,
        duration: location.duration,
        mealType: location.mealType,
        image: location.image,
        city: location.city,
        category: location.category,
      };

      // Add destination to itinerary
      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: trip.id,
          destination_slug: location.name.toLowerCase().replace(/\s+/g, '-'),
          day: selectedDay,
          order_index: nextOrder,
          time: location.time || null,
          title: location.name,
          description: location.category,
          notes: JSON.stringify(notesData),
        });

      if (error) throw error;

      // Reload trip data
      await fetchTripDetails();
      setShowAddLocationModal(false);
      setSelectedDay(null);
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Failed to add location. Please try again.');
    }
  };

  const handleRemoveLocation = async (locationId: number) => {
    const itemId = itineraryItems.find(item => parseInt(item.id) === locationId)?.id;
    if (itemId) {
      await deleteItineraryItem(itemId);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  return (
    <div className="pb-16">
      <PageIntro
        eyebrow="Trip Details"
        title={trip.title}
        description={trip.description || undefined}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/trips')}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Trips</span>
            </button>
            {trip.user_id === user?.id && (
              <button
                onClick={deleteTrip}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        }
      />

      <PageContainer className="space-y-8">
        {/* Trip Metadata */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {trip.destination && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{trip.destination}</span>
            </div>
          )}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(trip.start_date)}
                {trip.end_date && ` – ${formatDate(trip.end_date)}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              trip.status === 'planning' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
              trip.status === 'upcoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
              trip.status === 'ongoing' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}>
              {trip.status}
            </span>
          </div>
        </div>

        {/* Modern itinerary overview */}
        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`transition-all ${
                  viewMode === 'grid'
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`transition-all ${
                  viewMode === 'list'
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                List
              </button>
            </div>
            <button
              type="button"
              onClick={openAddLocationModal}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Place
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSortBy('day')}
              className={`transition-all ${
                sortBy === 'day'
                  ? 'font-medium text-black dark:text-white'
                  : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
              }`}
            >
              Day order
            </button>
            <button
              type="button"
              onClick={() => setSortBy('name')}
              className={`transition-all ${
                sortBy === 'name'
                  ? 'font-medium text-black dark:text-white'
                  : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
              }`}
            >
              A-Z
            </button>
          </div>

          {dayNumbers.length > 1 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveDayFilter('all')}
                className={`transition-all ${
                  activeDayFilter === 'all'
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                All days
              </button>
              {dayNumbers.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setActiveDayFilter(day)}
                  className={`transition-all ${
                    activeDayFilter === day
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  Day {day}
                </button>
              ))}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-gray-300 bg-white/70 px-10 py-16 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950/60 space-y-5">
              <MapPin className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-700" />
              <div className="space-y-2">
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100">Start building this trip</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Use Add Place to curate the perfect itinerary, then refine in the detailed planner below.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddLocationModal}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
              >
                <Plus className="h-3.5 w-3.5" />
                Add first place
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredItems.map((item) => {
                const timeLabel = formatTimeLabel(item.time);
                return (
                  <div key={item.id} className="group relative rounded-2xl border border-gray-200 bg-white/80 p-2 text-left shadow-sm transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/80 dark:hover:border-gray-700">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.slug) {
                          router.push(`/destination/${item.slug}`);
                        }
                      }}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        {item.image && (
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover transition duration-300 group-hover:scale-105"
                            sizes="(max-width: 768px) 50vw, 25vw"
                          />
                        )}
                        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-gray-600 shadow-sm dark:bg-gray-900/80 dark:text-gray-300">
                          Day {item.day}
                        </div>
                        {timeLabel && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[10px] font-medium text-gray-600 shadow-sm dark:bg-gray-900/80 dark:text-gray-300">
                            <Clock className="h-3 w-3" />
                            {timeLabel}
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="mt-3 space-y-1">
                      <h3 className="text-sm font-medium leading-tight text-gray-900 dark:text-gray-100 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.city ? capitalizeCity(item.city) : 'Unassigned city'}
                      </p>
                      {item.category && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{item.category}</p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.id) return;
                          deleteItineraryItem(item.id);
                        }}
                        className="text-gray-400 transition hover:text-red-500"
                        aria-label={`Remove ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {item.slug && (
                        <Link
                          href={`/destination/${item.slug}`}
                          className="text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          View details
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const timeLabel = formatTimeLabel(item.time);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white/80 p-3 transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-950/80 dark:hover:border-gray-700"
                  >
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</h3>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Day {item.day}
                            {timeLabel && ` • ${timeLabel}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 capitalize">
                            {item.city ? capitalizeCity(item.city) : 'Unassigned city'}
                            {item.category && ` • ${item.category}`}
                          </p>
                          {item.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs">
                          {item.slug && (
                            <Link
                              href={`/destination/${item.slug}`}
                              className="text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              View
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteItineraryItem(item.id)}
                            className="text-gray-400 transition hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {Object.keys(itemsByDay).length > 0 && (
          <section className="space-y-8 border-t border-gray-100 pt-10 dark:border-gray-800">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Detailed planner</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Drag to reorder, duplicate days, and fine-tune pacing for every stop.
                </p>
              </div>
            </div>

            <div className="space-y-12">
              {Object.entries(itemsByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, items]) => {
                  const dayNumber = Number(day);
                  const dayDate = getDateForDay(dayNumber);
                  const locations = transformItemsToLocations(items);

                  return (
                    <TripDay
                      key={day}
                      dayNumber={dayNumber}
                      date={dayDate}
                      locations={locations}
                      onAddLocation={() => handleAddLocation(dayNumber)}
                      onRemoveLocation={handleRemoveLocation}
                      onReorderLocations={async (reorderedLocations) => {
                        try {
                          const supabaseClient = createClient();
                          if (!supabaseClient || !user) return;

                          await supabaseClient
                            .from('itinerary_items')
                            .delete()
                            .eq('trip_id', tripId)
                            .eq('day', dayNumber);

                          const itemsToInsert = reorderedLocations.map((loc, idx) => {
                            const originalItem = items.find(
                              (item) =>
                                item.title === loc.name ||
                                item.destination_slug === loc.name.toLowerCase().replace(/\s+/g, '-')
                            );

                            let notesData: any = {};
                            if (originalItem?.notes) {
                              try {
                                notesData = JSON.parse(originalItem.notes);
                              } catch {
                                notesData = { raw: originalItem.notes };
                              }
                            }

                            const updatedNotes = JSON.stringify({
                              raw: loc.notes || notesData.raw || '',
                              cost: loc.cost || notesData.cost,
                              duration: loc.duration || notesData.duration,
                              mealType: loc.mealType || notesData.mealType,
                              image: loc.image || notesData.image,
                              city: loc.city || notesData.city,
                              category: loc.category || notesData.category,
                            });

                            return {
                              trip_id: tripId,
                              destination_slug:
                                originalItem?.destination_slug || loc.name.toLowerCase().replace(/\s+/g, '-'),
                              day: dayNumber,
                              order_index: idx,
                              time: loc.time || originalItem?.time || null,
                              title: loc.name,
                              description: loc.category || originalItem?.description || '',
                              notes: updatedNotes,
                            };
                          });

                          if (itemsToInsert.length > 0) {
                            await supabaseClient.from('itinerary_items').insert(itemsToInsert);
                          }

                          await fetchTripDetails();
                        } catch (error) {
                          console.error('Error reordering locations:', error);
                          alert('Failed to reorder locations. Please try again.');
                        }
                      }}
                      onDuplicateDay={async () => {
                        alert('Duplicate day feature coming soon');
                      }}
                      onOptimizeRoute={async () => {
                        alert('Route optimization feature coming soon');
                      }}
                    />
                  );
                })}
            </div>
          </section>
        )}
      </PageContainer>

      {/* Add Location Modal */}
      {trip && showAddLocationModal && selectedDay !== null && (
        <AddLocationToTrip
          onAdd={handleLocationAdded}
          onClose={() => {
            setShowAddLocationModal(false);
            setSelectedDay(null);
          }}
        />
      )}
    </div>
  );
}

