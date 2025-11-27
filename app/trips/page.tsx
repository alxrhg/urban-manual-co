'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Calendar, Plane, Search, X, SlidersHorizontal } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import UMActionPill from '@/components/ui/UMActionPill';
import TripCard from '@/components/trips/TripCard';
import type { Trip } from '@/types/trip';

type TripStatus = 'all' | 'planning' | 'upcoming' | 'ongoing' | 'completed';

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
      // Search filter
      const matchesSearch = searchQuery === '' ||
        trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trip.destination && trip.destination.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [trips, searchQuery, statusFilter]);

  // Stats for display
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
      <main className="w-full px-6 md:px-10 py-20">
        <PageLoader />
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="w-full px-6 md:px-10 py-20">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-6 mx-auto">
              <Plane className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-2xl font-light mb-4">Trips</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
              Sign in to plan and organize your travels
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-20 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header - Matches account page */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-light">Trips</h1>
            <UMActionPill variant="primary" onClick={createTrip} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              New Trip
            </UMActionPill>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Plan and organize your travels
          </p>
        </div>

        {/* Stats & Filters */}
        {trips.length > 0 && (
          <div className="space-y-6 mb-12">
            {/* Stats Row */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'all'
                    ? 'bg-black dark:bg-white text-white dark:text-black shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All <span className="ml-1.5 opacity-70">{stats.total}</span>
              </button>
              <button
                onClick={() => setStatusFilter('planning')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'planning'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                }`}
              >
                Planning <span className="ml-1.5 opacity-70">{stats.planning}</span>
              </button>
              <button
                onClick={() => setStatusFilter('upcoming')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'upcoming'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                }`}
              >
                Upcoming <span className="ml-1.5 opacity-70">{stats.upcoming}</span>
              </button>
              {stats.ongoing > 0 && (
                <button
                  onClick={() => setStatusFilter('ongoing')}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    statusFilter === 'ongoing'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40'
                  }`}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-current mr-1.5 animate-pulse" />
                  Ongoing <span className="ml-1.5 opacity-70">{stats.ongoing}</span>
                </button>
              )}
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                }`}
              >
                Completed <span className="ml-1.5 opacity-70">{stats.completed}</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search trips by name or destination..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center shadow-sm">
              <Plane className="w-10 h-10 text-violet-500 dark:text-violet-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Plan your next adventure
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto leading-relaxed">
              Create a trip to organize your itinerary, save places, add flights, and let AI help you discover the best spots.
            </p>
            <UMActionPill variant="primary" onClick={createTrip} disabled={creating} className="!py-3 !px-6">
              {creating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create Your First Trip
            </UMActionPill>

            {/* Features hint */}
            <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 uppercase tracking-wider font-medium">What you can do</p>
              <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-full">
                  <MapPin className="w-3.5 h-3.5" /> Save places
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-full">
                  <Plane className="w-3.5 h-3.5" /> Track flights
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-full">
                  <Calendar className="w-3.5 h-3.5" /> Day-by-day itinerary
                </span>
              </div>
            </div>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Search className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No matching trips
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? `No trips found for "${searchQuery}"`
                : `No ${statusFilter} trips found`}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-sm font-medium text-black dark:text-white underline underline-offset-4 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={{
                  id: trip.id,
                  name: trip.title,
                  coverImage: trip.cover_image,
                  city: trip.destination || undefined,
                  startDate: trip.start_date || undefined,
                  endDate: trip.end_date || undefined,
                  status: trip.status,
                }}
                onView={() => router.push(`/trips/${trip.id}`)}
                onEdit={() => router.push(`/trips/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
