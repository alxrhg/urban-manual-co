'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, MapPin, Calendar, Plane } from 'lucide-react';
import { PageLoader } from '@/components/LoadingStates';
import UMActionPill from '@/components/ui/UMActionPill';
import TripCard from '@/components/trips/TripCard';
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

        {/* Stats - Like account page */}
        {trips.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="text-2xl font-light mb-1">{trips.length}</div>
              <div className="text-xs text-gray-500">Total Trips</div>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="text-2xl font-light mb-1">
                {trips.filter(t => t.status === 'planning').length}
              </div>
              <div className="text-xs text-gray-500">Planning</div>
            </div>
            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <div className="text-2xl font-light mb-1">
                {trips.filter(t => t.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Plane className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No trips yet
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
              Start planning your next adventure by creating your first trip.
            </p>
            <UMActionPill variant="primary" onClick={createTrip} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              Create Trip
            </UMActionPill>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
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
