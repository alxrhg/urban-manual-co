"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import UMFeaturePill from "@/components/ui/UMFeaturePill";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { Loader2, AlertCircle, MapPin, Calendar, ChevronRight, Plane, Plus } from 'lucide-react';
import Image from 'next/image';
import { formatTripDateRange } from '@/lib/utils';

const LOADING_TIMEOUT = 15000; // 15 seconds

interface TripListDrawerProps {
  trips?: any[];
  onNewTrip?: () => void;
}

// Status badge styling
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return {
        label: 'Planning',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: 'bg-amber-50 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-300',
        dot: 'bg-amber-500',
      };
    case 'ongoing':
      return {
        label: 'Ongoing',
        bg: 'bg-green-50 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-300',
        dot: 'bg-green-500 animate-pulse',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-neutral-100 dark:bg-neutral-800',
        text: 'text-neutral-600 dark:text-neutral-400',
        dot: 'bg-neutral-400',
      };
    default:
      return {
        label: 'Planning',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        dot: 'bg-blue-500',
      };
  }
}

/**
 * TripListDrawer
 * Only the CONTENT that appears INSIDE <Drawer>.
 * Drawer shell (header, borders, style) is handled in DrawerMount.
 */
export default function TripListDrawer({ trips: propsTrips, onNewTrip }: TripListDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const openDrawer = useDrawerStore((s) => s.openDrawer);
  const closeDrawer = useDrawerStore((s) => s.closeDrawer);
  const [trips, setTrips] = useState<any[]>(propsTrips || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!propsTrips) {
      fetchTrips();
    } else {
      setTrips(propsTrips);
    }
  }, [propsTrips, fetchTrips]);

  const handleNewTrip = () => {
    if (onNewTrip) {
      onNewTrip();
    } else if (!user) {
      router.push('/auth/login');
    } else {
      closeDrawer();
      setTimeout(() => {
        router.push('/trips');
      }, 200);
    }
  };

  const handleSelectTrip = (trip: any) => {
    openDrawer("trip-overview", { trip });
  };

  const handleEditTrip = (trip: any) => {
    closeDrawer();
    setTimeout(() => {
      router.push(`/trips/${trip.id}`);
    }, 200);
  };

  if (loading) {
    return (
      <div className="px-6 py-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          <p className="text-xs text-neutral-500">Loading trips...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6">
        <div className="text-center py-12 space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
            <p className="text-xs text-neutral-500">{error}</p>
          </div>
          <UMActionPill onClick={fetchTrips}>
            Try Again
          </UMActionPill>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* MAIN CTA */}
      <button
        onClick={handleNewTrip}
        className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        New Trip
      </button>

      {/* LIST HEADER */}
      <div className="flex items-center justify-between">
        <UMSectionTitle>All Trips</UMSectionTitle>
        <UMActionPill
          onClick={() => {
            closeDrawer();
            setTimeout(() => {
              router.push('/trips');
            }, 200);
          }}
        >
          View All →
        </UMActionPill>
      </div>

      {/* TRIP LIST */}
      <div className="space-y-3">
        {trips.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-[16px] bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Plane className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              No trips yet
            </p>
            <UMFeaturePill onClick={handleNewTrip}>
              Create Trip
            </UMFeaturePill>
          </div>
        ) : (
          trips.map((trip) => {
            const tripName = trip.name || trip.title || 'Untitled Trip';
            const dateRange = formatTripDateRange(trip.start_date, trip.end_date);
            const coverImage = trip.cover_image || trip.coverImage;
            const statusConfig = getStatusConfig(trip.status);

            return (
              <button
                key={trip.id}
                onClick={() => handleSelectTrip(trip)}
                className="w-full border border-neutral-200 dark:border-neutral-700 rounded-[16px] overflow-hidden hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left bg-white dark:bg-neutral-900 group"
              >
                {/* Cover Image */}
                <div className="relative h-28 bg-neutral-100 dark:bg-neutral-800">
                  {coverImage ? (
                    <>
                      <Image
                        src={coverImage}
                        alt={tripName}
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text} backdrop-blur-sm`}>
                    <span className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
                    {statusConfig.label}
                  </div>
                </div>

                {/* Content */}
                <div className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {tripName}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                      {trip.destination && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {trip.destination}
                        </span>
                      )}
                      {dateRange && (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {dateRange}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
