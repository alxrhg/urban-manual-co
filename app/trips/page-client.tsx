'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Loader2, Plane, Search, X } from 'lucide-react';
import { formatDestinationsFromField } from '@/types/trip';
import { CalendarTripCard, type CalendarActivity } from '@/components/trips/CalendarTripCard';
import {
  getTripState,
  getTimeLabel,
  type TripStats as TripStatsType,
  type TripState,
} from '@/lib/trip';
import type { Trip } from '@/types/trip';

export interface TripWithStats extends Trip {
  stats: TripStatsType;
}

// Re-export activity type for server component
export type TripActivity = CalendarActivity;

type FilterTab = 'all' | 'upcoming' | 'past';

interface TripsPageClientProps {
  initialTrips: TripWithStats[];
  activitiesByTrip: Record<string, TripActivity[]>;
  userId: string;
}

export default function TripsPageClient({ initialTrips, activitiesByTrip, userId }: TripsPageClientProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithStats[]>(initialTrips);
  const [activities] = useState<Record<string, TripActivity[]>>(activitiesByTrip);
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
        // Past: most recent first
        const dateA = a.trip.end_date ? new Date(a.trip.end_date).getTime() : 0;
        const dateB = b.trip.end_date ? new Date(b.trip.end_date).getTime() : 0;
        return dateB - dateA;
      } else if (a.state !== 'past' && b.state !== 'past') {
        // Upcoming/Planning: soonest first
        const dateA = a.trip.start_date ? new Date(a.trip.start_date).getTime() : Infinity;
        const dateB = b.trip.start_date ? new Date(b.trip.start_date).getTime() : Infinity;
        return dateA - dateB;
      } else {
        // Put upcoming before past
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

  // Calculate summary counts
  const upcomingCount = tabCounts.upcoming;
  const pastCount = tabCounts.past;

  return (
    <main className="w-full px-4 sm:px-6 md:px-10 py-20 min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-3xl mx-auto">
        {/* Header - redesigned with title left, button right */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Trips
            </h1>
            {trips.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {upcomingCount} upcoming{pastCount > 0 ? ` · ${pastCount} past` : ''}
              </p>
            )}
          </div>

          <button
            onClick={createTrip}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Trip
          </button>
        </div>

        {/* Tab Navigation */}
        {trips.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1">
                {[
                  { key: 'all' as FilterTab, label: 'All', count: tabCounts.all },
                  { key: 'upcoming' as FilterTab, label: 'Upcoming', count: tabCounts.upcoming },
                  { key: 'past' as FilterTab, label: 'Past', count: tabCounts.past },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`
                      transition-colors flex items-center gap-1.5 whitespace-nowrap
                      px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                      min-h-[40px] sm:min-h-0
                      ${activeTab === key
                        ? 'font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                        : 'font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {count > 0 && (
                      <span className={`
                        w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                        ${activeTab === key
                          ? 'bg-gray-200 dark:bg-gray-700'
                          : 'bg-gray-100 dark:bg-gray-800'
                        }
                      `}>
                        {count}
                      </span>
                    )}
                    {label}
                  </button>
                ))}
              </div>

              {/* Search Toggle */}
              <button
                onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                className={`
                  p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center
                  ${searchQuery
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            {searchQuery !== '' && (
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={searchQuery.trim()}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 transition-all"
                />
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Plan your next adventure
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              Create a trip to organize your itinerary, track flights and hotels, and discover great places.
            </p>
            <button
              onClick={createTrip}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Your First Trip
            </button>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* No Results */
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No matching trips
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery.trim() ? `No trips found for "${searchQuery.trim()}"` : `No ${activeTab} trips found`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveTab('all'); }}
              className="text-sm font-medium text-gray-900 dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Trip List with Calendar Cards */
          <div className="space-y-4">
            {filteredTrips.map(({ trip, state }) => {
              const timeLabel = getTimeLabel(trip.start_date, trip.end_date, state);
              const tripActivities = activities[trip.id] || [];

              return (
                <CalendarTripCard
                  key={trip.id}
                  trip={{
                    id: trip.id,
                    title: trip.title,
                    emoji: undefined, // emoji field not in current Trip type
                    start_date: trip.start_date,
                    end_date: trip.end_date,
                    stats: trip.stats,
                  }}
                  activities={tripActivities}
                  state={state}
                  timeLabel={timeLabel}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
