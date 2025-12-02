'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import type { Trip, ItineraryItem, TripPresence, TripCollaborator, TripAccess } from '@/types/trip';
import { parseItineraryNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import { calculateTripDays, addDaysToDate } from '@/lib/utils/time-calculations';

export interface TripDay {
  dayNumber: number;
  date: string | null;
  items: EnrichedItineraryItem[];
}

export interface EnrichedItineraryItem extends ItineraryItem {
  destination?: Destination;
  parsedNotes?: ReturnType<typeof parseItineraryNotes>;
}

interface UseRealtimeTripOptions {
  tripId: string;
  userId: string | undefined;
  userName?: string;
  userAvatar?: string;
  shareToken?: string; // For shared link access
  onError?: (error: Error) => void;
  onPresenceChange?: (presence: TripPresence[]) => void;
  onCollaboratorJoined?: (collaborator: TripCollaborator) => void;
}

/**
 * useRealtimeTrip - Hook for real-time collaborative trip editing
 * Extends useTripEditor with Supabase Realtime subscriptions
 */
export function useRealtimeTrip({
  tripId,
  userId,
  userName,
  userAvatar,
  shareToken,
  onError,
  onPresenceChange,
  onCollaboratorJoined,
}: UseRealtimeTripOptions) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [access, setAccess] = useState<TripAccess | null>(null);
  const [presence, setPresence] = useState<TripPresence[]>([]);
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const destinationsMapRef = useRef<Record<string, Destination>>({});
  const supabaseRef = useRef(createClient());

  // Fetch destinations for enrichment
  const fetchDestinations = useCallback(async (slugs: string[]) => {
    if (slugs.length === 0) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    const newSlugs = slugs.filter(s => !destinationsMapRef.current[s]);
    if (newSlugs.length === 0) return;

    const { data: destinations } = await supabase
      .from('destinations')
      .select('slug, name, city, neighborhood, category, description, image, image_thumbnail, latitude, longitude, rating, user_ratings_total, michelin_stars, price_level, formatted_address, website')
      .in('slug', newSlugs);

    destinations?.forEach((d) => {
      destinationsMapRef.current[d.slug] = d;
    });
  }, []);

  // Build days array from items
  const buildDays = useCallback((tripData: Trip, items: ItineraryItem[]): TripDay[] => {
    const numDays = calculateTripDays(tripData.start_date, tripData.end_date);
    const daysArray: TripDay[] = [];

    for (let i = 1; i <= Math.max(numDays, 1); i++) {
      const dayItems = items
        .filter((item) => item.day === i)
        .sort((a, b) => a.order_index - b.order_index)
        .map((item) => ({
          ...item,
          destination: item.destination_slug
            ? destinationsMapRef.current[item.destination_slug]
            : undefined,
          parsedNotes: parseItineraryNotes(item.notes),
        }));

      daysArray.push({
        dayNumber: i,
        date: tripData.start_date ? addDaysToDate(tripData.start_date, i - 1) : null,
        items: dayItems,
      });
    }

    return daysArray;
  }, []);

  // Fetch trip data
  const fetchTrip = useCallback(async () => {
    if (!tripId) return;

    try {
      setLoading(true);

      // Use share token endpoint if no userId
      if (shareToken && !userId) {
        const response = await fetch(`/api/trips/shared/${shareToken}`);
        if (!response.ok) throw new Error('Failed to fetch shared trip');

        const data = await response.json();
        setTrip(data.trip);
        setAccess(data.access);

        const slugs = (data.items || [])
          .map((i: ItineraryItem) => i.destination_slug)
          .filter((s: string | null): s is string => Boolean(s));

        await fetchDestinations(slugs);

        // Build days with enriched items
        data.items?.forEach((item: any) => {
          if (item.destination) {
            destinationsMapRef.current[item.destination_slug] = item.destination;
          }
        });

        setDays(buildDays(data.trip, data.items || []));
        return;
      }

      const supabase = supabaseRef.current;
      if (!supabase) return;

      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (tripError) throw tripError;
      if (!tripData) throw new Error('Trip not found');

      setTrip(tripData);

      // Determine access level
      if (tripData.user_id === userId) {
        setAccess({ canView: true, canEdit: true, accessType: 'owner', role: 'owner' });
      } else {
        // Check collaborator status
        const { data: collab } = await supabase
          .from('trip_collaborators')
          .select('role')
          .eq('trip_id', tripId)
          .eq('user_id', userId)
          .eq('status', 'accepted')
          .single();

        if (collab) {
          setAccess({
            canView: true,
            canEdit: collab.role === 'editor',
            accessType: 'collaborator',
            role: collab.role,
          });
        } else {
          setAccess({ canView: true, canEdit: false, accessType: 'public' });
        }
      }

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .from('itinerary_items')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch destinations
      const slugs = (items || [])
        .map((i) => i.destination_slug)
        .filter((s): s is string => Boolean(s));
      await fetchDestinations(slugs);

      setDays(buildDays(tripData, items || []));

      // Fetch collaborators
      const { data: collabs } = await supabase
        .from('trip_collaborators')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'accepted');

      setCollaborators(collabs || []);
    } catch (err) {
      console.error('Error fetching trip:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to fetch trip'));
    } finally {
      setLoading(false);
    }
  }, [tripId, userId, shareToken, fetchDestinations, buildDays, onError]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!tripId) return;

    const supabase = supabaseRef.current;
    if (!supabase) return;

    // Create channel for this trip
    const channel = supabase.channel(`trip:${tripId}`, {
      config: {
        presence: {
          key: userId || 'anonymous',
        },
      },
    });

    // Subscribe to trip changes
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTrip((prev) => (prev ? { ...prev, ...payload.new } : null));
            // Rebuild days if dates changed
            if (payload.new.start_date !== payload.old?.start_date ||
                payload.new.end_date !== payload.old?.end_date) {
              setDays((prevDays) => {
                if (!trip) return prevDays;
                const allItems = prevDays.flatMap((d) => d.items);
                return buildDays({ ...trip, ...payload.new }, allItems);
              });
            }
          }
        }
      )
      // Subscribe to itinerary item changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itinerary_items',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ItineraryItem;

            // Fetch destination if needed
            if (newItem.destination_slug && !destinationsMapRef.current[newItem.destination_slug]) {
              await fetchDestinations([newItem.destination_slug]);
            }

            setDays((prevDays) =>
              prevDays.map((d) =>
                d.dayNumber === newItem.day
                  ? {
                      ...d,
                      items: [...d.items, {
                        ...newItem,
                        destination: newItem.destination_slug
                          ? destinationsMapRef.current[newItem.destination_slug]
                          : undefined,
                        parsedNotes: parseItineraryNotes(newItem.notes),
                      }].sort((a, b) => a.order_index - b.order_index),
                    }
                  : d
              )
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as ItineraryItem;
            const oldItem = payload.old as ItineraryItem;

            setDays((prevDays) => {
              // Remove from old day if day changed
              let newDays = prevDays;
              if (oldItem.day !== updatedItem.day) {
                newDays = newDays.map((d) =>
                  d.dayNumber === oldItem.day
                    ? { ...d, items: d.items.filter((i) => i.id !== updatedItem.id) }
                    : d
                );
              }

              // Update or add to new day
              return newDays.map((d) =>
                d.dayNumber === updatedItem.day
                  ? {
                      ...d,
                      items: d.items.some((i) => i.id === updatedItem.id)
                        ? d.items.map((i) =>
                            i.id === updatedItem.id
                              ? {
                                  ...updatedItem,
                                  destination: updatedItem.destination_slug
                                    ? destinationsMapRef.current[updatedItem.destination_slug]
                                    : undefined,
                                  parsedNotes: parseItineraryNotes(updatedItem.notes),
                                }
                              : i
                          )
                        : [...d.items, {
                            ...updatedItem,
                            destination: updatedItem.destination_slug
                              ? destinationsMapRef.current[updatedItem.destination_slug]
                              : undefined,
                            parsedNotes: parseItineraryNotes(updatedItem.notes),
                          }],
                    }
                  : d
              ).map((d) => ({
                ...d,
                items: d.items.sort((a, b) => a.order_index - b.order_index),
              }));
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedItem = payload.old as ItineraryItem;
            setDays((prevDays) =>
              prevDays.map((d) => ({
                ...d,
                items: d.items.filter((i) => i.id !== deletedItem.id),
              }))
            );
          }
        }
      )
      // Subscribe to collaborator changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_collaborators',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const collab = payload.new as TripCollaborator;
            if (collab.status === 'accepted') {
              setCollaborators((prev) => {
                const exists = prev.some((c) => c.id === collab.id);
                if (exists) {
                  return prev.map((c) => (c.id === collab.id ? collab : c));
                }
                onCollaboratorJoined?.(collab);
                return [...prev, collab];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as TripCollaborator;
            setCollaborators((prev) => prev.filter((c) => c.id !== deleted.id));
          }
        }
      )
      // Setup presence
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<TripPresence>();
        const presenceList = Object.values(state).flat() as TripPresence[];
        setPresence(presenceList);
        onPresenceChange?.(presenceList);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const typedPresences = newPresences as unknown as TripPresence[];
        setPresence((prev) => [...prev, ...typedPresences]);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const typedPresences = leftPresences as unknown as TripPresence[];
        const leftIds = typedPresences.map((p) => p.userId);
        setPresence((prev) => prev.filter((p) => !leftIds.includes(p.userId)));
      });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);

        // Track presence if user is logged in
        if (userId) {
          await channel.track({
            userId: userId,
            userName: userName || 'Anonymous',
            userAvatar: userAvatar,
            lastSeen: new Date().toISOString(),
            isActive: true,
          });
        }
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    // Initial fetch
    fetchTrip();

    // Cleanup
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [tripId, userId, userName, userAvatar, fetchTrip, buildDays, fetchDestinations, onPresenceChange, onCollaboratorJoined]);

  // Update presence when user changes day
  const updatePresence = useCallback(async (updates: Partial<TripPresence>) => {
    if (!channelRef.current || !userId) return;

    await channelRef.current.track({
      userId: userId,
      userName: userName || 'Anonymous',
      userAvatar: userAvatar,
      lastSeen: new Date().toISOString(),
      isActive: true,
      ...updates,
    });
  }, [userId, userName, userAvatar]);

  // Check if user can edit
  const canEdit = access?.canEdit ?? false;

  // CRUD operations (only if canEdit)
  const updateTrip = useCallback(async (updates: Partial<Trip>) => {
    if (!trip || !canEdit) return;

    try {
      setSaving(true);
      const supabase = supabaseRef.current;
      if (!supabase) return;

      const { error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', trip.id);

      if (error) throw error;
      // Realtime will update the state
    } catch (err) {
      console.error('Error updating trip:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to update trip'));
    } finally {
      setSaving(false);
    }
  }, [trip, canEdit, onError]);

  const addItem = useCallback(async (item: Omit<ItineraryItem, 'id' | 'created_at'>) => {
    if (!trip || !canEdit) return;

    try {
      setSaving(true);
      const supabase = supabaseRef.current;
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .insert(item);

      if (error) throw error;
      // Realtime will update the state
    } catch (err) {
      console.error('Error adding item:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to add item'));
    } finally {
      setSaving(false);
    }
  }, [trip, canEdit, onError]);

  const updateItem = useCallback(async (itemId: string, updates: Partial<ItineraryItem>) => {
    if (!canEdit) return;

    try {
      const supabase = supabaseRef.current;
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;
      // Realtime will update the state
    } catch (err) {
      console.error('Error updating item:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to update item'));
    }
  }, [canEdit, onError]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!canEdit) return;

    try {
      setSaving(true);
      const supabase = supabaseRef.current;
      if (!supabase) return;

      const { error } = await supabase
        .from('itinerary_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      // Realtime will update the state
    } catch (err) {
      console.error('Error removing item:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to remove item'));
    } finally {
      setSaving(false);
    }
  }, [canEdit, onError]);

  const reorderItems = useCallback(async (dayNumber: number, itemIds: string[]) => {
    if (!canEdit) return;

    try {
      const supabase = supabaseRef.current;
      if (!supabase) return;

      // Update each item's order_index
      for (let i = 0; i < itemIds.length; i++) {
        const { error } = await supabase
          .from('itinerary_items')
          .update({ order_index: i })
          .eq('id', itemIds[i]);

        if (error) throw error;
      }
      // Realtime will update the state
    } catch (err) {
      console.error('Error reordering items:', err);
      onError?.(err instanceof Error ? err : new Error('Failed to reorder items'));
    }
  }, [canEdit, onError]);

  return {
    // Data
    trip,
    days,
    access,
    collaborators,
    presence,

    // State
    loading,
    saving,
    isConnected,
    canEdit,

    // Actions
    updateTrip,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    updatePresence,
    refresh: fetchTrip,
  };
}
