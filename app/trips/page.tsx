'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Calendar, Plane, Search, X, ArrowRight, Sparkles } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { formatTripDateRange, calculateTripDays } from '@/lib/utils';
import { TripHealthDots } from '@/components/trips/TripHealthIndicator';
import type { Trip } from '@/types/trip';

interface TripWithHealth extends Trip {
  item_count?: number;
  has_hotel?: boolean;
  has_flight?: boolean;
}

type TripStatus = 'all' | 'planning' | 'upcoming' | 'ongoing' | 'completed';

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

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<TripWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TripStatus>('all');

  // Filter trips based on search and status
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const matchesSearch = searchQuery === '' ||
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trip.destination && trip.destination.toLowerCase().includes(searchQuery.toLowerCase()));
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchTrips();
  }, [user]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      if (!supabase || !user) return;

      // Fetch trips with item counts
      const { data: tripsData, error: tripsError } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (tripsError) throw tripsError;

      // Fetch item counts for each trip
      if (tripsData && tripsData.length > 0) {
        const tripIds = tripsData.map(t => t.id);

        // Get item counts grouped by trip
        const { data: itemCounts } = await supabase
          .from('itinerary_items')
          .select('trip_id, notes')
          .in('trip_id', tripIds);

        // Calculate health metrics for each trip
        const tripsWithHealth = tripsData.map(trip => {
          const tripItems = itemCounts?.filter(i => i.trip_id === trip.id) || [];
          const itemCount = tripItems.length;

          // Check for hotels and flights in notes
          let hasHotel = false;
          let hasFlight = false;

          tripItems.forEach(item => {
            try {
              const notes = item.notes ? JSON.parse(item.notes) : null;
              if (notes?.type === 'hotel') hasHotel = true;
              if (notes?.type === 'flight') hasFlight = true;
            } catch {}
          });

          return {
            ...trip,
            item_count: itemCount,
            has_hotel: hasHotel,
            has_flight: hasFlight,
          };
        });

        setTrips(tripsWithHealth);
      } else {
        setTrips([]);
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTrip = async () => {
    if (!user) return;
    try {
      setCreating(true);
      const supabase = createClient();
      if (!supabase) return;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
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

  // Loading state
  if (authLoading || loading) {
    return (
      <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950">
        <PageLoader />
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-6 mx-auto">
            <Plane className="h-7 w-7 text-stone-400" />
          </div>
          <h1 className="text-2xl font-light text-stone-900 dark:text-white mb-3">Trips</h1>
          <p className="text-sm text-stone-500 dark:text-gray-400 mb-8">
            Sign in to plan and organize your travels
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full px-6 py-3 bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-stone-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light text-stone-900 dark:text-white mb-1">
              Trips
            </h1>
            <p className="text-sm text-stone-500 dark:text-gray-400">
              {trips.length === 0 ? 'Plan your next adventure' : `${trips.length} trip${trips.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={createTrip}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            New Trip
          </button>
        </div>

        {/* Filters (only show if trips exist) */}
        {trips.length > 0 && (
          <div className="space-y-4 mb-8">
            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'planning', label: 'Planning', count: stats.planning },
                { key: 'upcoming', label: 'Upcoming', count: stats.upcoming },
                ...(stats.ongoing > 0 ? [{ key: 'ongoing', label: 'Ongoing', count: stats.ongoing }] : []),
                { key: 'completed', label: 'Completed', count: stats.completed },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key as TripStatus)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${statusFilter === key
                      ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {label}
                  <span className={`ml-1.5 ${statusFilter === key ? 'opacity-70' : 'opacity-50'}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by name or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
              <Plane className="w-7 h-7 text-stone-400" />
            </div>
            <h3 className="text-xl font-medium text-stone-900 dark:text-white mb-2">
              Plan your next adventure
            </h3>
            <p className="text-sm text-stone-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Create a trip to organize your itinerary, save places, and let AI help you discover the best spots.
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
              <p className="text-xs text-stone-400 dark:text-gray-500 mb-4 uppercase tracking-wider font-medium">
                What you can do
              </p>
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
              {searchQuery ? `No trips found for "${searchQuery}"` : `No ${statusFilter} trips found`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-sm font-medium text-stone-900 dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Trip Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map((trip) => {
              const statusConfig = getStatusConfig(trip.status);
              const daysCount = calculateTripDays(trip.start_date, trip.end_date);
              const dateDisplay = formatTripDateRange(trip.start_date, trip.end_date);

              return (
                <Link
                  key={trip.id}
                  href={`/trips/${trip.id}`}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 hover:border-stone-300 dark:hover:border-stone-700 transition-all"
                >
                  {/* Cover Image */}
                  <div className="relative aspect-[3/2] bg-stone-100 dark:bg-gray-800">
                    {trip.cover_image ? (
                      <Image
                        src={trip.cover_image}
                        alt={trip.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {trip.destination ? (
                          <div className="text-center">
                            <MapPin className="w-6 h-6 text-stone-300 dark:text-gray-600 mx-auto mb-1" />
                            <span className="text-xs text-stone-400 dark:text-gray-500">
                              {trip.destination}
                            </span>
                          </div>
                        ) : (
                          <Plane className="w-6 h-6 text-stone-300 dark:text-gray-600" />
                        )}
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Status Badge */}
                    {statusConfig && (
                      <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ${statusConfig.color}`}>
                        {statusConfig.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        )}
                        {statusConfig.label}
                      </div>
                    )}

                    {/* Arrow */}
                    <div className="absolute top-3 right-3 opacity-0 transform translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Title & Meta */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-lg font-medium text-white mb-1 leading-tight">
                        {trip.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        {trip.destination && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 opacity-70" />
                            {trip.destination}
                          </span>
                        )}
                        {trip.destination && daysCount && daysCount > 0 && (
                          <span className="w-0.5 h-0.5 rounded-full bg-white/40" />
                        )}
                        {daysCount && daysCount > 0 && (
                          <span>{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>

                    {/* Health indicator overlay */}
                    {trip.status === 'planning' && (
                      <div className="absolute bottom-3 right-3">
                        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full px-2 py-1">
                          <TripHealthDots
                            itemCount={trip.item_count || 0}
                            dayCount={daysCount || 1}
                            hasHotel={trip.has_hotel || false}
                            hasFlight={trip.has_flight || false}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Date Row / Planning CTA */}
                  <div className="px-4 py-3 border-t border-stone-100 dark:border-gray-800">
                    {dateDisplay ? (
                      <p className="text-xs text-stone-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {dateDisplay}
                      </p>
                    ) : trip.status === 'planning' && (trip.item_count || 0) < 3 ? (
                      <p className="text-xs text-stone-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        Continue planning
                      </p>
                    ) : trip.status === 'planning' ? (
                      <p className="text-xs text-stone-400 dark:text-gray-500">
                        Set dates to finalize
                      </p>
                    ) : null}
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
