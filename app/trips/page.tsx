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

  // Fetch items for each trip with destination coordinates
  const tripIds = tripsData.map(t => t.id);

  const { data: items } = await supabase
    .from('itinerary_items')
    .select(`
      trip_id,
      notes,
      destination_id,
      destinations:destination_id (
        latitude,
        longitude
      )
    `)
    .in('trip_id', tripIds);

  // Calculate categorized stats and map center for each trip
  const tripsWithStats: TripWithStats[] = tripsData.map(trip => {
    const tripItems = items?.filter(i => i.trip_id === trip.id) || [];

    // Initialize stats
    const stats: TripStats = {
      flights: 0,
      hotels: 0,
      restaurants: 0,
      places: 0,
    };

    // Collect coordinates for map center
    const coords: { lat: number; lng: number }[] = [];

    // Categorize each item and extract coordinates
    tripItems.forEach(item => {
      const category = categorizeItem(item.notes);
      if (category) {
        stats[category]++;
      }

      // Get coordinates from destination or parsed notes
      const dest = item.destinations as { latitude?: number; longitude?: number } | null;
      if (dest?.latitude && dest?.longitude) {
        coords.push({ lat: dest.latitude, lng: dest.longitude });
      } else if (item.notes) {
        try {
          const parsed = JSON.parse(item.notes);
          if (parsed?.latitude && parsed?.longitude) {
            coords.push({ lat: parsed.latitude, lng: parsed.longitude });
          }
        } catch {}
      }
    });

    // Calculate map center
    let mapCenter: { lat: number; lng: number } | null = null;
    if (coords.length > 0) {
      const sumLat = coords.reduce((sum, c) => sum + c.lat, 0);
      const sumLng = coords.reduce((sum, c) => sum + c.lng, 0);
      mapCenter = {
        lat: sumLat / coords.length,
        lng: sumLng / coords.length,
      };
    }

    return {
      ...trip,
      stats,
      mapCenter,
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
