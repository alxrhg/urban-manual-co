'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Trip, ItineraryItem, ItineraryItemNotes, FlightData, TrainData, ActivityData, HotelData } from '@/types/trip';
import { parseItineraryNotes, stringifyItineraryNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import { recalculateDayTimes, calculateTripDays, addDaysToDate } from '@/lib/utils/time-calculations';

export interface TripDay {
  dayNumber: number;
  date: string | null;
  items: EnrichedItineraryItem[];
}

export interface EnrichedItineraryItem extends ItineraryItem {
  destination?: Destination;
  parsedNotes?: ItineraryItemNotes;
}

interface UseTripEditorOptions {
  tripId: string;
  userId: string | undefined;
  onError?: (error: Error) => void;
}

/**
 * useTripEditor - Centralized hook for trip editor state and actions
 * Manages items, reordering, and CRUD operations
 */
export function useTripEditor({ tripId, userId, onError }: UseTripEditorOptions) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Fetch trip and items
  const fetchTrip = useCallback(async (isInitialLoad = false) => {
    if (!tripId || !userId) {
      // Don't set loading if we don't have required params yet
      return;
    }

    try {
      // Only show loading on initial load, not refreshes
      if (isInitialLoad || !initialized) {
        setLoading(true);
      }
      const supabase = createClient();
      if (!supabase) {
        setLoading(false);
        return;
      }

      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .eq('user_id', userId)
        .single();

      if (tripError) throw tripError;
      if (!tripData) throw new Error('Trip not found');

      setTrip(tripData);

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch destination details
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

      // Build days array
      const numDays = calculateTripDays(tripData.start_date, tripData.end_date);
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
          date: tripData.start_date ? addDaysToDate(tripData.start_date, i - 1) : null,
          items: dayItems,
        });
      }

      setDays(daysArray);
    } catch (err) {
      console.error('Error fetching trip:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to fetch trip'));
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [tripId, userId, onError, initialized]);

  useEffect(() => {
    // Wait for auth to load before fetching
    if (!userId) {
      // Still waiting for auth - keep loading state
      return;
    }

    if (!initialized && tripId) {
      fetchTrip(true);
    }
  }, [tripId, userId, initialized, fetchTrip]);

  // Update trip metadata
  const updateTrip = useCallback(async (updates: Partial<Trip>) => {
    if (!trip || !userId) return;

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id)
        .eq('user_id', userId);

      if (error) throw error;
      setTrip({ ...trip, ...updates });

      // Refresh if dates changed
      if (updates.start_date || updates.end_date) {
        fetchTrip();
      }
    } catch (err) {
      console.error('Error updating trip:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to update trip'));
    } finally {
      setSaving(false);
    }
  }, [trip, userId, fetchTrip, onError]);

  // Reorder items within a day
  const reorderItems = useCallback(async (dayNumber: number, newItems: EnrichedItineraryItem[]) => {
    // Store previous state for potential revert
    const previousDays = days;

    // Optimistic update
    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber ? { ...d, items: newItems } : d
      )
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      // Update order_index for each item (skip temp IDs and invalid IDs)
      const itemsToUpdate = newItems.filter(item => {
        const idStr = String(item.id);
        // Skip temp IDs, empty IDs, or non-UUID-like IDs
        if (idStr.startsWith('temp-') || !idStr || idStr === 'undefined' || idStr === 'null') {
          console.log('Skipping reorder for temp/invalid ID:', idStr);
          return false;
        }
        // Check if it looks like a valid UUID (basic check)
        if (idStr.length < 10) {
          console.log('Skipping reorder for short ID:', idStr);
          return false;
        }
        return true;
      });

      if (itemsToUpdate.length === 0) {
        console.log('No valid items to reorder');
        return;
      }

      // Update items sequentially to avoid race conditions
      for (let i = 0; i < itemsToUpdate.length; i++) {
        const item = itemsToUpdate[i];
        const { error } = await supabase
          .from('itinerary_items')
          .update({ order_index: i })
          .eq('id', item.id);

        if (error) {
          console.error('Error updating item order:', item.id, error);
          throw error;
        }
      }
    } catch (err) {
      console.error('Error reordering:', err);
      // Revert to previous state on error
      setDays(previousDays);
      onError?.(err instanceof Error ? err : new Error('Failed to reorder items'));
    }
  }, [days, onError]);

  // Add a place to the itinerary
  const addPlace = useCallback(async (destination: Destination, dayNumber: number, time?: string) => {
    if (!trip || !userId) return;

    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    const orderIndex = currentDay?.items.length || 0;

    // Determine item type based on destination category
    const categoryLower = (destination.category || '').toLowerCase();
    let itemType: ItineraryItemNotes['type'] = 'place';
    if (categoryLower === 'hotel' || categoryLower === 'accommodation' || categoryLower === 'lodging') {
      itemType = 'hotel';
    } else if (categoryLower === 'cafe' || categoryLower === 'breakfast') {
      itemType = 'breakfast';
    }

    const notesData: ItineraryItemNotes = {
      type: itemType,
      latitude: destination.latitude ?? undefined,
      longitude: destination.longitude ?? undefined,
      category: destination.category ?? undefined,
      image: destination.image_thumbnail || destination.image || undefined,
    };

    // Optimistic update - add item immediately with temp ID
    const tempId = `temp-${Date.now()}`;
    const newItem: EnrichedItineraryItem = {
      id: tempId,
      trip_id: trip.id,
      destination_slug: destination.slug,
      day: dayNumber,
      order_index: orderIndex,
      time: time || null,
      title: destination.name,
      description: destination.city,
      notes: stringifyItineraryNotes(notesData),
      created_at: new Date().toISOString(),
      destination: destination,
      parsedNotes: notesData,
    };

    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? { ...d, items: [...d.items, newItem] }
          : d
      )
    );

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: destination.slug,
        day: dayNumber,
        order_index: orderIndex,
        time: time,
        title: destination.name,
        description: destination.city,
        notes: stringifyItineraryNotes(notesData),
      }).select().single();

      if (error) throw error;

      // Update with real ID
      if (data) {
        setDays((prev) =>
          prev.map((d) =>
            d.dayNumber === dayNumber
              ? {
                  ...d,
                  items: d.items.map((item) =>
                    item.id === tempId ? { ...item, id: data.id } : item
                  ),
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error('Error adding place:', err);
      // Revert optimistic update
      setDays((prev) =>
        prev.map((d) =>
          d.dayNumber === dayNumber
            ? { ...d, items: d.items.filter((item) => item.id !== tempId) }
            : d
        )
      );
      onError?.(err instanceof Error ? err : new Error('Failed to add place'));
    } finally {
      setSaving(false);
    }
  }, [trip, userId, days, onError]);

  // Add a flight
  const addFlight = useCallback(async (flightData: FlightData, dayNumber: number) => {
    if (!trip || !userId) return;

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

    const title = `${flightData.airline} ${flightData.flightNumber || 'Flight'}`;
    const description = `${flightData.from} → ${flightData.to}`;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: EnrichedItineraryItem = {
      id: tempId,
      trip_id: trip.id,
      destination_slug: null,
      day: dayNumber,
      order_index: orderIndex,
      time: flightData.departureTime || null,
      title,
      description,
      notes: stringifyItineraryNotes(notesData),
      created_at: new Date().toISOString(),
      destination: undefined,
      parsedNotes: notesData,
    };

    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? { ...d, items: [...d.items, newItem] }
          : d
      )
    );

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: null,
        day: dayNumber,
        order_index: orderIndex,
        time: flightData.departureTime,
        title,
        description,
        notes: stringifyItineraryNotes(notesData),
      }).select().single();

      if (error) throw error;

      // Update with real ID
      if (data) {
        setDays((prev) =>
          prev.map((d) =>
            d.dayNumber === dayNumber
              ? {
                  ...d,
                  items: d.items.map((item) =>
                    item.id === tempId ? { ...item, id: data.id } : item
                  ),
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error('Error adding flight:', err);
      // Revert optimistic update
      setDays((prev) =>
        prev.map((d) =>
          d.dayNumber === dayNumber
            ? { ...d, items: d.items.filter((item) => item.id !== tempId) }
            : d
        )
      );
      onError?.(err instanceof Error ? err : new Error('Failed to add flight'));
    } finally {
      setSaving(false);
    }
  }, [trip, userId, days, onError]);

  // Add a train
  const addTrain = useCallback(async (trainData: TrainData, dayNumber: number) => {
    if (!trip || !userId) return;

    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    const orderIndex = currentDay?.items.length || 0;

    const notesData: ItineraryItemNotes = {
      type: 'train',
      trainLine: trainData.trainLine,
      trainNumber: trainData.trainNumber,
      from: trainData.from,
      to: trainData.to,
      departureDate: trainData.departureDate,
      departureTime: trainData.departureTime,
      arrivalDate: trainData.arrivalDate,
      arrivalTime: trainData.arrivalTime,
      duration: trainData.duration,
      confirmationNumber: trainData.confirmationNumber,
      raw: trainData.notes,
    };

    const title = trainData.trainLine
      ? `${trainData.trainLine}${trainData.trainNumber ? ` ${trainData.trainNumber}` : ''}`
      : `Train ${trainData.trainNumber || ''}`;
    const description = `${trainData.from} → ${trainData.to}`;

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: EnrichedItineraryItem = {
      id: tempId,
      trip_id: trip.id,
      destination_slug: null,
      day: dayNumber,
      order_index: orderIndex,
      time: trainData.departureTime || null,
      title,
      description,
      notes: stringifyItineraryNotes(notesData),
      created_at: new Date().toISOString(),
      destination: undefined,
      parsedNotes: notesData,
    };

    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? { ...d, items: [...d.items, newItem] }
          : d
      )
    );

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: null,
        day: dayNumber,
        order_index: orderIndex,
        time: trainData.departureTime,
        title,
        description,
        notes: stringifyItineraryNotes(notesData),
      }).select().single();

      if (error) throw error;

      // Update with real ID
      if (data) {
        setDays((prev) =>
          prev.map((d) =>
            d.dayNumber === dayNumber
              ? {
                  ...d,
                  items: d.items.map((item) =>
                    item.id === tempId ? { ...item, id: data.id } : item
                  ),
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error('Error adding train:', err);
      // Revert optimistic update
      setDays((prev) =>
        prev.map((d) =>
          d.dayNumber === dayNumber
            ? { ...d, items: d.items.filter((item) => item.id !== tempId) }
            : d
        )
      );
      onError?.(err instanceof Error ? err : new Error('Failed to add train'));
    } finally {
      setSaving(false);
    }
  }, [trip, userId, days, onError]);

  // Add a hotel
  const addHotel = useCallback(async (hotelData: HotelData, dayNumber: number) => {
    if (!trip || !userId) return;

    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    const orderIndex = currentDay?.items.length || 0;

    const notesData: ItineraryItemNotes = {
      type: 'hotel',
      name: hotelData.name,
      address: hotelData.address,
      checkInDate: hotelData.checkInDate,
      checkInTime: hotelData.checkInTime,
      checkOutDate: hotelData.checkOutDate,
      checkOutTime: hotelData.checkOutTime,
      hotelConfirmation: hotelData.confirmationNumber,
      roomType: hotelData.roomType,
      raw: hotelData.notes,
    };

    const title = hotelData.name;
    const description = hotelData.address || '';

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: EnrichedItineraryItem = {
      id: tempId,
      trip_id: trip.id,
      destination_slug: null,
      day: dayNumber,
      order_index: orderIndex,
      time: hotelData.checkInTime || null,
      title,
      description,
      notes: stringifyItineraryNotes(notesData),
      created_at: new Date().toISOString(),
      destination: undefined,
      parsedNotes: notesData,
    };

    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? { ...d, items: [...d.items, newItem] }
          : d
      )
    );

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: null,
        day: dayNumber,
        order_index: orderIndex,
        time: hotelData.checkInTime,
        title,
        description,
        notes: stringifyItineraryNotes(notesData),
      }).select().single();

      if (error) throw error;

      // Update with real ID
      if (data) {
        setDays((prev) =>
          prev.map((d) =>
            d.dayNumber === dayNumber
              ? {
                  ...d,
                  items: d.items.map((item) =>
                    item.id === tempId ? { ...item, id: data.id } : item
                  ),
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error('Error adding hotel:', err);
      // Revert optimistic update
      setDays((prev) =>
        prev.map((d) =>
          d.dayNumber === dayNumber
            ? { ...d, items: d.items.filter((item) => item.id !== tempId) }
            : d
        )
      );
      onError?.(err instanceof Error ? err : new Error('Failed to add hotel'));
    } finally {
      setSaving(false);
    }
  }, [trip, userId, days, onError]);

  // Add an activity (downtime, hotel time, etc.)
  const addActivity = useCallback(async (activityData: ActivityData, dayNumber: number, time?: string) => {
    if (!trip || !userId) return;

    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    const orderIndex = currentDay?.items.length || 0;

    const notesData: ItineraryItemNotes = {
      type: 'activity',
      activityType: activityData.activityType,
      duration: activityData.duration,
      linkedHotelId: activityData.linkedHotelId,
      location: activityData.location,
      notes: activityData.notes,
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newItem: EnrichedItineraryItem = {
      id: tempId,
      trip_id: trip.id,
      destination_slug: null,
      day: dayNumber,
      order_index: orderIndex,
      time: time || null,
      title: activityData.title,
      description: activityData.notes || null,
      notes: stringifyItineraryNotes(notesData),
      created_at: new Date().toISOString(),
      destination: undefined,
      parsedNotes: notesData,
    };

    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber
          ? { ...d, items: [...d.items, newItem] }
          : d
      )
    );

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase.from('itinerary_items').insert({
        trip_id: trip.id,
        destination_slug: null,
        day: dayNumber,
        order_index: orderIndex,
        time: time || null,
        title: activityData.title,
        description: activityData.notes,
        notes: stringifyItineraryNotes(notesData),
      }).select().single();

      if (error) throw error;

      // Update with real ID
      if (data) {
        setDays((prev) =>
          prev.map((d) =>
            d.dayNumber === dayNumber
              ? {
                  ...d,
                  items: d.items.map((item) =>
                    item.id === tempId ? { ...item, id: data.id } : item
                  ),
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error('Error adding activity:', err);
      // Revert optimistic update
      setDays((prev) =>
        prev.map((d) =>
          d.dayNumber === dayNumber
            ? { ...d, items: d.items.filter((item) => item.id !== tempId) }
            : d
        )
      );
      onError?.(err instanceof Error ? err : new Error('Failed to add activity'));
    } finally {
      setSaving(false);
    }
  }, [trip, userId, days, onError]);

  // Remove an item
  const removeItem = useCallback(async (itemId: string) => {
    // Store for potential revert
    const previousDays = days;

    // Optimistic update - remove immediately
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.filter((item) => item.id !== itemId),
      }))
    );

    try {
      setSaving(true);
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error removing item:', err);
      // Revert optimistic update
      setDays(previousDays);
      onError?.(err instanceof Error ? err : new Error('Failed to remove item'));
    } finally {
      setSaving(false);
    }
  }, [days, onError]);

  // Update item time
  const updateItemTime = useCallback(async (itemId: string, time: string) => {
    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update({ time })
        .eq('id', itemId);

      if (error) throw error;

      // Optimistic update
      setDays((prev) =>
        prev.map((d) => ({
          ...d,
          items: d.items.map((item) =>
            item.id === itemId ? { ...item, time } : item
          ),
        }))
      );
    } catch (err) {
      console.error('Error updating time:', err);
    }
  }, []);

  const updateItemDuration = useCallback(async (itemId: string, duration: number) => {
    let existingNotes: ItineraryItemNotes | undefined;
    for (const day of days) {
      const item = day.items.find((i) => i.id === itemId);
      if (item) {
        existingNotes = item.parsedNotes;
        break;
      }
    }

    const updatedNotes: ItineraryItemNotes = {
      ...existingNotes,
      duration,
    };

    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.map((item) =>
          item.id === itemId
            ? { ...item, notes: stringifyItineraryNotes(updatedNotes), parsedNotes: updatedNotes }
            : item
        ),
      }))
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update({ notes: stringifyItineraryNotes(updatedNotes) })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating duration:', err);
    }
  }, [days]);

  // Update item notes
  const updateItemNotes = useCallback(async (itemId: string, notesText: string) => {
    // Find the item and update its parsed notes
    let existingNotes: ItineraryItemNotes | undefined;
    for (const day of days) {
      const item = day.items.find((i) => i.id === itemId);
      if (item) {
        existingNotes = item.parsedNotes;
        break;
      }
    }

    const updatedNotes: ItineraryItemNotes = {
      ...existingNotes,
      raw: notesText,
    };

    // Optimistic update
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.map((item) =>
          item.id === itemId
            ? { ...item, notes: stringifyItineraryNotes(updatedNotes), parsedNotes: updatedNotes }
            : item
        ),
      }))
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update({ notes: stringifyItineraryNotes(updatedNotes) })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating notes:', err);
    }
  }, [days]);

  // Update item with partial notes updates (for inline editing)
  const updateItem = useCallback(async (itemId: string, updates: Partial<ItineraryItemNotes>) => {
    // Find the item and merge updates
    let existingNotes: ItineraryItemNotes | undefined;
    for (const day of days) {
      const item = day.items.find((i) => i.id === itemId);
      if (item) {
        existingNotes = item.parsedNotes;
        break;
      }
    }

    const updatedNotes: ItineraryItemNotes = {
      ...existingNotes,
      ...updates,
    };

    // Optimistic update
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        items: d.items.map((item) =>
          item.id === itemId
            ? { ...item, notes: stringifyItineraryNotes(updatedNotes), parsedNotes: updatedNotes }
            : item
        ),
      }))
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update({ notes: stringifyItineraryNotes(updatedNotes) })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating item:', err);
    }
  }, [days]);

  // Move an item to a different day
  const moveItemToDay = useCallback(async (itemId: string, newDayNumber: number) => {
    // Find the item and its current day
    let currentDayNumber: number | null = null;
    let itemToMove: EnrichedItineraryItem | null = null;

    for (const day of days) {
      const item = day.items.find((i) => i.id === itemId);
      if (item) {
        currentDayNumber = day.dayNumber;
        itemToMove = item;
        break;
      }
    }

    if (!itemToMove || currentDayNumber === null || currentDayNumber === newDayNumber) {
      return; // Nothing to do
    }

    const newDay = days.find((d) => d.dayNumber === newDayNumber);
    const newOrderIndex = newDay?.items.length || 0;

    // Optimistic update - move item between days
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber === currentDayNumber) {
          // Remove from current day
          return { ...d, items: d.items.filter((item) => item.id !== itemId) };
        }
        if (d.dayNumber === newDayNumber) {
          // Add to new day
          return { ...d, items: [...d.items, { ...itemToMove!, day: newDayNumber, order_index: newOrderIndex }] };
        }
        return d;
      })
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update({ day: newDayNumber, order_index: newOrderIndex })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err) {
      console.error('Error moving item:', err);
      // Revert on error - refresh to get correct state
      fetchTrip();
      onError?.(err instanceof Error ? err : new Error('Failed to move item'));
    }
  }, [days, fetchTrip, onError]);

  return {
    trip,
    days,
    loading,
    saving,
    updateTrip,
    reorderItems,
    addPlace,
    addFlight,
    addTrain,
    addHotel,
    addActivity,
    removeItem,
    updateItemTime,
    updateItemDuration,
    updateItemNotes,
    updateItem,
    moveItemToDay,
    refresh: fetchTrip,
  };
}
