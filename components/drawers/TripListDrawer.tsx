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
        bg: 'bg-blue-500/10 backdrop-blur-md',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: 'bg-amber-500/10 backdrop-blur-md',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
      };
    case 'ongoing':
      return {
        label: 'Ongoing',
        bg: 'bg-green-500/10 backdrop-blur-md',
        text: 'text-green-600 dark:text-green-400',
        dot: 'bg-green-500 animate-pulse',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-gray-500/10 backdrop-blur-md',
        text: 'text-gray-600 dark:text-gray-400',
        dot: 'bg-gray-400',
      };
    default:
      return {
        label: 'Planning',
        bg: 'bg-blue-500/10 backdrop-blur-md',
        text: 'text-blue-600 dark:text-blue-400',
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

  if (loading) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        <p className="text-xs text-neutral-500">Loading trips...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-12 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Failed to load</p>
          <p className="text-xs text-neutral-500">{error}</p>
        </div>
        <UMActionPill onClick={fetchTrips}>
          Try Again
        </UMActionPill>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 space-y-6">
      {/* MAIN CTA */}
      <button
        onClick={handleNewTrip}
        className="w-full h-12 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Create New Trip
      </button>

      {/* LIST HEADER */}
      <div className="flex items-center justify-between px-1">
        <UMSectionTitle>My Trips</UMSectionTitle>
        <button
          onClick={() => {
            closeDrawer();
            setTimeout(() => {
              router.push('/trips');
            }, 200);
          }}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
        >
          View All
        </button>
      </div>

      {/* TRIP LIST */}
      <div className="space-y-3">
        {trips.length === 0 ? (
          <div className="text-center py-16 px-6 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <Plane className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              Start planning your next adventure
            </p>
            <button 
              onClick={handleNewTrip}
              className="text-xs font-medium text-black dark:text-white underline underline-offset-4 decoration-neutral-300 dark:decoration-neutral-700 hover:decoration-black dark:hover:decoration-white transition-all"
            >
              Start Planning
            </button>
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
                className="group relative w-full border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-left bg-white dark:bg-neutral-900"
              >
                <div className="flex">
                  {/* Left: Image */}
                  <div className="relative w-24 h-24 sm:w-28 sm:h-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={tripName}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="120px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
                      </div>
                    )}
                  </div>

                  {/* Right: Content */}
                  <div className="flex-1 p-3.5 flex flex-col justify-between min-h-[96px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate pr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {tripName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          {statusConfig && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                              <span className={`w-1 h-1 rounded-full ${statusConfig.dot}`} />
                              {statusConfig.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-neutral-100 dark:border-neutral-800">
                      <div className="flex flex-col text-xs text-neutral-500">
                        {trip.destination && (
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {trip.destination}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-400">
                        {dateRange ? (
                          <span>{dateRange}</span>
                        ) : (
                          <span className="italic">No dates</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
