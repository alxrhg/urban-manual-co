import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { PageLoader } from '@/components/LoadingStates';
import TripsPageClient, { type TripWithStats, type TripActivity } from './page-client';
import TripsUnauthenticated from './unauthenticated';
import type { TripStats } from '@/lib/trip';

// Revalidate trips list every minute for fresher trip data
export const revalidate = 60;

/**
 * Categorize an itinerary item based on its notes
 */
function categorizeItem(notes: string | null): { category: keyof TripStats; type: string } {
  if (!notes) return { category: 'places', type: 'place' };

  try {
    const parsed = JSON.parse(notes);
    const type = parsed?.type?.toLowerCase();
    const category = parsed?.category?.toLowerCase();

    // Flight detection
    if (type === 'flight') return { category: 'flights', type: 'flight' };

    // Hotel detection
    if (type === 'hotel' || parsed?.isHotel) return { category: 'hotels', type: 'hotel' };

    // Restaurant detection
    if (type === 'restaurant' || type === 'breakfast' || type === 'meal') {
      return { category: 'restaurants', type: type || 'restaurant' };
    }
    if (category === 'restaurant' || category === 'cafe' || category === 'bar' ||
        category === 'coffee' || category === 'bakery' || category === 'food') {
      return { category: 'restaurants', type: category };
    }

    // Activity types
    if (type === 'activity' || type === 'event' || type === 'custom') {
      return { category: 'places', type: type };
    }

    // Everything else is a place
    return { category: 'places', type: category || 'place' };
  } catch {
    return { category: 'places', type: 'place' };
  }
}

/**
 * Calculate the date for a trip day
 */
function getDateForDay(tripStartDate: string | null, day: number): string | null {
  if (!tripStartDate) return null;
  const start = new Date(tripStartDate);
  start.setDate(start.getDate() + (day - 1)); // day is 1-indexed
  return start.toISOString().split('T')[0];
}

interface TripDataResult {
  trips: TripWithStats[];
  activitiesByTrip: Record<string, TripActivity[]>;
}

async function getTripsData(userId: string): Promise<TripDataResult> {
  const supabase = await createServerClient();

  // Fetch trips
  const { data: tripsData, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
    return { trips: [], activitiesByTrip: {} };
  }

  if (!tripsData || tripsData.length === 0) {
    return { trips: [], activitiesByTrip: {} };
  }

  // Fetch items for each trip with more details
  const tripIds = tripsData.map(t => t.id);

  const { data: items } = await supabase
    .from('itinerary_items')
    .select('id, trip_id, day, time, title, notes')
    .in('trip_id', tripIds)
    .order('day', { ascending: true })
    .order('order_index', { ascending: true });

  // Build activities by trip and calculate stats
  const activitiesByTrip: Record<string, TripActivity[]> = {};

  const tripsWithStats: TripWithStats[] = tripsData.map(trip => {
    const tripItems = items?.filter(i => i.trip_id === trip.id) || [];

    // Initialize stats
    const stats: TripStats = {
      flights: 0,
      hotels: 0,
      restaurants: 0,
      places: 0,
    };

    // Build activities list for calendar view
    const activities: TripActivity[] = [];

    // Categorize each item
    tripItems.forEach(item => {
      const { category, type } = categorizeItem(item.notes);
      if (category) {
        stats[category]++;
      }

      // Calculate the actual date for this item
      const itemDate = getDateForDay(trip.start_date, item.day);

      if (itemDate) {
        activities.push({
          id: item.id,
          date: itemDate,
          day: item.day,
          type,
          title: item.title,
          time: item.time || undefined,
        });
      }
    });

    activitiesByTrip[trip.id] = activities;

    return {
      ...trip,
      stats,
    };
  });

  return { trips: tripsWithStats, activitiesByTrip };
}

export default async function TripsPage() {
  const supabase = await createServerClient();

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Show unauthenticated state
    return <TripsUnauthenticated />;
  }

  // Fetch trips data on the server
  const { trips, activitiesByTrip } = await getTripsData(user.id);

  return (
    <Suspense fallback={<PageLoader />}>
      <TripsPageClient
        initialTrips={trips}
        activitiesByTrip={activitiesByTrip}
        userId={user.id}
      />
    </Suspense>
  );
}
