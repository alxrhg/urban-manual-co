'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Plus, Loader2, Plane, Search, X, MapPin, Calendar,
  Compass, ArrowRight, MoreHorizontal, ExternalLink, Pencil,
} from 'lucide-react';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';
import { TripCoverImage } from '@/components/trips/TripCoverImage';
import { TripStats } from '@/components/trips/TripStats';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useTripDrawer } from '@/components/IntelligentDrawer';
import {
  getTripState,
  getTimeLabel,
  getActionCTA,
  getTotalItems,
  type TripStats as TripStatsType,
  type TripState,
} from '@/lib/trip';
import type { Trip } from '@/types/trip';

export interface TripWithStats extends Trip {
  stats: TripStatsType;
}

type FilterTab = 'all' | 'upcoming' | 'past';

interface TripsPageClientProps {
  initialTrips: TripWithStats[];
  userId: string;
}

export default function TripsPageClient({ initialTrips, userId }: TripsPageClientProps) {
  const router = useRouter();
  const { switchToTrip, openPanel } = useTripBuilder();
  const { openTrip } = useTripDrawer();
  const [trips, setTrips] = useState<TripWithStats[]>(initialTrips);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Categorize trips by state and filter
  const { filteredTrips, tabCounts } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Categorize all trips
    const categorized = trips.map(trip => {
      const state = getTripState(trip.end_date, trip.start_date, trip.stats);
      return { trip, state };
    });

    // Count for tabs
    const counts = {
      all: trips.length,
      upcoming: categorized.filter(t => t.state === 'upcoming' || t.state === 'planning').length,
      past: categorized.filter(t => t.state === 'past').length,
    };

    // Filter by tab
    let filtered = categorized;
    if (activeTab === 'upcoming') {
      filtered = categorized.filter(t => t.state === 'upcoming' || t.state === 'planning');
    } else if (activeTab === 'past') {
      filtered = categorized.filter(t => t.state === 'past');
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(({ trip }) => {
        const destinationsDisplay = formatDestinationsFromField(trip.destination);
        return (
          trip.title.toLowerCase().includes(query) ||
          destinationsDisplay.toLowerCase().includes(query)
        );
      });
    }

    // Sort: Upcoming by startDate ascending, Past by endDate descending
    filtered.sort((a, b) => {
      if (a.state === 'past' && b.state === 'past') {
        const dateA = a.trip.end_date ? new Date(a.trip.end_date).getTime() : 0;
        const dateB = b.trip.end_date ? new Date(b.trip.end_date).getTime() : 0;
        return dateB - dateA;
      } else if (a.state !== 'past' && b.state !== 'past') {
        const dateA = a.trip.start_date ? new Date(a.trip.start_date).getTime() : Infinity;
        const dateB = b.trip.start_date ? new Date(b.trip.start_date).getTime() : Infinity;
        return dateA - dateB;
      } else {
        return a.state === 'past' ? 1 : -1;
      }
    });

    return {
      filteredTrips: filtered,
      tabCounts: counts,
    };
  }, [trips, searchQuery, activeTab]);

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

  // Quick edit - load trip into IntelligentDrawer
  const handleQuickEdit = useCallback(async (tripId: string) => {
    await openTrip(tripId);
  }, [openTrip]);

  // Browse & Add - load trip and go to homepage
  const handleBrowseAdd = useCallback(async (tripId: string) => {
    await switchToTrip(tripId);
    openPanel();
    router.push('/');
  }, [switchToTrip, openPanel, router]);

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
                Your Trips
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Plan, organize, and discover places for your adventures
              </p>
            </div>

            <div className="sm:ml-auto flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Compass className="w-4 h-4" />
                Discover Places
              </Link>
              <button
                onClick={createTrip}
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                New Trip
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {trips.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                {[
                  { key: 'all' as FilterTab, label: 'All' },
                  { key: 'upcoming' as FilterTab, label: 'Upcoming' },
                  { key: 'past' as FilterTab, label: 'Past' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-full transition-all
                      ${activeTab === key
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {label}
                    {tabCounts[key] > 0 && (
                      <span className="ml-1.5 text-[11px] opacity-60">
                        {tabCounts[key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-9 h-9 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Start planning your next adventure
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create a trip to save places, plan your itinerary, and get personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={createTrip}
                disabled={creating}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Trip
              </button>
              <Link
                href="/"
                className="flex items-center gap-2 px-6 py-3 rounded-full text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Compass className="w-4 h-4" />
                Browse Destinations
              </Link>
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* No Results */
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No trips found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery.trim() ? `No results for "${searchQuery.trim()}"` : `No ${activeTab} trips`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
              className="text-sm font-medium text-gray-900 dark:text-white hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Trip Grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTrips.map(({ trip, state }) => (
              <TripCard
                key={trip.id}
                trip={trip}
                state={state}
                onQuickEdit={() => handleQuickEdit(trip.id)}
                onBrowseAdd={() => handleBrowseAdd(trip.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Trip Card with unified actions
 */
interface TripCardProps {
  trip: TripWithStats;
  state: TripState;
  onQuickEdit: () => void;
  onBrowseAdd: () => void;
}

function TripCard({ trip, state, onQuickEdit, onBrowseAdd }: TripCardProps) {
  const [showActions, setShowActions] = useState(false);
  const daysCount = calculateTripDays(trip.start_date, trip.end_date);
  const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);
  const destinations = formatDestinationsFromField(trip.destination);

  const isPast = state === 'past';
  const isPlanning = state === 'planning';
  const totalItems = getTotalItems(trip.stats);
  const timeLabel = getTimeLabel(trip.start_date, trip.end_date, state);

  return (
    <div
      className={`
        group relative flex flex-col rounded-2xl overflow-hidden
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
        hover:border-gray-300 dark:hover:border-gray-700
        hover:shadow-lg
        transition-all duration-200
        ${isPast ? 'opacity-75' : ''}
      `}
    >
      {/* Cover Image */}
      <div className="relative h-32 bg-gray-100 dark:bg-gray-800">
        <TripCoverImage
          coverImageUrl={trip.cover_image}
          title={trip.title}
          isPast={isPast}
          className="w-full h-full"
        />

        {/* Time badge */}
        {timeLabel && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-medium">
            {timeLabel}
          </div>
        )}

        {/* Actions menu */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowActions(!showActions);
            }}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showActions && (
            <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onQuickEdit();
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Quick Edit
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onBrowseAdd();
                  setShowActions(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                Browse & Add
              </button>
              <Link
                href={`/trips/${trip.id}`}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Full Editor
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1 truncate">
          {trip.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
          {destinations && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              {destinations}
            </span>
          )}
          {dateDisplay && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {dateDisplay}
              </span>
            </>
          )}
        </div>

        {/* Stats */}
        {totalItems > 0 ? (
          <TripStats stats={trip.stats} />
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {isPlanning ? 'Start adding places' : 'No places saved'}
          </p>
        )}
      </div>

      {/* Actions bar */}
      <div className="px-4 pb-4 pt-0 flex gap-2">
        <button
          onClick={onBrowseAdd}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <Compass className="w-4 h-4" />
          Add Places
        </button>
        <Link
          href={`/trips/${trip.id}`}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
