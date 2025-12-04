'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  Trip,
  ItineraryItem,
  parseItineraryNotes,
  parseTripNotes,
} from '@/types/trip';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Event types for real-time updates
 */
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Real-time change event
 */
export interface RealtimeChangeEvent<T = unknown> {
  type: RealtimeEventType;
  table: string;
  schema: string;
  old: T | null;
  new: T | null;
  timestamp: string;
}

/**
 * Callback for handling real-time changes
 */
export type RealtimeChangeHandler<T = unknown> = (event: RealtimeChangeEvent<T>) => void;

/**
 * Options for the useTripRealtime hook
 */
export interface UseTripRealtimeOptions {
  /**
   * Whether to show toasts for collaborator changes
   * @default true
   */
  showToasts?: boolean;
  /**
   * Callback when trip settings change
   */
  onTripChange?: RealtimeChangeHandler<Trip>;
  /**
   * Callback when itinerary items change
   */
  onItineraryItemChange?: RealtimeChangeHandler<ItineraryItem>;
  /**
   * Callback when any data changes (general handler)
   */
  onChange?: RealtimeChangeHandler;
}

interface UseTripRealtimeReturn {
  /**
   * Whether the real-time connection is active
   */
  connected: boolean;
  /**
   * Any error that occurred with the connection
   */
  error: string | null;
  /**
   * Last update timestamp
   */
  lastUpdate: Date | null;
  /**
   * Current trip data (synced in real-time)
   */
  trip: Trip | null;
  /**
   * Current itinerary items (synced in real-time)
   */
  itineraryItems: ItineraryItem[];
  /**
   * Manually refresh all data
   */
  refresh: () => Promise<void>;
  /**
   * Disconnect from real-time updates
   */
  disconnect: () => void;
  /**
   * Reconnect to real-time updates
   */
  reconnect: () => void;
}

/**
 * Get a friendly name for an itinerary item
 */
function getItemDisplayName(item: ItineraryItem): string {
  const notes = parseItineraryNotes(item.notes);

  if (notes?.type === 'flight') {
    return `${notes.airline || ''} ${notes.flightNumber || ''} flight`.trim();
  }

  if (notes?.type === 'hotel' || notes?.hotelBookingId) {
    return `${notes.name || item.title}`;
  }

  return item.title;
}

/**
 * Hook for real-time trip collaboration
 *
 * Subscribes to changes on:
 * - trips (settings changes)
 * - itinerary_items (flights, hotels, activities)
 *
 * When changes are detected:
 * - Updates local state automatically
 * - Shows toast notifications for collaborator changes
 */
export function useTripRealtime(
  tripId: string | null,
  options: UseTripRealtimeOptions = {}
): UseTripRealtimeReturn {
  const { user } = useAuth();
  const { info } = useToast();
  const { showToasts = true, onTripChange, onItineraryItemChange, onChange } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  /**
   * Fetch initial data
   */
  const fetchData = useCallback(async () => {
    if (!tripId || !user) {
      setTrip(null);
      setItineraryItems([]);
      return;
    }

    try {
      const supabase = supabaseRef.current;

      // Fetch trip and itinerary items in parallel
      const [tripResult, itemsResult] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .single(),
        supabase
          .from('itinerary_items')
          .select('*')
          .eq('trip_id', tripId)
          .order('day', { ascending: true })
          .order('order_index', { ascending: true }),
      ]);

      if (tripResult.error) throw tripResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setTrip(tripResult.data);
      setItineraryItems(itemsResult.data || []);
      setLastUpdate(new Date());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch trip data';
      console.error('Error fetching trip data:', err);
      setError(errorMessage);
    }
  }, [tripId, user]);

  /**
   * Handle trip table changes
   */
  const handleTripChange = useCallback((
    payload: RealtimePostgresChangesPayload<Trip>
  ) => {
    const eventType = payload.eventType as RealtimeEventType;
    const newRecord = payload.new as Trip | null;
    const oldRecord = payload.old as Trip | null;

    const event: RealtimeChangeEvent<Trip> = {
      type: eventType,
      table: 'trips',
      schema: 'public',
      old: oldRecord,
      new: newRecord,
      timestamp: new Date().toISOString(),
    };

    // Call custom handler if provided
    onTripChange?.(event);
    onChange?.(event);

    // Update local state
    if (eventType === 'UPDATE' && newRecord) {
      setTrip(newRecord);
      setLastUpdate(new Date());

      // Show toast for collaborator changes
      if (showToasts && newRecord.user_id !== user?.id) {
        info('Trip settings were updated');
      }
    } else if (eventType === 'DELETE') {
      setTrip(null);
      setItineraryItems([]);

      if (showToasts) {
        info('This trip was deleted');
      }
    }
  }, [user?.id, showToasts, info, onTripChange, onChange]);

  /**
   * Handle itinerary_items table changes
   */
  const handleItineraryItemChange = useCallback((
    payload: RealtimePostgresChangesPayload<ItineraryItem>
  ) => {
    const eventType = payload.eventType as RealtimeEventType;
    const newRecord = payload.new as ItineraryItem | null;
    const oldRecord = payload.old as ItineraryItem | null;

    const event: RealtimeChangeEvent<ItineraryItem> = {
      type: eventType,
      table: 'itinerary_items',
      schema: 'public',
      old: oldRecord,
      new: newRecord,
      timestamp: new Date().toISOString(),
    };

    // Call custom handler if provided
    onItineraryItemChange?.(event);
    onChange?.(event);

    // Update local state
    setItineraryItems((current: ItineraryItem[]) => {
      let updated = [...current];

      if (eventType === 'INSERT' && newRecord) {
        // Add new item and sort
        updated.push(newRecord);
        updated.sort((a, b) => {
          const dayDiff = a.day - b.day;
          return dayDiff !== 0 ? dayDiff : a.order_index - b.order_index;
        });

        // Show toast for collaborator additions
        if (showToasts) {
          const itemName = getItemDisplayName(newRecord);
          info(`${itemName} was added to Day ${newRecord.day}`);
        }
      } else if (eventType === 'UPDATE' && newRecord) {
        // Update existing item
        const index = updated.findIndex((item) => item.id === newRecord.id);
        if (index !== -1) {
          updated[index] = newRecord;
        }
        // Re-sort in case day or order changed
        updated.sort((a, b) => {
          const dayDiff = a.day - b.day;
          return dayDiff !== 0 ? dayDiff : a.order_index - b.order_index;
        });

        if (showToasts) {
          const itemName = getItemDisplayName(newRecord);
          info(`${itemName} was updated`);
        }
      } else if (eventType === 'DELETE' && oldRecord) {
        // Remove deleted item
        updated = updated.filter((item) => item.id !== oldRecord.id);

        if (showToasts) {
          const itemName = getItemDisplayName(oldRecord);
          info(`${itemName} was removed`);
        }
      }

      return updated;
    });

    setLastUpdate(new Date());
  }, [showToasts, info, onItineraryItemChange, onChange]);

  /**
   * Set up real-time subscriptions
   */
  const setupSubscriptions = useCallback(() => {
    if (!tripId || !user) {
      return;
    }

    const supabase = supabaseRef.current;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    try {
      // Create a new channel for this trip
      const channel = supabase
        .channel(`trip-${tripId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trips',
            filter: `id=eq.${tripId}`,
          },
          handleTripChange
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'itinerary_items',
            filter: `trip_id=eq.${tripId}`,
          },
          handleItineraryItemChange
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setConnected(false);
            setError('Failed to connect to real-time updates');
          } else if (status === 'TIMED_OUT') {
            setConnected(false);
            setError('Real-time connection timed out');
          }
        });

      channelRef.current = channel;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set up real-time subscriptions';
      console.error('Error setting up real-time subscriptions:', err);
      setError(errorMessage);
      setConnected(false);
    }
  }, [tripId, user, handleTripChange, handleItineraryItemChange]);

  /**
   * Disconnect from real-time updates
   */
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      const supabase = supabaseRef.current;
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnected(false);
    }
  }, []);

  /**
   * Reconnect to real-time updates
   */
  const reconnect = useCallback(() => {
    disconnect();
    setupSubscriptions();
  }, [disconnect, setupSubscriptions]);

  /**
   * Refresh all data manually
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Set up subscriptions and fetch initial data when tripId changes
  useEffect(() => {
    if (tripId && user) {
      fetchData();
      setupSubscriptions();
    } else {
      disconnect();
      setTrip(null);
      setItineraryItems([]);
    }

    // Cleanup on unmount or tripId change
    return () => {
      disconnect();
    };
  }, [tripId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connected,
    error,
    lastUpdate,
    trip,
    itineraryItems,
    refresh,
    disconnect,
    reconnect,
  };
}
