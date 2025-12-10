'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Plus, Loader2, MapPin, Plane } from 'lucide-react';
import { formatTripDateRange } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';
import {
  getTripState,
  getTimeLabel,
  getTotalItems,
  type TripStats as TripStatsType,
} from '@/lib/trip';
import type { Trip } from '@/types/trip';
import TripSetupWizard from '@/components/trip/TripSetupWizard';

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
    <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">
            Trips
          </h1>

          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900
                       text-[13px] font-medium
                       hover:bg-gray-800 dark:hover:bg-gray-100
                       transition-all"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </button>
        </header>

        {/* Filter Tabs - only show when both upcoming AND past exist */}
        {categorizedTrips.upcoming.length > 0 && categorizedTrips.past.length > 0 && (
          <div className="flex gap-1 p-1 mb-6 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
            {(['all', 'upcoming', 'past'] as FilterTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`
                  px-4 py-2 rounded-lg text-[13px] font-medium transition-all
                  ${activeFilter === tab
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className={`ml-1.5 text-[11px] ${
                  activeFilter === tab ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State - No trips at all */
          <div className="text-center py-20">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-6 h-6 text-gray-400" />
            </div>
            <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white mb-2">
              No trips yet
            </h2>
            <p className="text-[14px] text-gray-500 mb-6 max-w-sm mx-auto">
              Create a trip to save places and plan your adventures
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                         bg-gray-900 dark:bg-white text-white dark:text-gray-900
                         text-[13px] font-medium
                         hover:bg-gray-800 dark:hover:bg-gray-100
                         transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Trip
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* Empty State - Filter has no results */
          <div className="text-center py-16">
            <p className="text-[14px] text-gray-500">
              No {activeFilter === 'upcoming' ? 'upcoming' : 'past'} trips
            </p>
          </div>
        ) : (
          /* Trip Grid */
          <div className="space-y-3">
            {filteredTrips.map((trip) => (
              <TripRow key={trip.id} trip={trip} />
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
 * Trip Row - minimal design with static map
 */
function TripRow({ trip }: { trip: TripWithStats }) {
  const [imageError, setImageError] = useState(false);
  const state = getTripState(trip.end_date, trip.start_date, trip.stats);
  const isPast = state === 'past';
  const destinations = formatDestinationsFromField(trip.destination);
  const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);
  const totalItems = getTotalItems(trip.stats);
  const timeLabel = getTimeLabel(trip.start_date, trip.end_date, state);

  // Generate static map URL
  const staticMapUrl = trip.mapCenter
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${trip.mapCenter.lng},${trip.mapCenter.lat})/${trip.mapCenter.lng},${trip.mapCenter.lat},10,0/112x112@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
    : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={`
        flex items-center gap-4 p-4 rounded-2xl
        bg-gray-50 dark:bg-gray-900/50
        hover:bg-gray-100 dark:hover:bg-gray-900
        transition-colors
        ${isPast ? 'opacity-60' : ''}
      `}
    >
      {/* Static map cover */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
        {staticMapUrl && !imageError ? (
          <Image
            src={staticMapUrl}
            alt=""
            width={56}
            height={56}
            className="w-full h-full object-cover"
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
            {trip.title}
          </h3>
          {timeLabel && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
              {timeLabel}
            </span>
          )}
        </div>

        <p className="text-[12px] text-gray-400 flex items-center gap-1">
          {destinations && (
            <>
              <MapPin className="w-3 h-3" />
              <span className="truncate">{destinations}</span>
            </>
          )}
          {destinations && dateDisplay && <span>·</span>}
          {dateDisplay && <span>{dateDisplay}</span>}
        </p>

        {totalItems > 0 && (
          <p className="text-[11px] text-gray-400 mt-1">
            {totalItems} {totalItems === 1 ? 'place' : 'places'}
          </p>
        )}
      </div>
    </Link>
  );
}
