'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { format, parseISO, differenceInDays, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Calendar, Plane, Search, X, ArrowRight } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import { calculateTripDays } from '@/lib/utils';
import type { Trip } from '@/types/trip';

type TripStatus = 'all' | 'planning' | 'upcoming' | 'ongoing' | 'completed';

// Status badge config - minimal monochromatic style
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return { label: 'Planning', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
    case 'upcoming':
      return { label: 'Upcoming', color: 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' };
    case 'ongoing':
      return { label: 'Live', color: 'bg-green-500 text-white dark:bg-green-500 dark:text-white', pulse: true };
    case 'completed':
      return { label: 'Past', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' };
    default:
      return null;
  }
}

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
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

  // Get upcoming and ongoing trips sorted by start date for calendar view
  const calendarTrips = useMemo(() => {
    const now = startOfDay(new Date());
    return trips
      .filter(t => (t.status === 'upcoming' || t.status === 'ongoing') && t.start_date)
      .sort((a, b) => {
        const dateA = a.start_date ? parseISO(a.start_date) : new Date();
        const dateB = b.start_date ? parseISO(b.start_date) : new Date();
        return dateA.getTime() - dateB.getTime();
      });
  }, [trips]);

  // Helper to get countdown text
  const getCountdownText = (startDate: string, endDate?: string | null) => {
    const now = startOfDay(new Date());
    const start = parseISO(startDate);
    const end = endDate ? parseISO(endDate) : null;

    // Check if trip is ongoing
    if (end && isBefore(start, now) && isAfter(end, now)) {
      const daysLeft = differenceInDays(end, now);
      return { text: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, isOngoing: true };
    }

    // Check if trip starts today
    if (isToday(start)) {
      return { text: 'Starts today', isOngoing: false };
    }

    // Future trip
    const daysUntil = differenceInDays(start, now);
    if (daysUntil === 1) {
      return { text: 'Tomorrow', isOngoing: false };
    }
    if (daysUntil <= 7) {
      return { text: `In ${daysUntil} days`, isOngoing: false };
    }
    if (daysUntil <= 30) {
      const weeks = Math.floor(daysUntil / 7);
      return { text: `In ${weeks} week${weeks !== 1 ? 's' : ''}`, isOngoing: false };
    }
    const months = Math.floor(daysUntil / 30);
    return { text: `In ${months} month${months !== 1 ? 's' : ''}`, isOngoing: false };
  };

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

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
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
      <main className="w-full min-h-screen bg-white dark:bg-gray-950">
        <PageLoader />
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="w-full min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <Plane className="h-8 w-8 mx-auto mb-6 text-gray-400" />
          <h1 className="text-3xl font-light text-gray-900 dark:text-white mb-3">Your Trips</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Sign in to plan, organize, and discover your next adventure
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-full hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 dark:text-white tracking-tight">
              Trips
            </h1>
            {trips.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {trips.length} trip{trips.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={createTrip}
            disabled={creating}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 w-full md:w-auto"
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
          <div className="space-y-4 mb-10">
            {/* Search + Status Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'planning', label: 'Planning' },
                  { key: 'upcoming', label: 'Upcoming' },
                  ...(stats.ongoing > 0 ? [{ key: 'ongoing', label: 'Live' }] : []),
                  { key: 'completed', label: 'Past' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as TripStatus)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                      ${statusFilter === key
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-6">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Plane className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-2xl font-light text-gray-900 dark:text-white mb-3">
                Plan your next adventure
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Create a trip to organize your itinerary, save places, and let AI help you discover the best spots.
              </p>
              <button
                onClick={createTrip}
                disabled={creating}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Your First Trip
              </button>

              {/* Features */}
              <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Save places
                  </span>
                  <span className="flex items-center gap-2">
                    <Plane className="w-4 h-4" /> Track flights
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Day-by-day plan
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          /* No Results */
          <div className="text-center py-20 px-6">
            <Search className="w-8 h-8 mx-auto mb-6 text-gray-300 dark:text-gray-600" />
            <h3 className="text-xl font-light text-gray-900 dark:text-white mb-2">
              No matching trips
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery ? `No trips found for "${searchQuery}"` : `No ${statusFilter} trips found`}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="text-sm font-medium text-gray-900 dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Upcoming Trips - Calendar Style */}
            {calendarTrips.length > 0 && statusFilter === 'all' && !searchQuery && (
              <section>
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">
                  Coming Up
                </h2>
                <div className="space-y-4">
                  {calendarTrips.map((trip) => {
                    const startDate = trip.start_date ? parseISO(trip.start_date) : null;
                    const countdown = trip.start_date ? getCountdownText(trip.start_date, trip.end_date) : null;
                    const daysCount = calculateTripDays(trip.start_date, trip.end_date);

                    return (
                      <Link
                        key={trip.id}
                        href={`/trips/${trip.id}`}
                        className="group flex items-stretch gap-4 md:gap-6 p-4 md:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                      >
                        {/* Date Block */}
                        <div className="flex-shrink-0 w-16 md:w-20 text-center">
                          {startDate && (
                            <>
                              <div className="text-3xl md:text-4xl font-light text-gray-900 dark:text-white">
                                {format(startDate, 'd')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                {format(startDate, 'MMM')}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Divider */}
                        <div className="w-px bg-gray-200 dark:bg-gray-800" />

                        {/* Trip Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="text-lg font-light text-gray-900 dark:text-white truncate group-hover:underline underline-offset-4">
                                {trip.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {trip.destination && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {trip.destination}
                                  </span>
                                )}
                                {daysCount && daysCount > 0 && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                    <span>{daysCount} days</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                          </div>

                          {/* Countdown */}
                          {countdown && (
                            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium ${
                              countdown.isOngoing
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {countdown.isOngoing && (
                                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              )}
                              {countdown.text}
                            </div>
                          )}
                        </div>

                        {/* Thumbnail */}
                        {trip.cover_image && (
                          <div className="hidden sm:block flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                            <Image
                              src={trip.cover_image}
                              alt={trip.title}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* All Other Trips - Grid View */}
            {filteredTrips.filter(t => statusFilter !== 'all' || searchQuery || !['upcoming', 'ongoing'].includes(t.status || '')).length > 0 && (
              <section>
                {calendarTrips.length > 0 && statusFilter === 'all' && !searchQuery && (
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6">
                    All Trips
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTrips
                    .filter(t => statusFilter !== 'all' || searchQuery || !['upcoming', 'ongoing'].includes(t.status || ''))
                    .map((trip) => {
                      const statusConfig = getStatusConfig(trip.status);
                      const daysCount = calculateTripDays(trip.start_date, trip.end_date);
                      const startDate = trip.start_date ? parseISO(trip.start_date) : null;

                      return (
                        <Link
                          key={trip.id}
                          href={`/trips/${trip.id}`}
                          className="group relative block"
                        >
                          {/* Cover Image */}
                          <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                            {trip.cover_image ? (
                              <Image
                                src={trip.cover_image}
                                alt={trip.title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                                {trip.destination ? (
                                  <span className="text-lg font-light text-gray-400 dark:text-gray-500">
                                    {trip.destination}
                                  </span>
                                ) : (
                                  <Plane className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                )}
                              </div>
                            )}

                            {/* Subtle gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                            {/* Status Badge */}
                            {statusConfig && (
                              <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                {statusConfig.pulse && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                )}
                                {statusConfig.label}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="mt-4">
                            <h3 className="text-xl font-light text-gray-900 dark:text-white group-hover:underline underline-offset-4">
                              {trip.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                              {trip.destination && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {trip.destination}
                                </span>
                              )}
                              {startDate && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                  <span>{format(startDate, 'MMM d, yyyy')}</span>
                                </>
                              )}
                              {daysCount && daysCount > 0 && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                  <span>{daysCount} day{daysCount !== 1 ? 's' : ''}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
