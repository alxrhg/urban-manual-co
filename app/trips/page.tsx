import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { PageLoader } from '@/components/LoadingStates';
import TripsPageClient, { type TripWithStats } from './page-client';
import TripsUnauthenticated from './unauthenticated';
import type { TripStats } from '@/lib/trip';

// Revalidate trips list every minute for fresher trip data
export const revalidate = 60;

/**
 * Categorize an itinerary item based on its notes
 */
function categorizeItem(notes: string | null): keyof TripStats | null {
  if (!notes) return 'places';

  try {
    const parsed = JSON.parse(notes);
    const type = parsed?.type?.toLowerCase();
    const category = parsed?.category?.toLowerCase();

    // Flight detection
    if (type === 'flight') return 'flights';

    // Hotel detection
    if (type === 'hotel' || parsed?.isHotel) return 'hotels';

    // Restaurant detection
    if (type === 'restaurant' || type === 'breakfast' || type === 'meal') return 'restaurants';
    if (category === 'restaurant' || category === 'cafe' || category === 'bar' ||
        category === 'coffee' || category === 'bakery' || category === 'food') {
      return 'restaurants';
    }

    // Everything else is a place
    return 'places';
  } catch {
    return 'places';
  }
}

async function getTripsData(userId: string): Promise<TripWithStats[]> {
  const supabase = await createServerClient();

  // Fetch trips
  const { data: tripsData, error: tripsError } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (tripsError) {
    console.error('Error fetching trips:', tripsError);
    return [];
  }

  if (!tripsData || tripsData.length === 0) {
    return [];
  }

  // Fetch items for each trip
  const tripIds = tripsData.map(t => t.id);

  const { data: items } = await supabase
    .from('itinerary_items')
    .select('trip_id, notes')
    .in('trip_id', tripIds);

  // Calculate categorized stats for each trip
  const tripsWithStats: TripWithStats[] = tripsData.map(trip => {
    const tripItems = items?.filter(i => i.trip_id === trip.id) || [];

    // Initialize stats
    const stats: TripStats = {
      flights: 0,
      hotels: 0,
      restaurants: 0,
      places: 0,
    };

    // Categorize each item
    tripItems.forEach(item => {
      const category = categorizeItem(item.notes);
      if (category) {
        stats[category]++;
      }
    });

    return {
      ...trip,
      stats,
    };
  });

  return tripsWithStats;
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
  const trips = await getTripsData(user.id);

  return (
    <Suspense fallback={<PageLoader />}>
      <TripsPageClient initialTrips={trips} userId={user.id} />
    </Suspense>
  );
}
