'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Plus, Loader2, MapPin, Plane } from 'lucide-react';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';
import {
  getTripState,
  getTimeLabel,
  getTotalItems,
  type TripStats as TripStatsType,
  type TripState,
} from '@/lib/trip';
import type { Trip } from '@/types/trip';

export interface TripWithStats extends Trip {
  stats: TripStatsType;
}

interface TripsPageClientProps {
  initialTrips: TripWithStats[];
  userId: string;
}

/**
 * TripsPageClient - Minimal trips list
 *
 * Philosophy: Simple grid of trips. Nothing more.
 * - No tabs, no filters, no search
 * - Just trips sorted by date
 * - Tap to open
 */
export default function TripsPageClient({ initialTrips, userId }: TripsPageClientProps) {
  const router = useRouter();
  const [trips] = useState<TripWithStats[]>(initialTrips);
  const [creating, setCreating] = useState(false);

  // Sort trips: upcoming first by start date, then past by end date descending
  const sortedTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return [...trips].sort((a, b) => {
      const stateA = getTripState(a.end_date, a.start_date, a.stats);
      const stateB = getTripState(b.end_date, b.start_date, b.stats);

      // Upcoming/planning before past
      if (stateA === 'past' && stateB !== 'past') return 1;
      if (stateA !== 'past' && stateB === 'past') return -1;

      // Within same category, sort by date
      if (stateA === 'past' && stateB === 'past') {
        const dateA = a.end_date ? new Date(a.end_date).getTime() : 0;
        const dateB = b.end_date ? new Date(b.end_date).getTime() : 0;
        return dateB - dateA;
      }

      const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [trips]);

  const createTrip = async () => {
    try {
      setCreating(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: userId,
          title: 'New Trip',
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="w-full px-4 sm:px-6 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-2xl mx-auto">
        {/* Header - minimal */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-gray-900 dark:text-white">
              Trips
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
            </p>
          </div>

          <button
            onClick={createTrip}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900
                       text-[13px] font-medium
                       hover:bg-gray-800 dark:hover:bg-gray-100
                       disabled:opacity-50 transition-all"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Trip
          </button>
        </header>

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State */
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
              onClick={createTrip}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                         bg-gray-900 dark:bg-white text-white dark:text-gray-900
                         text-[13px] font-medium
                         hover:bg-gray-800 dark:hover:bg-gray-100
                         disabled:opacity-50 transition-all"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Trip
            </button>
          </div>
        ) : (
          /* Trip Grid */
          <div className="space-y-3">
            {sortedTrips.map((trip) => (
              <TripRow key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Trip Row - minimal design
 */
function TripRow({ trip }: { trip: TripWithStats }) {
  const state = getTripState(trip.end_date, trip.start_date, trip.stats);
  const isPast = state === 'past';
  const destinations = formatDestinationsFromField(trip.destination);
  const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);
  const totalItems = getTotalItems(trip.stats);
  const timeLabel = getTimeLabel(trip.start_date, trip.end_date, state);

  // Get cover image or first letter
  const initial = trip.title.charAt(0).toUpperCase();

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
      {/* Cover or initial */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
        {trip.cover_image ? (
          <Image
            src={trip.cover_image}
            alt=""
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[18px] font-semibold text-gray-400">
              {initial}
            </span>
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
