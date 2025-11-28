'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Trip, ItineraryItem, ItineraryItemNotes, FlightData } from '@/types/trip';
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
    // Optimistic update
    setDays((prev) =>
      prev.map((d) =>
        d.dayNumber === dayNumber ? { ...d, items: newItems } : d
      )
    );

    try {
      const supabase = createClient();
      if (!supabase) return;

      // Update order_index for each item (skip temp IDs that haven't been saved yet)
      const itemsToUpdate = newItems.filter(item => !item.id.startsWith('temp-'));

      await Promise.all(
        itemsToUpdate.map((item, index) =>
          supabase
            .from('itinerary_items')
            .update({ order_index: index })
            .eq('id', item.id)
        )
      );
    } catch (err) {
      console.error('Error reordering:', err);
      fetchTrip(); // Revert on error
    }
  }, [fetchTrip]);

  // Add a place to the itinerary
  const addPlace = useCallback(async (destination: Destination, dayNumber: number, time?: string) => {
    if (!trip || !userId) return;

    const currentDay = days.find((d) => d.dayNumber === dayNumber);
    const orderIndex = currentDay?.items.length || 0;

    const notesData: ItineraryItemNotes = {
      type: 'place',
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

  return {
    trip,
    days,
    loading,
    saving,
    updateTrip,
    reorderItems,
    addPlace,
    addFlight,
    removeItem,
    updateItemTime,
    updateItemNotes,
    refresh: fetchTrip,
  };
}
