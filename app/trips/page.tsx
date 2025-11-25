'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Calendar, Plane } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import UMActionPill from '@/components/ui/UMActionPill';
import HomeTripPlanner from '@/components/trip/HomeTripPlanner';
import type { Trip } from '@/types/trip';

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-light mb-8">Trips</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              Sign in to plan and organize your travels
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-sm hover:opacity-80 transition-opacity"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-6 md:px-10 py-16 min-h-screen bg-white dark:bg-[#050505]">
      <div className="w-full max-w-[1200px] mx-auto space-y-12">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Planner</p>
              <h1 className="text-3xl font-light text-gray-900 dark:text-white">Trips</h1>
            </div>
            <UMActionPill variant="primary" onClick={createTrip} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Quick Trip
            </UMActionPill>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Draft multi-day plans, then fine tune each itinerary.
          </p>
        </header>

        <section>
          <HomeTripPlanner />
        </section>

        {trips.length > 0 && (
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500">Total trips</p>
              <p className="text-2xl font-light mt-2">{trips.length}</p>
            </div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500">Planning</p>
              <p className="text-2xl font-light mt-2">
                {trips.filter(t => t.status === 'planning').length}
              </p>
            </div>
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-2xl font-light mt-2">
                {trips.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-medium text-gray-900 dark:text-white">Saved itineraries</h2>
              <p className="text-xs text-gray-500">Open an itinerary to refine days, flights, and hotels.</p>
            </div>
            <UMActionPill onClick={createTrip} disabled={creating}>
              <Plus className="w-4 h-4 mr-1" />
              New Trip
            </UMActionPill>
          </div>

          {trips.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Plane className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No trips yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                Start planning your next adventure by creating your first trip.
              </p>
              <UMActionPill variant="primary" onClick={createTrip} disabled={creating}>
                <Plus className="w-4 h-4 mr-2" />
                Create Trip
              </UMActionPill>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => router.push(`/trips/${trip.id}`)}
                  className="w-full rounded-3xl border border-gray-200 dark:border-gray-800 p-4 text-left hover:border-gray-900 dark:hover:border-white transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0">
                      {trip.cover_image ? (
                        <Image
                          src={trip.cover_image}
                          alt={trip.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-base font-medium text-gray-900 dark:text-white truncate">
                        {trip.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {trip.destination || 'Destination TBD'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {trip.start_date ? formatDate(trip.start_date) : 'No dates'}{' '}
                        {trip.end_date && `– ${formatDate(trip.end_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 capitalize">
                      <Plane className="w-3 h-3" />
                      {trip.status}
                    </span>
                    {trip.destination && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1">
                        <MapPin className="w-3 h-3" />
                        {trip.destination}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
