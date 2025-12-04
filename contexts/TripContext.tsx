'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Trip as TripSchema, ItineraryItem, TripLocation, ItineraryItemNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import { stringifyItineraryNotes } from '@/types/trip';

// Storage key for persisting active trip
const ACTIVE_TRIP_STORAGE_KEY = 'urbanmanual_active_trip_id';

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return R * c; // Distance in km
}

// Simplified Trip interface for context (UI-friendly)
interface Trip {
  id: string;
  name: string;
  destination: string;
  locations: TripLocation[];
}

// Options for adding a destination to a trip
interface AddOptions {
  day?: number;
  time?: string;
  duration?: number;
  notes?: string;
}

// Day and time slot suggestion
interface DaySlot {
  day: number;
  suggestedTime: string;
  reason: string;
}

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  setActiveTrip: (tripId: string | null) => void;
  createTrip: (name: string, destination: string) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  refreshTrips: () => Promise<void>;

  // Quick actions
  addDestination: (slug: string, options?: AddOptions) => Promise<void>;
  removeDestination: (itemId: string) => Promise<void>;

  // Smart suggestions
  getSuggestedSlot: (destination: Destination) => DaySlot;
  getNearbyInTrip: (destination: Destination) => Destination[];
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTripState] = useState<Trip | null>(null);
  const [destinationsCache, setDestinationsCache] = useState<Map<string, Destination>>(new Map());
  const [pendingActiveTripId, setPendingActiveTripId] = useState<string | null>(null);

  // Load persisted active trip ID from localStorage on mount
  useEffect(() => {
    try {
      const storedTripId = localStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);
      if (storedTripId) {
        setPendingActiveTripId(storedTripId);
      }
    } catch (error) {
      console.error('Failed to load active trip from localStorage:', error);
    }
  }, []);

  // Restore active trip once trips are loaded
  useEffect(() => {
    if (pendingActiveTripId && trips.length > 0) {
      const trip = trips.find((t) => t.id === pendingActiveTripId);
      if (trip) {
        setActiveTripState(trip);
      } else {
        // Trip no longer exists, clear storage
        try {
          localStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
        } catch (error) {
          console.error('Failed to clear invalid trip from localStorage:', error);
        }
      }
      setPendingActiveTripId(null);
    }
  }, [pendingActiveTripId, trips]);

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
      // Clear from localStorage
      try {
        localStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear active trip from localStorage:', error);
      }
      return;
    }

    const trip = trips.find((t) => t.id === tripId);
    if (trip) {
      setActiveTripState(trip);
      // Persist to localStorage
      try {
        localStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, tripId);
      } catch (error) {
        console.error('Failed to persist active trip to localStorage:', error);
      }
    }
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
      setActiveTripState(current => {
        if (current?.id === tripId) {
          // Also clear from localStorage
          try {
            localStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
          } catch (err) {
            console.error('Failed to clear active trip from localStorage:', err);
          }
          return null;
        }
        return current;
      });
    } catch (error) {
      console.error('Error deleting trip:', error);
      throw error;
    }
  }, [user, fetchTrips]);

  // Fetch destination data by slug
  const fetchDestination = useCallback(async (slug: string): Promise<Destination | null> => {
    // Check cache first
    if (destinationsCache.has(slug)) {
      return destinationsCache.get(slug) || null;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return null;

      const { data, error } = await supabaseClient
        .from('destinations')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error || !data) return null;

      // Cache the result
      setDestinationsCache(prev => new Map(prev).set(slug, data));
      return data;
    } catch (error) {
      console.error('Error fetching destination:', error);
      return null;
    }
  }, [destinationsCache]);

  // Quick action: Add a destination to the active trip
  const addDestination = useCallback(async (slug: string, options?: AddOptions) => {
    if (!activeTrip || !user) {
      console.error('No active trip or user');
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      // Fetch destination data
      const destination = await fetchDestination(slug);
      if (!destination) {
        console.error('Destination not found:', slug);
        return;
      }

      // Determine the day to add to (default to day 1 or specified day)
      const dayNumber = options?.day ?? 1;

      // Get current items count for the day to determine order_index
      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', activeTrip.id)
        .eq('day', dayNumber)
        .order('order_index', { ascending: false })
        .limit(1);

      const orderIndex = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      // Build notes data
      const notesData: ItineraryItemNotes = {
        type: 'place',
        latitude: destination.latitude ?? undefined,
        longitude: destination.longitude ?? undefined,
        category: destination.category ?? undefined,
        image: destination.image_thumbnail || destination.image || undefined,
        duration: options?.duration,
        raw: options?.notes,
      };

      // Insert the itinerary item
      const { error } = await supabaseClient.from('itinerary_items').insert({
        trip_id: activeTrip.id,
        destination_slug: slug,
        day: dayNumber,
        order_index: orderIndex,
        time: options?.time || null,
        title: destination.name,
        description: destination.city,
        notes: stringifyItineraryNotes(notesData),
      });

      if (error) throw error;

      // Refresh trips to update locations
      await fetchTrips();
    } catch (error) {
      console.error('Error adding destination to trip:', error);
      throw error;
    }
  }, [activeTrip, user, fetchTrips, fetchDestination]);

  // Quick action: Remove a destination from the active trip
  const removeDestination = useCallback(async (itemId: string) => {
    if (!activeTrip || !user) {
      console.error('No active trip or user');
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { error } = await supabaseClient
        .from('itinerary_items')
        .delete()
        .eq('id', itemId)
        .eq('trip_id', activeTrip.id);

      if (error) throw error;

      // Refresh trips to update locations
      await fetchTrips();
    } catch (error) {
      console.error('Error removing destination from trip:', error);
      throw error;
    }
  }, [activeTrip, user, fetchTrips]);

  // Smart suggestion: Get a suggested day and time slot for a destination
  const getSuggestedSlot = useCallback((destination: Destination): DaySlot => {
    if (!activeTrip) {
      return { day: 1, suggestedTime: '10:00', reason: 'No active trip' };
    }

    const category = (destination.category || '').toLowerCase();
    const locations = activeTrip.locations;

    // Find destinations in the same city
    const sameCityLocations = locations.filter(
      loc => loc.city.toLowerCase() === (destination.city || '').toLowerCase()
    );

    // Determine suggested time based on category
    let suggestedTime = '10:00';
    let reason = 'Default morning slot';

    if (category.includes('breakfast') || category.includes('cafe')) {
      suggestedTime = '09:00';
      reason = 'Breakfast/cafe recommended for morning';
    } else if (category.includes('lunch') || category === 'restaurant') {
      suggestedTime = '12:30';
      reason = 'Lunch time recommendation';
    } else if (category.includes('dinner') || category.includes('bar')) {
      suggestedTime = '19:00';
      reason = 'Evening dining/drinks recommendation';
    } else if (category.includes('museum') || category.includes('gallery')) {
      suggestedTime = '14:00';
      reason = 'Afternoon museum visit';
    } else if (category.includes('hotel') || category.includes('accommodation')) {
      suggestedTime = '15:00';
      reason = 'Standard check-in time';
    }

    // Find the best day - prefer days with same-city locations
    let suggestedDay = 1;
    if (sameCityLocations.length > 0) {
      // Group existing locations by their implicit day (based on index)
      // For a more sophisticated approach, we'd need day info in TripLocation
      suggestedDay = 1;
      reason += ' - added with other locations in ' + destination.city;
    }

    // Check if destination has coordinates for proximity-based suggestions
    if (destination.latitude && destination.longitude && locations.length > 0) {
      const nearbyLocations = locations.filter(loc => {
        // This would require coordinates in TripLocation - simplified for now
        return loc.city.toLowerCase() === (destination.city || '').toLowerCase();
      });

      if (nearbyLocations.length > 0) {
        reason = `Near ${nearbyLocations[0].name} in your itinerary`;
      }
    }

    return {
      day: suggestedDay,
      suggestedTime,
      reason,
    };
  }, [activeTrip]);

  // Smart suggestion: Get nearby destinations already in the trip
  const getNearbyInTrip = useCallback((destination: Destination): Destination[] => {
    if (!activeTrip || !destination.latitude || !destination.longitude) {
      return [];
    }

    // Build a list of destinations from the trip's locations
    const tripDestinations: Destination[] = [];

    for (const location of activeTrip.locations) {
      const cached = destinationsCache.get(location.name);
      if (cached && cached.latitude && cached.longitude) {
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          destination.latitude,
          destination.longitude,
          cached.latitude,
          cached.longitude
        );

        // Include if within 2km
        if (distance <= 2) {
          tripDestinations.push(cached);
        }
      }
    }

    return tripDestinations;
  }, [activeTrip, destinationsCache]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    trips,
    activeTrip,
    setActiveTrip,
    createTrip,
    deleteTrip,
    refreshTrips: fetchTrips,
    addDestination,
    removeDestination,
    getSuggestedSlot,
    getNearbyInTrip,
  }), [trips, activeTrip, setActiveTrip, createTrip, deleteTrip, fetchTrips, addDestination, removeDestination, getSuggestedSlot, getNearbyInTrip]);

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



