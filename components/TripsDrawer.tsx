'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { TripPlanner } from '@/components/TripPlanner';
import { Loader2, AlertCircle } from 'lucide-react';
import { useDrawer } from '@/contexts/DrawerContext';

const LOADING_TIMEOUT = 15000; // 15 seconds

export function TripsDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('trips');
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const supabaseClient = createClient();
      if (!supabaseClient) {
        throw new Error('Failed to initialize database connection');
      }

      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), LOADING_TIMEOUT);
      });

      const fetchPromise = (async () => {
        const { data, error } = await supabaseClient
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTrips(data || []);
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error: any) {
      console.error('Error fetching trips:', error);
      setError(error.message || 'Failed to load trips. Please try again.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTrips();
    } else {
      // Reset state when drawer closes
      setError(null);
    }
  }, [isOpen, fetchTrips]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return null;
    const startFormatted = formatDate(start);
    const endFormatted = formatDate(end);
    if (startFormatted && endFormatted) {
      return `${startFormatted} – ${endFormatted}`;
    }
    return startFormatted || endFormatted;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning':
        return 'Planning';
      case 'upcoming':
        return 'Upcoming';
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      default:
        return status || 'Planning';
    }
  };

  const handleSelectTrip = (trip: any) => {
    closeDrawer();
    setTimeout(() => {
      router.push(`/trips/${trip.id}`);
    }, 200);
  };

  const handleNewTrip = () => {
    if (!user) {
      router.push('/auth/login');
    } else {
      setEditingTripId(null);
      setShowTripDialog(true);
    }
  };

  const handleViewAllTrips = () => {
    closeDrawer();
    setTimeout(() => {
      router.push('/trips');
    }, 200);
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={closeDrawer}
        desktopWidth="420px"
        position="right"
        style="solid"
        backdropOpacity="15"
        keepStateOnClose={true}
      >
        <DrawerHeader
          title="Your Trips"
          leftAccessory={
            <button
              className="text-sm opacity-70 hover:opacity-100 transition-opacity"
              onClick={closeDrawer}
            >
              ←
            </button>
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--um-text-muted)]" />
            <p className="text-sm text-[var(--um-text-muted)]">Loading trips...</p>
          </div>
        ) : error ? (
          <DrawerSection>
            <div className="text-center py-12 space-y-4">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
                <p className="text-xs text-[var(--um-text-muted)]">{error}</p>
              </div>
              <button
                onClick={fetchTrips}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </DrawerSection>
        ) : (
          <>
            {/* NEW TRIP BUTTON */}
            <DrawerSection bordered>
              <button
                onClick={handleNewTrip}
                className="w-full bg-black dark:bg-white text-white dark:text-black rounded-xl py-3 font-medium text-sm hover:opacity-90 transition-opacity"
              >
                + New Trip
              </button>
            </DrawerSection>

            {/* TRIP LIST */}
            {trips.length === 0 ? (
              <DrawerSection>
                <div className="text-center py-12 border border-dashed border-[var(--um-border)] rounded-2xl">
                  <p className="text-sm text-[var(--um-text-muted)] mb-4">You have no trips yet.</p>
                  <button
                    onClick={handleNewTrip}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Create Trip
                  </button>
                </div>
              </DrawerSection>
            ) : (
              <DrawerSection className="space-y-4">
                {trips.map((trip) => {
                  const dateRange = formatDateRange(trip.start_date, trip.end_date);
                  const status = getStatusLabel(trip.status || 'planning');

                  return (
                    <div
                      key={trip.id}
                      onClick={() => handleSelectTrip(trip)}
                      className="border border-[var(--um-border)] rounded-2xl p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer space-y-1 bg-white dark:bg-gray-950"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-900 dark:text-white">{trip.title}</p>
                        <p className="text-xs text-[var(--um-text-muted)]">{status}</p>
                      </div>
                      {dateRange && (
                        <p className="text-xs text-[var(--um-text-muted)]">{dateRange}</p>
                      )}
                    </div>
                  );
                })}
              </DrawerSection>
            )}

            {/* VIEW ALL */}
            {trips.length > 0 && (
              <DrawerSection>
                <button
                  onClick={handleViewAllTrips}
                  className="w-full border border-[var(--um-border)] rounded-xl py-3 font-medium text-sm bg-white dark:bg-gray-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors text-gray-900 dark:text-white"
                >
                  View All Trips
                </button>
              </DrawerSection>
            )}
          </>
        )}
      </Drawer>

      {/* Trip Planner - Only render when open */}
      {showTripDialog && (
        <TripPlanner
          isOpen={true}
          tripId={editingTripId || undefined}
          onClose={() => {
            setShowTripDialog(false);
            setEditingTripId(null);
            fetchTrips();
          }}
        />
      )}
    </>
  );
}
