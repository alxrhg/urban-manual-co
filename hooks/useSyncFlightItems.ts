'use client';

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ItineraryItem,
  InsertItineraryItem,
  ItineraryItemNotes,
  stringifyItineraryNotes,
  parseItineraryNotes,
} from '@/types/trip';

/**
 * Flight data with sync-specific fields
 */
export interface Flight {
  id: string;
  tripId: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  loungeAccess?: boolean;
  notes?: string;
}

/**
 * Input for creating a new flight
 */
export interface CreateFlightInput {
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  loungeAccess?: boolean;
  notes?: string;
}

/**
 * Input for updating a flight
 */
export interface UpdateFlightInput {
  airline?: string;
  flightNumber?: string;
  from?: string;
  to?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  confirmationNumber?: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  loungeAccess?: boolean;
  notes?: string;
}

interface UseSyncFlightItemsReturn {
  flights: Flight[];
  loading: boolean;
  error: string | null;
  createFlight: (input: CreateFlightInput) => Promise<Flight | null>;
  updateFlight: (flightId: string, input: UpdateFlightInput) => Promise<boolean>;
  deleteFlight: (flightId: string) => Promise<boolean>;
  refreshFlights: () => Promise<void>;
}

/**
 * Calculate which day a date falls on relative to trip start date
 */
function calculateDayNumber(tripStartDate: string | null, targetDate: string): number {
  if (!tripStartDate) return 1;

  const start = new Date(tripStartDate);
  const target = new Date(targetDate);

  // Reset to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays + 1); // Day 1 is the start date
}

/**
 * Generate a unique ID for flights
 */
function generateFlightId(): string {
  return `flight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook to sync flights with itinerary items
 *
 * When a flight is created:
 * - Creates an itinerary item with type='flight' and flightId in notes
 * - If loungeAccess is true, creates an airport_activity item
 *
 * When a flight is updated:
 * - Updates the corresponding itinerary item
 * - Creates/updates/deletes lounge activity based on loungeAccess
 *
 * When a flight is deleted:
 * - Deletes the corresponding itinerary item
 * - Deletes any airport_activity items linked to it
 */
export function useSyncFlightItems(tripId: string | null): UseSyncFlightItemsReturn {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all flights for the trip from itinerary items
   */
  const fetchFlights = useCallback(async () => {
    if (!tripId || !user) {
      setFlights([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Fetch all itinerary items with type='flight' for this trip
      const { data: items, error: fetchError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId);

      if (fetchError) throw fetchError;

      // Filter and transform flight items
      const flightItems = (items || []).filter((item: ItineraryItem) => {
        const notes = parseItineraryNotes(item.notes);
        return notes?.type === 'flight' && notes?.flightId;
      });

      const flightsList: Flight[] = flightItems.map((item: ItineraryItem) => {
        const notes = parseItineraryNotes(item.notes) || {};
        return {
          id: notes.flightId as string,
          tripId,
          airline: notes.airline || '',
          flightNumber: notes.flightNumber || '',
          from: notes.from || '',
          to: notes.to || '',
          departureDate: notes.departureDate || '',
          departureTime: notes.departureTime || '',
          arrivalDate: notes.arrivalDate || '',
          arrivalTime: notes.arrivalTime || '',
          confirmationNumber: notes.confirmationNumber,
          terminal: notes.terminal,
          gate: notes.gate,
          seatNumber: notes.seatNumber,
          loungeAccess: notes.loungeAccess,
          notes: notes.notes,
        };
      });

      setFlights(flightsList);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flights';
      console.error('Error fetching flights:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tripId, user]);

  /**
   * Get trip start date for day calculation
   */
  const getTripStartDate = useCallback(async (): Promise<string | null> => {
    if (!tripId) return null;

    const supabase = createClient();
    const { data } = await supabase
      .from('trips')
      .select('start_date')
      .eq('id', tripId)
      .single();

    return data?.start_date || null;
  }, [tripId]);

  /**
   * Create itinerary item for a flight
   */
  const createFlightItineraryItem = useCallback(async (
    flight: Flight,
    tripStartDate: string | null
  ): Promise<string | null> => {
    const supabase = createClient();

    const dayNumber = calculateDayNumber(tripStartDate, flight.departureDate);

    // Get next order_index for this day
    const { data: existingItems } = await supabase
      .from('itinerary_items')
      .select('order_index')
      .eq('trip_id', flight.tripId)
      .eq('day', dayNumber)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = existingItems?.[0]?.order_index != null
      ? existingItems[0].order_index + 1
      : 0;

    const notes: ItineraryItemNotes & { flightId: string; loungeAccess?: boolean } = {
      type: 'flight',
      flightId: flight.id,
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      from: flight.from,
      to: flight.to,
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      arrivalDate: flight.arrivalDate,
      arrivalTime: flight.arrivalTime,
      confirmationNumber: flight.confirmationNumber,
      terminal: flight.terminal,
      gate: flight.gate,
      seatNumber: flight.seatNumber,
      loungeAccess: flight.loungeAccess,
      notes: flight.notes,
    };

    const insertData: InsertItineraryItem = {
      trip_id: flight.tripId,
      day: dayNumber,
      order_index: nextOrderIndex,
      time: flight.departureTime,
      title: `${flight.airline} ${flight.flightNumber}: ${flight.from} → ${flight.to}`,
      description: `Departure: ${flight.departureTime}, Arrival: ${flight.arrivalTime}`,
      notes: stringifyItineraryNotes(notes),
    };

    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  }, []);

  /**
   * Create airport lounge activity item
   */
  const createLoungeActivityItem = useCallback(async (
    flight: Flight,
    tripStartDate: string | null
  ): Promise<string | null> => {
    const supabase = createClient();

    const dayNumber = calculateDayNumber(tripStartDate, flight.departureDate);

    // Get order index just before the flight (lounge comes before boarding)
    const { data: flightItem } = await supabase
      .from('itinerary_items')
      .select('order_index')
      .eq('trip_id', flight.tripId)
      .eq('day', dayNumber)
      .ilike('notes', `%"flightId":"${flight.id}"%`)
      .single();

    const loungeOrderIndex = flightItem?.order_index != null
      ? flightItem.order_index - 0.5 // Place before flight
      : 0;

    const notes: ItineraryItemNotes & { linkedFlightId: string } = {
      type: 'activity',
      activityType: 'other',
      linkedFlightId: flight.id,
      location: `${flight.from} Airport Lounge`,
      duration: 90, // Default 90 minutes for lounge
    };

    const insertData: InsertItineraryItem = {
      trip_id: flight.tripId,
      day: dayNumber,
      order_index: Math.floor(loungeOrderIndex),
      time: undefined, // Will be calculated based on departure minus lounge time
      title: `Airport Lounge - ${flight.from}`,
      description: `Lounge access before ${flight.airline} ${flight.flightNumber}`,
      notes: stringifyItineraryNotes(notes),
    };

    const { data, error } = await supabase
      .from('itinerary_items')
      .insert(insertData)
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  }, []);

  /**
   * Delete lounge activity items linked to a flight
   */
  const deleteLoungeActivityItems = useCallback(async (flightId: string): Promise<void> => {
    if (!tripId) return;

    const supabase = createClient();

    // Find and delete all airport activity items linked to this flight
    const { data: items } = await supabase
      .from('itinerary_items')
      .select('id, notes')
      .eq('trip_id', tripId);

    const loungeItems = (items || []).filter((item: { id: string; notes: string | null }) => {
      const notes = parseItineraryNotes(item.notes);
      return notes?.linkedFlightId === flightId;
    });

    if (loungeItems.length > 0) {
      await supabase
        .from('itinerary_items')
        .delete()
        .in('id', loungeItems.map((item: { id: string }) => item.id));
    }
  }, [tripId]);

  /**
   * Create a new flight and sync to itinerary
   */
  const createFlight = useCallback(async (input: CreateFlightInput): Promise<Flight | null> => {
    if (!tripId || !user) {
      setError('Trip ID and user are required');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const flightId = generateFlightId();
      const flight: Flight = {
        id: flightId,
        tripId,
        ...input,
      };

      const tripStartDate = await getTripStartDate();

      // Create the flight itinerary item
      await createFlightItineraryItem(flight, tripStartDate);

      // If lounge access, create airport activity item
      if (input.loungeAccess) {
        await createLoungeActivityItem(flight, tripStartDate);
      }

      // Refresh the flights list
      await fetchFlights();

      return flight;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create flight';
      console.error('Error creating flight:', err);
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tripId, user, getTripStartDate, createFlightItineraryItem, createLoungeActivityItem, fetchFlights]);

  /**
   * Update an existing flight and sync changes to itinerary
   */
  const updateFlight = useCallback(async (flightId: string, input: UpdateFlightInput): Promise<boolean> => {
    if (!tripId || !user) {
      setError('Trip ID and user are required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Find the existing flight itinerary item
      const { data: items } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId);

      const flightItem = (items || []).find((item: ItineraryItem) => {
        const notes = parseItineraryNotes(item.notes);
        return notes?.type === 'flight' && notes?.flightId === flightId;
      });

      if (!flightItem) {
        throw new Error('Flight not found');
      }

      const existingNotes = parseItineraryNotes(flightItem.notes) || {};
      const tripStartDate = await getTripStartDate();

      // Merge existing notes with updates
      const updatedNotes: ItineraryItemNotes & { flightId: string; loungeAccess?: boolean } = {
        ...existingNotes,
        type: 'flight',
        flightId,
        airline: input.airline ?? existingNotes.airline,
        flightNumber: input.flightNumber ?? existingNotes.flightNumber,
        from: input.from ?? existingNotes.from,
        to: input.to ?? existingNotes.to,
        departureDate: input.departureDate ?? existingNotes.departureDate,
        departureTime: input.departureTime ?? existingNotes.departureTime,
        arrivalDate: input.arrivalDate ?? existingNotes.arrivalDate,
        arrivalTime: input.arrivalTime ?? existingNotes.arrivalTime,
        confirmationNumber: input.confirmationNumber ?? existingNotes.confirmationNumber,
        terminal: input.terminal ?? existingNotes.terminal,
        gate: input.gate ?? existingNotes.gate,
        seatNumber: input.seatNumber ?? existingNotes.seatNumber,
        loungeAccess: input.loungeAccess ?? existingNotes.loungeAccess,
        notes: input.notes ?? existingNotes.notes,
      };

      // Calculate new day if departure date changed
      const newDepartureDate = input.departureDate ?? existingNotes.departureDate;
      const newDay = newDepartureDate
        ? calculateDayNumber(tripStartDate, newDepartureDate)
        : flightItem.day;

      // Update the itinerary item
      const { error: updateError } = await supabase
        .from('itinerary_items')
        .update({
          day: newDay,
          time: input.departureTime ?? flightItem.time,
          title: `${updatedNotes.airline} ${updatedNotes.flightNumber}: ${updatedNotes.from} → ${updatedNotes.to}`,
          description: `Departure: ${updatedNotes.departureTime}, Arrival: ${updatedNotes.arrivalTime}`,
          notes: stringifyItineraryNotes(updatedNotes),
        })
        .eq('id', flightItem.id);

      if (updateError) throw updateError;

      // Handle lounge access changes
      const hadLoungeAccess = existingNotes.loungeAccess;
      const hasLoungeAccess = input.loungeAccess ?? hadLoungeAccess;

      if (hasLoungeAccess && !hadLoungeAccess) {
        // Add lounge activity
        const flight: Flight = {
          id: flightId,
          tripId,
          airline: updatedNotes.airline || '',
          flightNumber: updatedNotes.flightNumber || '',
          from: updatedNotes.from || '',
          to: updatedNotes.to || '',
          departureDate: updatedNotes.departureDate || '',
          departureTime: updatedNotes.departureTime || '',
          arrivalDate: updatedNotes.arrivalDate || '',
          arrivalTime: updatedNotes.arrivalTime || '',
        };
        await createLoungeActivityItem(flight, tripStartDate);
      } else if (!hasLoungeAccess && hadLoungeAccess) {
        // Remove lounge activity
        await deleteLoungeActivityItems(flightId);
      }

      // Refresh the flights list
      await fetchFlights();

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update flight';
      console.error('Error updating flight:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tripId, user, getTripStartDate, createLoungeActivityItem, deleteLoungeActivityItems, fetchFlights]);

  /**
   * Delete a flight and its associated itinerary items
   */
  const deleteFlight = useCallback(async (flightId: string): Promise<boolean> => {
    if (!tripId || !user) {
      setError('Trip ID and user are required');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      // Find the flight itinerary item
      const { data: items } = await supabase
        .from('itinerary_items')
        .select('id, notes')
        .eq('trip_id', tripId);

      const flightItem = (items || []).find((item: { id: string; notes: string | null }) => {
        const notes = parseItineraryNotes(item.notes);
        return notes?.type === 'flight' && notes?.flightId === flightId;
      });

      if (!flightItem) {
        throw new Error('Flight not found');
      }

      // Delete lounge activity items first
      await deleteLoungeActivityItems(flightId);

      // Delete the flight itinerary item
      const { error: deleteError } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', flightItem.id);

      if (deleteError) throw deleteError;

      // Refresh the flights list
      await fetchFlights();

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete flight';
      console.error('Error deleting flight:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tripId, user, deleteLoungeActivityItems, fetchFlights]);

  // Initial fetch when tripId changes
  useEffect(() => {
    fetchFlights();
  }, [fetchFlights]);

  return {
    flights,
    loading,
    error,
    createFlight,
    updateFlight,
    deleteFlight,
    refreshFlights: fetchFlights,
  };
}
