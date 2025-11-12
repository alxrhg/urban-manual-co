'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import { ArrowLeft, Calendar, MapPin, Trash2, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';
import { TripDay, TripLocation } from '@/components/TripDay';
import { AddLocationToTrip } from '@/components/AddLocationToTrip';
import { useToast } from '@/hooks/useToast';
import {
  batchUpdateItineraryItems,
  mergeItineraryNotes,
  parseItineraryNotes,
  type ItineraryNotesData,
} from '@/components/TripPlanner';

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
  const toast = useToast();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [destinations, setDestinations] = useState<Map<string, Destination>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [, setShowAddLocationModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);

  const addSavingItems = (ids: string[]) => {
    setSavingItemIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const removeSavingItems = (ids: string[]) => {
    setSavingItemIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const fetchTripDetails = useCallback(async () => {
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

      const trip = tripData as Trip;
      
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
        setItineraryItems(itemsForTrip);

        // Fetch destinations for items with destination_slug
        const itemsForTrip = (itemsData || []) as ItineraryItem[];
        const slugs = itemsForTrip
          .map((item) => item.destination_slug)
          .filter((slug): slug is string => slug !== null);

        if (slugs.length > 0) {
          const { data: destData, error: destError } = await supabaseClient
            .from('destinations')
            .select('*')
            .in('slug', slugs);

          if (!destError && destData) {
            const destMap = new Map<string, Destination>();
            (destData as Destination[]).forEach((dest) => {
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
  }, [tripId, user, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }
      fetchTripDetails();
    }
  }, [authLoading, user, router, fetchTripDetails]);

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
      toast.success('Itinerary item removed.');
    } catch (error) {
      console.error('Error deleting itinerary item:', error);
      toast.error('Failed to remove item. Please try again.');
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
      toast.success('Trip deleted.');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip. Please try again.');
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

  // Transform itinerary items to TripLocation format
  const transformItemsToLocations = (items: ItineraryItem[]): TripLocation[] => {
    return items.map((item) => {
      const destination = item.destination_slug
        ? destinations.get(item.destination_slug)
        : null;

      const notesData = parseItineraryNotes(item.notes);

      return {
        id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now(),
        itemId: item.id,
        name: destination?.name || item.title,
        city: destination?.city || notesData.city || '',
        category: destination?.category || item.description || '',
        image: destination?.image || notesData.image || '/placeholder-image.jpg',
        time: item.time || undefined,
        notes: notesData.raw || undefined,
        cost: notesData.cost || undefined,
        duration: notesData.duration || undefined,
        mealType: notesData.mealType || undefined,
        orderIndex: item.order_index ?? 0,
      };
    });
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
      toast.success('Location added to itinerary.');
    } catch (error) {
      console.error('Error adding location:', error);
      toast.error('Failed to add location. Please try again.');
    }
  };

  const handleRemoveLocation = async (locationId: number) => {
    const itemId = itineraryItems.find(item => parseInt(item.id) === locationId)?.id;
    if (itemId) {
      await deleteItineraryItem(itemId);
    }
  };

  const handleLocationFieldChange = async (
    location: TripLocation,
    updates: Partial<TripLocation>
  ) => {
    if (!location.itemId || !tripId || !trip || trip.user_id !== user?.id) return;

    const currentItem = itineraryItems.find((item) => item.id === location.itemId);
    if (!currentItem) return;

    const previousItems = itineraryItems.map((item) => ({ ...item }));

    const payload: {
      id: string;
      time?: string | null;
      notes?: string | null;
    } = {
      id: location.itemId,
    };

    let didChange = false;

    if (Object.prototype.hasOwnProperty.call(updates, 'time')) {
      const newTime = updates.time ? updates.time : null;
      if ((currentItem.time || null) !== newTime) {
        payload.time = newTime;
        didChange = true;
      }
    }

    const notesUpdates: Partial<ItineraryNotesData> = {};
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      notesUpdates.raw = updates.notes || '';
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'mealType')) {
      notesUpdates.mealType = updates.mealType || undefined;
    }

    if (Object.keys(notesUpdates).length > 0) {
      const mergedNotes = mergeItineraryNotes(currentItem.notes, notesUpdates);
      if (mergedNotes !== currentItem.notes) {
        payload.notes = mergedNotes;
        didChange = true;
      }
    }

    if (!didChange) return;

    addSavingItems([location.itemId]);

    setItineraryItems((prev) =>
      prev.map((item) => {
        if (item.id !== location.itemId) return item;
        return {
          ...item,
          ...(payload.time !== undefined ? { time: payload.time } : {}),
          ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        };
      })
    );

    try {
      await batchUpdateItineraryItems(tripId, [payload]);
      toast.success('Itinerary updated.');
    } catch (error) {
      console.error('Error updating itinerary item:', error);
      setItineraryItems(previousItems);
      toast.error('Failed to update itinerary item.');
    } finally {
      removeSavingItems([location.itemId]);
    }
  };

  const handleReorderLocations = async (
    dayNumber: number,
    dayItems: ItineraryItem[],
    reorderedLocations: TripLocation[]
  ) => {
    if (!tripId || !trip || trip.user_id !== user?.id) return;

    const previousItems = itineraryItems.map((item) => ({ ...item }));
    const usedIds = new Set<string>();

    const updates = reorderedLocations.reduce<
      Array<{ id: string; order_index: number; day: number }>
    >((acc, location, index) => {
      let targetId = location.itemId && !usedIds.has(location.itemId)
        ? location.itemId
        : undefined;

      if (!targetId) {
        const fallback = dayItems.find((item) => {
          if (usedIds.has(item.id)) return false;
          if (item.title === location.name) return true;
          if (
            item.destination_slug &&
            location.name &&
            item.destination_slug === location.name.toLowerCase().replace(/\s+/g, '-')
          ) {
            return true;
          }
          return false;
        });
        if (fallback) {
          targetId = fallback.id;
        }
      }

      if (!targetId) {
        return acc;
      }

      usedIds.add(targetId);
      acc.push({ id: targetId, order_index: index, day: dayNumber });
      return acc;
    }, []);

    if (updates.length === 0) return;

    addSavingItems(updates.map((update) => update.id));

    const updatesMap = new Map(updates.map((update) => [update.id, update]));

    setItineraryItems((prev) => {
      const updated = prev.map((item) => {
        const update = updatesMap.get(item.id);
        if (!update) return item;
        return {
          ...item,
          order_index: update.order_index,
          day: update.day,
        };
      });
      return updated.sort((a, b) => {
        if (a.day === b.day) {
          return (a.order_index || 0) - (b.order_index || 0);
        }
        return a.day - b.day;
      });
    });

    try {
      await batchUpdateItineraryItems(tripId, updates);
      toast.success('Itinerary order updated.');
    } catch (error) {
      console.error('Error updating itinerary order:', error);
      setItineraryItems(previousItems);
      toast.error('Failed to reorder itinerary.');
    } finally {
      removeSavingItems(updates.map((update) => update.id));
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

        {/* Itinerary by Day */}
        {Object.keys(itemsByDay).length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-gray-300 dark:border-gray-800 bg-white/70 dark:bg-gray-950/60 px-10 py-16 text-center space-y-5">
            <MapPin className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700" />
            <h3 className="text-xl font-medium">No items yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add destinations to this trip to start building your itinerary.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(itemsByDay)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([day, items]) => {
                const dayNumber = Number(day);
                const dayDate = getDateForDay(dayNumber);
                const locations = transformItemsToLocations(items);

                const dayItems = items as ItineraryItem[];
                const canEdit = trip.user_id === user?.id;

                return (
                  <TripDay
                    key={day}
                    dayNumber={dayNumber}
                    date={dayDate}
                    locations={locations}
                    onAddLocation={() => handleAddLocation(dayNumber)}
                    onRemoveLocation={handleRemoveLocation}
                    onReorderLocations={(reorderedLocations) =>
                      handleReorderLocations(dayNumber, dayItems, reorderedLocations)
                    }
                    onUpdateLocation={
                      canEdit
                        ? (location, updates) =>
                            handleLocationFieldChange(location, updates)
                        : undefined
                    }
                    editable={canEdit}
                    savingLocationItemIds={savingItemIds}
                    onDuplicateDay={async () => {
                      // Duplicate day functionality
                      alert('Duplicate day feature coming soon');
                    }}
                    onOptimizeRoute={async () => {
                      // Optimize route functionality
                      alert('Route optimization feature coming soon');
                    }}
                  />
                );
              })}
          </div>
        )}
      </PageContainer>

      {/* Destination Drawer */}
      {selectedDestination && (
        <div
          className={`fixed inset-0 z-50 md:hidden ${
            isDrawerOpen ? 'block' : 'hidden'
          }`}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-950 rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{selectedDestination.name}</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Link
                href={`/destination/${selectedDestination.slug}`}
                className="block w-full text-center py-3 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
              >
                View Full Details
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {trip && selectedDay !== null && (
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

