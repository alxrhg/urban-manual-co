'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Plus, ArrowRight } from 'lucide-react';
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
 * TripsPageClient - "Of Study" inspired editorial design
 *
 * Philosophy: Conscious design, intentional travel planning.
 * Every trip deserves the same consideration as the spaces we inhabit.
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
    <main className="min-h-screen bg-[var(--editorial-bg)]">
      {/* Hero Section - Two Panel Layout */}
      <div className="lg:grid lg:grid-cols-2 min-h-[50vh]">
        {/* Left Panel - Branding */}
        <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 lg:py-24">
          <span className="text-editorial-label mb-6">Journeys</span>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-normal text-[var(--editorial-text-primary)] mb-6"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif", letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Your Trips
          </h1>
          <p className="text-editorial-body max-w-md mb-8">
            Each journey is created for those who understand that how we travel
            is expressed through the places we visit. The destinations that
            punctuate our days warrant the same consideration as the spaces we inhabit.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="btn-editorial-accent inline-flex items-center gap-3 w-fit"
          >
            <Plus className="w-4 h-4" />
            Begin New Journey
          </button>
        </div>

        {/* Right Panel - Featured Trip or Illustration */}
        <div className="hidden lg:flex items-center justify-center bg-[var(--editorial-accent)]/5 p-12">
          {filteredTrips.length > 0 && filteredTrips[0].cover_image ? (
            <div className="relative w-full max-w-sm aspect-[3/4] rounded-sm overflow-hidden">
              <Image
                src={filteredTrips[0].cover_image}
                alt={filteredTrips[0].title || 'Featured trip'}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="text-center max-w-xs">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-[var(--editorial-accent)]/10 flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[var(--editorial-accent)]/30 rounded-full" />
              </div>
              <p className="text-editorial-label mb-3">Conscious Travel</p>
              <p className="text-editorial-meta">
                Transform ordinary moments into something more intentional.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trip List Section */}
      <div className="px-8 sm:px-12 lg:px-16 py-16 border-t border-[var(--editorial-border)]">
        {/* Filter Navigation */}
        {trips.length > 0 && (
          <div className="flex items-center justify-between mb-12">
            <div className="flex gap-8">
              {(['all', 'upcoming', 'past'] as FilterTab[]).map((tab) => {
                const count = tab === 'all'
                  ? trips.length
                  : tab === 'upcoming'
                    ? categorizedTrips.upcoming.length
                    : categorizedTrips.past.length;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`relative pb-2 text-[13px] transition-colors ${
                      activeFilter === tab
                        ? 'text-[var(--editorial-text-primary)] font-medium'
                        : 'text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-secondary)]'
                    }`}
                  >
                    <span className="capitalize">{tab}</span>
                    <span className="ml-2 text-[11px]">({count})</span>
                    {activeFilter === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-[var(--editorial-accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Trip Grid */}
        {trips.length === 0 ? (
          <EmptyState onCreateTrip={() => setShowWizard(true)} />
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-editorial-meta">
              No {activeFilter === 'upcoming' ? 'upcoming' : 'past'} journeys
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredTrips.map((trip, index) => (
              <TripCard key={trip.id} trip={trip} featured={index === 0 && activeFilter === 'all'} />
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
 * Empty State - Editorial design
 */
function EmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <span className="text-editorial-label block mb-6">Begin</span>
      <h2
        className="text-2xl sm:text-3xl font-normal text-[var(--editorial-text-primary)] mb-4"
        style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
      >
        No journeys yet
      </h2>
      <p className="text-editorial-body mb-8">
        Every great journey begins with a single step. Start planning your next
        adventure with intention and care.
      </p>
      <button
        onClick={onCreateTrip}
        className="btn-editorial-primary"
      >
        Create your first journey
      </button>
    </div>
  );
}

/**
 * Trip Card - Editorial magazine style
 */
function TripCard({ trip, featured = false }: { trip: TripWithStats; featured?: boolean }) {
  const state = getTripState(trip.end_date, trip.start_date, trip.stats);
  const destinations = formatDestinationsFromField(trip.destination);
  const totalItems = getTotalItems(trip.stats);

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const startFormatted = formatDate(trip.start_date);
  const endFormatted = formatDate(trip.end_date);
  const dateRange = startFormatted
    ? endFormatted && startFormatted !== endFormatted
      ? `${startFormatted} – ${endFormatted}`
      : startFormatted
    : null;

  // Calculate trip duration
  const duration = trip.start_date && trip.end_date
    ? Math.ceil((new Date(trip.end_date + 'T00:00:00').getTime() - new Date(trip.start_date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  return (
    <Link
      href={`/trips/${trip.id}`}
      className={`group block ${featured ? 'md:col-span-2 xl:col-span-1' : ''}`}
    >
      <article className="h-full flex flex-col border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)] transition-all duration-300 hover:border-[var(--editorial-accent)]/30">
        {/* Image */}
        {trip.cover_image && (
          <div className="relative aspect-[4/3] overflow-hidden bg-[var(--editorial-border-subtle)]">
            <Image
              src={trip.cover_image}
              alt={trip.title || 'Trip cover'}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {state === 'upcoming' && (
              <div className="absolute top-4 left-4">
                <span className="text-editorial-label bg-[var(--editorial-bg-elevated)]/90 backdrop-blur-sm px-3 py-1.5">
                  Upcoming
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-6">
          {/* Location label */}
          {destinations && (
            <span className="text-editorial-label block mb-3">{destinations}</span>
          )}

          {/* Title */}
          <h3
            className="text-xl font-normal text-[var(--editorial-text-primary)] mb-3 group-hover:text-[var(--editorial-accent)] transition-colors"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            {trip.title || 'Untitled Journey'}
          </h3>

          {/* Description */}
          {trip.description && (
            <p className="text-editorial-meta line-clamp-2 mb-4">
              {trip.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-[12px] text-[var(--editorial-text-tertiary)]">
            {dateRange && (
              <span>{dateRange}</span>
            )}
            {duration && (
              <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
            )}
            {totalItems > 0 && (
              <span>{totalItems} {totalItems === 1 ? 'place' : 'places'}</span>
            )}
          </div>
        </div>

        {/* Footer with arrow */}
        <div className="px-6 py-4 border-t border-[var(--editorial-border-subtle)] flex items-center justify-between">
          <span className="text-[12px] text-[var(--editorial-text-tertiary)]">
            View journey
          </span>
          <ArrowRight className="w-4 h-4 text-[var(--editorial-text-tertiary)] group-hover:text-[var(--editorial-accent)] group-hover:translate-x-1 transition-all" />
        </div>
      </article>
    </Link>
  );
}
