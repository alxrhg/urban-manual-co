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
      <main className="um-page">
        <PageLoader />
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="um-page">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-sm text-center">
            <div className="um-icon-box w-20 h-20 rounded-full mb-6 mx-auto">
              <Plane className="h-8 w-8" />
            </div>
            <h1 className="um-heading text-center">Trips</h1>
            <p className="um-description mb-8">
              Sign in to plan and organize your travels
            </p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full um-btn-primary-lg"
            >
              Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="um-page">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header - Matches account page */}
        <div className="um-page-header">
          <div className="flex items-center justify-between mb-2">
            <h1 className="um-heading">Trips</h1>
            <UMActionPill variant="primary" onClick={createTrip} disabled={creating}>
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              New Trip
            </UMActionPill>
          </div>
          <p className="um-description">
            Plan and organize your travels
          </p>
        </div>

        {/* Stats - Like account page */}
        {trips.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="um-stat-card">
              <div className="um-stat-value">{trips.length}</div>
              <div className="um-stat-label">Total Trips</div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-value">
                {trips.filter(t => t.status === 'planning').length}
              </div>
              <div className="um-stat-label">Planning</div>
            </div>
            <div className="um-stat-card">
              <div className="um-stat-value">
                {trips.filter(t => t.status === 'completed').length}
              </div>
              <div className="um-stat-label">Completed</div>
            </div>
          </div>
        )}

        {/* Trip List */}
        {trips.length === 0 ? (
          <div className="um-empty-state">
            <div className="um-icon-box w-16 h-16 rounded-full mx-auto mb-6">
              <Plane className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              No trips yet
            </h3>
            <p className="um-empty-state-text max-w-sm mx-auto">
              Start planning your next adventure by creating your first trip.
            </p>
            <UMActionPill variant="primary" onClick={createTrip} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" />
              Create Trip
            </UMActionPill>
          </div>
        ) : (
          <div className="um-cards-grid">
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
