'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Trip as TripSchema, ItineraryItem, TripLocation, ItineraryItemNotes } from '@/types/trip';

// Simplified Trip interface for context (UI-friendly)
interface Trip {
  id: string;
  name: string;
  destination: string;
  locations: TripLocation[];
  start_date: string | null;
  end_date: string | null;
}

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  setActiveTrip: (tripId: string | null) => void;
  createTrip: (name: string, destination: string) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  refreshTrips: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTripState] = useState<Trip | null>(null);

  // Helper to parse notes from itinerary item
  const parseItemNotes = useCallback((notes: string | null): ItineraryItemNotes => {
    if (!notes) return {};
    try {
      return JSON.parse(notes) as ItineraryItemNotes;
    } catch {
      return { raw: notes };
    }
  }, []);

  // Transform itinerary items to TripLocation format
  const transformItemToLocation = useCallback((item: ItineraryItem, tripDestination: string, index: number): TripLocation => {
    const notesData = parseItemNotes(item.notes);
    return {
      id: parseInt(item.id.replace(/-/g, '').substring(0, 10), 16) || Date.now() + index,
      name: item.title,
      city: notesData.city || tripDestination || '',
      category: item.description || '',
      image: notesData.image || '/placeholder-image.jpg',
      time: item.time || undefined,
      notes: notesData.raw || undefined,
      duration: notesData.duration || undefined,
    };
  }, [parseItemNotes]);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setActiveTripState(null);
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Single optimized query with join - eliminates N+1 problem
      const { data: tripsData, error: tripsError } = await supabaseClient
        .from('trips')
        .select(`
          *,
          itinerary_items (
            id, title, description, day, order_index, time, notes
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      // Transform trips with their embedded itinerary items
      const tripsWithLocations = (tripsData || []).map((trip: TripSchema & { itinerary_items?: ItineraryItem[] }) => {
        const items = trip.itinerary_items || [];
        // Sort items by day and order_index (Supabase nested ordering may not work)
        const sortedItems = [...items].sort((a, b) => {
          const dayDiff = (a.day || 0) - (b.day || 0);
          if (dayDiff !== 0) return dayDiff;
          return (a.order_index || 0) - (b.order_index || 0);
        });

        const locations: TripLocation[] = sortedItems.map((item, index) =>
          transformItemToLocation(item, trip.destination || '', index)
        );

        return {
          id: trip.id,
          name: trip.title,
          destination: trip.destination || '',
          locations,
          start_date: trip.start_date || null,
          end_date: trip.end_date || null,
        };
      });

      setTrips(tripsWithLocations);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    }
  }, [user, transformItemToLocation]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    } else {
      setTrips([]);
      setActiveTripState(null);
    }
  }, [user]);

  const setActiveTrip = useCallback((tripId: string | null) => {
    if (!tripId) {
      setActiveTripState(null);
      return;
    }
    setActiveTripState(currentTrips => {
      const trip = trips.find((t) => t.id === tripId);
      return trip || null;
    });
  }, [trips]);

  const createTrip = useCallback(async (name: string, destination: string) => {
    if (!user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .insert({
          title: name,
          destination: destination || null,
          status: 'planning',
          user_id: user.id,
          is_public: false,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh trips list
      await fetchTrips();

      // Set as active trip
      if (data) {
        setActiveTrip(data.id);
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      throw error;
    }
  }, [user, fetchTrips, setActiveTrip]);

  const deleteTrip = useCallback(async (tripId: string) => {
    if (!user) return;

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Delete itinerary items first
      await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('trip_id', tripId);

      // Delete trip
      const { error } = await supabaseClient
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh trips list
      await fetchTrips();

      // Clear active trip if it was deleted
      setActiveTripState(current => current?.id === tripId ? null : current);
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  }, [user, fetchTrips]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    trips,
    activeTrip,
    setActiveTrip,
    createTrip,
    deleteTrip,
    refreshTrips: fetchTrips,
  }), [trips, activeTrip, setActiveTrip, createTrip, deleteTrip, fetchTrips]);

  return (
    <TripContext.Provider value={contextValue}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (context === undefined) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}



