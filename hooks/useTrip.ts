'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { Trip, ItineraryItem } from '@/types/trip';

interface Day {
  date: string;
  city: string;
  meals: {
    breakfast?: any;
    lunch?: any;
    dinner?: any;
  };
  activities: any[];
  hotel?: any;
}

interface TripWithDays extends Trip {
  days: Day[];
}

export function useTrip(tripId: string | null) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripWithDays | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId || !user) {
      setTrip(null);
      setLoading(false);
      return;
    }

    async function fetchTrip() {
      try {
        setLoading(true);
        setError(null);
        const supabaseClient = createClient();
        if (!supabaseClient) return;

        // Fetch trip
        if (!user?.id) {
          setTrip(null);
          setLoading(false);
          return;
        }

        const { data: tripData, error: tripError } = await supabaseClient
          .from('trips')
          .select('*')
          .eq('id', tripId)
          .eq('user_id', user.id)
          .single();

        if (tripError) throw tripError;
        if (!tripData) {
          setTrip(null);
          setLoading(false);
          return;
        }

        // Fetch itinerary items
        const { data: items, error: itemsError } = await supabaseClient
          .from('itinerary_items')
          .select('*')
          .eq('trip_id', tripId)
          .order('day', { ascending: true })
          .order('order_index', { ascending: true });

        if (itemsError) throw itemsError;

        // Fetch destination data for items that have destination_slug
        const destinationSlugs = (items || [])
          .map(item => item.destination_slug)
          .filter((slug): slug is string => Boolean(slug));

        const destinationsMap = new Map<string, any>();
        if (destinationSlugs.length > 0) {
          const { data: destinations, error: destError } = await supabaseClient
            .from('destinations')
            .select('slug, latitude, longitude, name, image, image_thumbnail')
            .in('slug', destinationSlugs);

          if (!destError && destinations) {
            destinations.forEach(dest => {
              destinationsMap.set(dest.slug, dest);
            });
          }
        }

        // Group items by day and transform to Day format
        const itemsByDay = new Map<number, ItineraryItem[]>();
        (items || []).forEach((item) => {
          const day = item.day;
          if (!itemsByDay.has(day)) {
            itemsByDay.set(day, []);
          }
          itemsByDay.get(day)!.push(item);
        });

        // Calculate date range
        const startDate = tripData.start_date ? new Date(tripData.start_date) : null;
        const endDate = tripData.end_date ? new Date(tripData.end_date) : null;

        // Create days array
        const days: Day[] = [];
        const maxDay = Math.max(...Array.from(itemsByDay.keys()), 0);
        
        for (let dayNum = 1; dayNum <= Math.max(maxDay, 1); dayNum++) {
          const dayItems = itemsByDay.get(dayNum) || [];
          const dayDate = startDate
            ? new Date(startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000)
            : new Date();

          // Enrich items with destination data
          const enrichedItems = dayItems.map(item => {
            const dest = item.destination_slug ? destinationsMap.get(item.destination_slug) : null;
            return {
              ...item,
              latitude: dest?.latitude || null,
              longitude: dest?.longitude || null,
              image: dest?.image || null,
              image_thumbnail: dest?.image_thumbnail || null,
            };
          });

          // Group items by meal type (simplified - would need more logic for actual meal detection)
          const meals = {
            breakfast: enrichedItems.find((item) => item.time?.includes('breakfast') || item.title.toLowerCase().includes('breakfast')) || null,
            lunch: enrichedItems.find((item) => item.time?.includes('lunch') || item.title.toLowerCase().includes('lunch')) || null,
            dinner: enrichedItems.find((item) => item.time?.includes('dinner') || item.title.toLowerCase().includes('dinner')) || null,
          };

          // Activities are non-meal items
          const activities = enrichedItems.filter(
            (item) =>
              !item.time?.includes('breakfast') &&
              !item.time?.includes('lunch') &&
              !item.time?.includes('dinner') &&
              !item.title.toLowerCase().includes('breakfast') &&
              !item.title.toLowerCase().includes('lunch') &&
              !item.title.toLowerCase().includes('dinner')
          );

          days.push({
            date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            city: tripData.destination || 'Unknown',
            meals,
            activities,
            hotel: null, // Would need to fetch hotels separately
          });
        }

        setTrip({
          ...tripData,
          days,
        } as TripWithDays);
      } catch (err: any) {
        console.error('Error fetching trip:', err);
        setError(err.message || 'Failed to fetch trip');
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [tripId, user]);

  return { trip, loading, error };
}

