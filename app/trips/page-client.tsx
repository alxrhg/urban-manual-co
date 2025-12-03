'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Plus, Loader2, MapPin, Calendar, Plane, Search, X, Sparkles } from 'lucide-react';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import { TripHealthDots } from '@/components/trips/TripHealthIndicator';
import { formatDestinationsFromField } from '@/types/trip';
import { differenceInDays, parseISO, format } from 'date-fns';
import type { Trip } from '@/types/trip';

export interface TripWithHealth extends Trip {
  item_count?: number;
  has_hotel?: boolean;
  has_flight?: boolean;
}

type TripStatus = 'all' | 'planning' | 'upcoming' | 'ongoing' | 'completed';

// Get countdown text for trip
function getTripCountdown(startDate: string | null, endDate: string | null, status?: string): { text: string; subtext?: string; isActive: boolean } | null {
  if (!startDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseISO(startDate);
  start.setHours(0, 0, 0, 0);

  const daysUntilStart = differenceInDays(start, today);

  if (status === 'ongoing' || (daysUntilStart <= 0 && endDate && differenceInDays(parseISO(endDate), today) >= 0)) {
    const daysCount = endDate ? calculateTripDays(startDate, endDate) : null;
    return {
      text: 'Happening now',
      subtext: daysCount ? `${daysCount} day trip` : undefined,
      isActive: true
    };
  }

  if (status === 'completed' || (endDate && differenceInDays(parseISO(endDate), today) < 0)) {
    return null;
  }

  if (daysUntilStart === 0) {
    return { text: 'Starts today', isActive: true };
  }

  if (daysUntilStart === 1) {
    return { text: 'Starts tomorrow', isActive: false };
  }

  if (daysUntilStart > 0 && daysUntilStart <= 30) {
    const daysCount = endDate ? calculateTripDays(startDate, endDate) : null;
    return {
      text: `Starts in ${daysUntilStart} days`,
      subtext: daysCount ? `${daysCount} day trip` : undefined,
      isActive: false
    };
  }

  return null;
}

// Status badge config
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return { label: 'Planning', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'upcoming':
      return { label: 'Upcoming', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'ongoing':
      return { label: 'Now', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', pulse: true };
    case 'completed':
      return { label: 'Done', color: 'bg-stone-100 text-stone-600 dark:bg-gray-800 dark:text-gray-400' };
    default:
      return null;
  }
}

interface TripsPageClientProps {
  initialTrips: TripWithHealth[];
  userId: string;
}

export default function TripsPageClient({ initialTrips, userId }: TripsPageClientProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithHealth[]>(initialTrips);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus>('all');

  // Filter trips based on search and status
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const destinationsDisplay = formatDestinationsFromField(trip.destination);
      const matchesSearch = searchQuery === '' ||
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        destinationsDisplay.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: trips.length,
    planning: trips.filter(t => t.status === 'planning').length,
    upcoming: trips.filter(t => t.status === 'upcoming').length,
    ongoing: trips.filter(t => t.status === 'ongoing').length,
    completed: trips.filter(t => t.status === 'completed').length,
  }), [trips]);

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
    <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-32 min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto">
        {/* Header - Matching itinerary design */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-light text-stone-900 dark:text-white">
              Trips
            </h1>

            {/* Spacer */}
            <div className="hidden sm:block flex-1" />

            {/* Trip Count */}
            {trips.length > 0 && (
              <p className="text-xs text-stone-400 dark:text-gray-500 hidden sm:block">
                {trips.length} trip{trips.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* New Trip Button */}
            <button
              onClick={createTrip}
              disabled={creating}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[44px]"
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

        {/* Tab Navigation - Matching itinerary tabs */}
        {trips.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-x-1 sm:gap-x-4 text-xs overflow-x-auto scrollbar-hide -mx-1 px-1">
                {[
                  { key: 'all', label: 'All', count: stats.total },
                  { key: 'planning', label: 'Planning', count: stats.planning },
                  { key: 'upcoming', label: 'Upcoming', count: stats.upcoming },
                  ...(stats.ongoing > 0 ? [{ key: 'ongoing', label: 'Active', count: stats.ongoing }] : []),
                  { key: 'completed', label: 'Past', count: stats.completed },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as TripStatus)}
                    className={`
                      transition-all flex items-center gap-1.5 whitespace-nowrap
                      px-3 py-2 sm:px-2 sm:py-1 rounded-full sm:rounded-none
                      min-h-[40px] sm:min-h-0
                      ${statusFilter === key
                        ? 'font-medium text-stone-900 dark:text-white bg-stone-100 dark:bg-gray-800 sm:bg-transparent sm:dark:bg-transparent'
                        : 'font-medium text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {count > 0 && (
                      <span className={`
                        w-4 h-4 rounded-full text-[10px] flex items-center justify-center
                        ${statusFilter === key
                          ? 'bg-stone-200 dark:bg-gray-700'
                          : 'bg-stone-100 dark:bg-gray-800'
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
                    ? 'bg-stone-100 dark:bg-gray-800 text-stone-900 dark:text-white'
                    : 'hover:bg-stone-100 dark:hover:bg-gray-800 text-stone-400 dark:text-gray-500'
                  }
                `}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input - Expandable */}
            {searchQuery !== '' && (
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={searchQuery.trim()}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-white/10 transition-all"
                />
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
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
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              Plan your next adventure
            </h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
              Create a trip to organize your itinerary, track flights and hotels, and discover great places.
            </p>
            <button
              onClick={createTrip}
              disabled={creating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Your First Trip
            </button>

            {/* Features */}
            <div className="mt-10 pt-8 border-t border-stone-100 dark:border-gray-800">
              <div className="flex flex-wrap justify-center gap-3 text-xs text-stone-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <MapPin className="w-3.5 h-3.5" /> Save places
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <Plane className="w-3.5 h-3.5" /> Track flights
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 dark:bg-gray-800/50 rounded-full">
                  <Calendar className="w-3.5 h-3.5" /> Day-by-day itinerary
                </span>
              </div>
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* No Results */
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
              <Search className="w-6 h-6 text-stone-400" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-2">
              No matching trips
            </h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 mb-6">
              {searchQuery.trim() ? `No trips found for "${searchQuery.trim()}"` : `No ${statusFilter} trips found`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-sm font-medium text-stone-900 dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Trip List - Tripsy-inspired card design */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredTrips.map((trip) => {
              const statusConfig = getStatusConfig(trip.status);
              const daysCount = calculateTripDays(trip.start_date, trip.end_date);
              const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);
              const destinationsDisplay = formatDestinationsFromField(trip.destination);
              const countdown = getTripCountdown(trip.start_date, trip.end_date, trip.status);

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group relative rounded-2xl overflow-hidden bg-stone-900 dark:bg-gray-900 aspect-[4/3] sm:aspect-[3/2]"
                >
                  {/* Cover Image with gradient overlay */}
                  <div className="absolute inset-0">
                    {trip.cover_image ? (
                      <Image
                        src={trip.cover_image}
                        alt={trip.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-stone-700 to-stone-900 dark:from-gray-800 dark:to-gray-950" />
                    )}
                    {/* Gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>

                  {/* Status Badge - Top right */}
                  {statusConfig && (
                    <div className="absolute top-3 right-3">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md ${
                        countdown?.isActive
                          ? 'bg-orange-500/90 text-white'
                          : statusConfig.color
                      }`}>
                        {countdown?.isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                        {countdown?.isActive ? 'Live' : statusConfig.label}
                      </span>
                    </div>
                  )}

                  {/* Content - Bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    {/* Countdown badge */}
                    {countdown && (
                      <div className="mb-2">
                        <span className="text-[11px] font-medium text-orange-400">
                          {countdown.text}
                        </span>
                        {countdown.subtext && (
                          <span className="text-[11px] text-white/60 ml-1.5">
                            · {countdown.subtext}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 line-clamp-1">
                      {trip.title}
                    </h3>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-white/70">
                      {destinationsDisplay && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {destinationsDisplay}
                        </span>
                      )}
                      {dateDisplay && (
                        <>
                          <span className="text-white/40">·</span>
                          <span>{dateDisplay}</span>
                        </>
                      )}
                    </div>

                    {/* Health Indicator for planning trips */}
                    {trip.status === 'planning' && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
                        <TripHealthDots
                          itemCount={trip.item_count || 0}
                          dayCount={daysCount || 1}
                          hasHotel={trip.has_hotel || false}
                          hasFlight={trip.has_flight || false}
                        />
                        {(trip.item_count || 0) < 3 && (
                          <span className="text-[10px] text-white/50 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Continue planning
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
