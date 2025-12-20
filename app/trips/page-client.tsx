'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Plus, MapPin, Calendar } from 'lucide-react';
import { formatDestinationsFromField } from '@/types/trip';
import {
  getTripState,
  getTotalItems,
  type TripStats as TripStatsType,
} from '@/lib/trip';
import type { Trip } from '@/types/trip';
import TripSetupWizard from '@/features/trip/components/TripSetupWizard';

export interface TripWithStats extends Trip {
  stats: TripStatsType;
  mapCenter?: { lat: number; lng: number } | null;
}

interface TripsPageClientProps {
  initialTrips: TripWithStats[];
  userId: string;
}

type FilterTab = 'all' | 'upcoming' | 'past';

/**
 * TripsPageClient - Trips list with filter tabs
 */
export default function TripsPageClient({ initialTrips, userId }: TripsPageClientProps) {
  const router = useRouter();
  const [trips] = useState<TripWithStats[]>(initialTrips);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showWizard, setShowWizard] = useState(false);

  // Categorize trips by state
  const categorizedTrips = useMemo(() => {
    const upcoming: TripWithStats[] = [];
    const past: TripWithStats[] = [];

    trips.forEach((trip) => {
      const state = getTripState(trip.end_date, trip.start_date, trip.stats);
      if (state === 'past') {
        past.push(trip);
      } else {
        upcoming.push(trip);
      }
    });

    // Sort upcoming by start date (soonest first)
    upcoming.sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return dateA - dateB;
    });

    // Sort past by end date (most recent first)
    past.sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date).getTime() : 0;
      const dateB = b.end_date ? new Date(b.end_date).getTime() : 0;
      return dateB - dateA;
    });

    return { upcoming, past };
  }, [trips]);

  // Filter trips based on active tab
  const filteredTrips = useMemo(() => {
    switch (activeFilter) {
      case 'upcoming':
        return categorizedTrips.upcoming;
      case 'past':
        return categorizedTrips.past;
      default:
        return [...categorizedTrips.upcoming, ...categorizedTrips.past];
    }
  }, [activeFilter, categorizedTrips]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: trips.length,
    upcoming: categorizedTrips.upcoming.length,
    past: categorizedTrips.past.length,
  }), [trips.length, categorizedTrips]);

  // Create trip with wizard data
  const handleCreateTrip = useCallback(async (data: {
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
  }) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const { data: trip, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title: data.title,
          destination: data.destination || null,
          start_date: data.startDate || null,
          end_date: data.endDate || null,
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (trip) {
        setShowWizard(false);
        router.push(`/trips/${trip.id}`);
      }
    } catch (err) {
      console.error('Error creating trip:', err);
      throw err;
    }
  }, [userId, router]);

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="w-full">
        {/* Header - Matches account page style */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-light">Trips</h1>
            <button
              onClick={() => setShowWizard(true)}
              className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Trip
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
          </p>
        </div>

        {/* Tab Navigation - Minimal, matches account page style */}
        {categorizedTrips.upcoming.length > 0 && categorizedTrips.past.length > 0 && (
          <div className="mb-12">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              {(['all', 'upcoming', 'past'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`transition-all ${
                    activeFilter === tab
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State - No trips at all */
          <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <MapPin className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No trips yet</p>
            <button
              onClick={() => setShowWizard(true)}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-medium rounded-2xl hover:opacity-80 transition-opacity"
            >
              Create your first trip
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* Empty State - Filter has no results */
          <div className="text-center py-12">
            <p className="text-xs text-gray-500">
              No {activeFilter === 'upcoming' ? 'upcoming' : 'past'} trips
            </p>
          </div>
        ) : (
          /* Trip Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>

      {/* Trip Setup Wizard */}
      <TripSetupWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreate={handleCreateTrip}
      />
    </main>
  );
}

/**
 * Trip Card - matches account page trip card style
 */
function TripCard({ trip }: { trip: TripWithStats }) {
  const state = getTripState(trip.end_date, trip.start_date, trip.stats);
  const destinations = formatDestinationsFromField(trip.destination);
  const totalItems = getTotalItems(trip.stats);

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <div className="text-left p-4 flex-1">
        <h3 className="font-medium text-sm mb-2 line-clamp-2">{trip.title}</h3>
        {trip.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{trip.description}</p>
        )}
        <div className="space-y-1 text-xs text-gray-400">
          {destinations && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>{destinations}</span>
            </div>
          )}
          {(trip.start_date || trip.end_date) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>
                {trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                {trip.end_date && ` – ${new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            </div>
          )}
          {totalItems > 0 && (
            <div className="text-xs text-gray-400 pt-1">
              {totalItems} {totalItems === 1 ? 'place' : 'places'}
            </div>
          )}
          {state && (
            <div className="pt-1">
              <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                {state}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
