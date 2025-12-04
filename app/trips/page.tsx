import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { PageLoader } from '@/components/LoadingStates';
import TripsPageClient, { type TripWithHealth } from './page-client';
import TripsUnauthenticated from './unauthenticated';

// Revalidate trips list every minute for fresher trip data
export const revalidate = 60;

async function getTripsData(userId: string): Promise<TripWithHealth[]> {
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

  // Fetch item counts for each trip
  const tripIds = tripsData.map(t => t.id);

  const { data: itemCounts } = await supabase
    .from('itinerary_items')
    .select('trip_id, notes')
    .in('trip_id', tripIds);

  // Calculate health metrics for each trip
  const tripsWithHealth: TripWithHealth[] = tripsData.map(trip => {
    const tripItems = itemCounts?.filter(i => i.trip_id === trip.id) || [];
    const itemCount = tripItems.length;

    // Check for hotels and flights in notes
    let hasHotel = false;
    let hasFlight = false;

    tripItems.forEach(item => {
      try {
        const notes = item.notes ? JSON.parse(item.notes) : null;
        if (notes?.type === 'hotel') hasHotel = true;
        if (notes?.type === 'flight') hasFlight = true;
      } catch {
        // Ignore parse errors
      }
    });

    return {
      ...trip,
      item_count: itemCount,
      has_hotel: hasHotel,
      has_flight: hasFlight,
    };
  });

  return tripsWithHealth;
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
