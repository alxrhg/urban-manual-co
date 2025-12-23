'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
    <main className="w-full px-6 md:px-12 lg:px-16 py-20 min-h-screen bg-[var(--editorial-bg)]">
        {/* Header - Editorial style with generous whitespace */}
        <div className="mb-16">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--editorial-text-tertiary)] mb-4">
            Your Journeys
          </p>
          <div className="flex items-baseline justify-between">
            <h1
              className="text-[2.5rem] md:text-[3rem] font-normal text-[var(--editorial-text-primary)] leading-tight"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              Trips
            </h1>
            <button
              onClick={() => setShowWizard(true)}
              className="text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              New Trip
            </button>
          </div>
        </div>

        {/* Tab Navigation - Editorial minimal style */}
        {categorizedTrips.upcoming.length > 0 && categorizedTrips.past.length > 0 && (
          <div className="mb-16 border-b border-[var(--editorial-border)]">
            <div className="flex gap-8 text-[13px]">
              {(['all', 'upcoming', 'past'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`pb-4 transition-all duration-200 ${
                    activeFilter === tab
                      ? 'text-[var(--editorial-text-primary)] border-b-2 border-[var(--editorial-text-primary)] -mb-px'
                      : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)]'
                  }`}
                  style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State - Editorial minimal */
          <div className="text-center py-24">
            <p
              className="text-[15px] text-[var(--editorial-text-secondary)] mb-8"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              No trips planned yet
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="text-[13px] text-[var(--editorial-text-primary)] hover:text-[var(--editorial-accent)] transition-colors"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              Plan your first journey →
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* Empty State - Filter has no results */
          <div className="text-center py-16">
            <p
              className="text-[14px] text-[var(--editorial-text-tertiary)] italic"
              style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
            >
              No {activeFilter === 'upcoming' ? 'upcoming' : 'past'} trips
            </p>
          </div>
        ) : (
          /* Trip List - Editorial vertical layout with generous spacing */
          <div className="space-y-12 max-w-2xl">
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}

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
 * Trip Card - Editorial "Of Study" style
 * Minimal, no borders, serif typography, subtle status
 */
function TripCard({ trip }: { trip: TripWithStats }) {
  const state = getTripState(trip.end_date, trip.start_date, trip.stats);
  const destinations = formatDestinationsFromField(trip.destination);
  const totalItems = getTotalItems(trip.stats);

  // Format dates elegantly
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const dateDisplay = trip.start_date && trip.end_date
    ? `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`
    : trip.start_date
    ? formatDate(trip.start_date)
    : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="block group"
    >
      {/* Trip Title - Serif */}
      <h3
        className="text-[1.25rem] md:text-[1.5rem] font-normal text-[var(--editorial-text-primary)] mb-2
                   group-hover:text-[var(--editorial-accent)] transition-colors leading-tight"
        style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
      >
        {trip.title}
      </h3>

      {/* Meta info - Clean text layout */}
      <div className="text-[13px] text-[var(--editorial-text-secondary)] mb-1">
        {dateDisplay && <span>{dateDisplay}</span>}
        {destinations && dateDisplay && <span className="mx-2">·</span>}
        {destinations && <span className="lowercase">{destinations}</span>}
      </div>

      {/* Status - Subtle italic text, not a badge */}
      <p className="text-[12px] text-[var(--editorial-text-tertiary)]">
        {state && (
          <span className="italic">{state}</span>
        )}
        {state && totalItems > 0 && <span className="mx-2">·</span>}
        {totalItems > 0 && (
          <span>{totalItems} {totalItems === 1 ? 'place' : 'places'}</span>
        )}
      </p>

      {/* Subtle separator line */}
      <div className="mt-12 border-b border-[var(--editorial-border)]" />
    </Link>
  );
}
