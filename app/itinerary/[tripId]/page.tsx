import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import ItineraryTimelineClient from '@/components/itinerary/ItineraryTimelineClient';
import { createServerClient } from '@/lib/supabase-server';

interface PageProps {
  params: {
    tripId: string;
  };
}

export const metadata: Metadata = {
  title: 'Itinerary Timeline — Urban Manual',
  description: 'Visualize each day of your trip with availability-aware scheduling and drag-and-drop editing.',
};

export default async function TripItineraryPage({ params }: PageProps) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?redirect=/itinerary/${params.tripId}`);
  }

  const tripId = Number(params.tripId);
  if (!Number.isFinite(tripId)) {
    notFound();
  }

  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, user_id, title, destination, start_date, end_date')
    .eq('id', tripId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load trip for itinerary timeline', error);
    throw error;
  }

  if (!trip || trip.user_id !== user.id) {
    notFound();
  }

  return (
    <div className="px-6 py-10 md:px-10">
      <ItineraryTimelineClient
        tripId={tripId}
        trip={{
          id: tripId,
          title: trip.title ?? 'My trip itinerary',
          destination: trip.destination,
          startDate: trip.start_date,
          endDate: trip.end_date,
        }}
      />
    </div>
  );
}
