import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, MapPin, Calendar, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import type { Trip } from '@/types/trip';
import TripsUnauthenticated from './unauthenticated';

// Rebuild: Minimal Trip Index
// Focus: Clean grid, square cards, minimal metadata

export const dynamic = 'force-dynamic';

async function getTrips(userId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export default async function TripsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <TripsUnauthenticated />;
  }

  const trips = await getTrips(user.id);

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-gray-950 px-4 sm:px-6 md:px-8 py-24 sm:py-32 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-end justify-between mb-16 sm:mb-24">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-medium text-stone-900 dark:text-white mb-4">
              Your Travels
            </h1>
            <p className="text-stone-500 dark:text-gray-400 font-light text-lg max-w-md">
              Curated itineraries and saved journeys.
            </p>
          </div>
          <Link
            href="/trips/new"
            className="hidden sm:flex items-center gap-2 px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Start New Trip
          </Link>
        </header>

        {trips.length === 0 ? (
          <div className="border border-dashed border-stone-300 dark:border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-stone-500 mb-6">No trips yet.</p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-sm font-medium"
            >
              Plan your first journey
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}

            {/* Create New Card (Mobile/Desktop Grid) */}
            <Link
              href="/trips/new"
              className="group relative aspect-square flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-900 border border-dashed border-stone-200 dark:border-gray-800 rounded-none hover:border-stone-400 dark:hover:border-gray-600 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-stone-50 dark:bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-6 h-6 text-stone-400 dark:text-gray-500" />
              </div>
              <span className="text-sm font-medium text-stone-500 dark:text-gray-400">Create new trip</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const days = calculateTripDays(trip.start_date, trip.end_date);
  const dates = formatTripDateRange(trip.start_date, trip.end_date);
  const destinations = JSON.parse(trip.destination || '[]').join(', ') || 'No destination';

  return (
    <Link href={`/trips/${trip.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-stone-200 dark:bg-gray-800 mb-4">
        {trip.cover_image ? (
          <Image
            src={trip.cover_image}
            alt={trip.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-gray-900">
            <MapPin className="w-8 h-8 text-stone-300 dark:text-gray-700" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-xl font-medium text-stone-900 dark:text-white leading-tight mb-1 group-hover:underline decoration-1 underline-offset-4">
            {trip.title}
          </h3>
          <p className="text-sm text-stone-500 dark:text-gray-400 font-light flex items-center gap-3">
            <span>{destinations}</span>
            <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-700" />
            <span>{days} days</span>
          </p>
        </div>

        {/* Arrow appears on hover */}
        <ArrowRight className="w-5 h-5 text-stone-900 dark:text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
      </div>
    </Link>
  );
}
