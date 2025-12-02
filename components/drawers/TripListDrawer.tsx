"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { Loader2, Compass, MapPin, Plus, ArrowRight, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { formatTripDateRange } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';

const LOADING_TIMEOUT = 15000;

interface TripListDrawerProps {
  trips?: any[];
  onNewTrip?: () => void;
}

// Status badge styling - Square UI inspired
function getStatusConfig(status?: string) {
  switch (status) {
    case 'planning':
      return {
        label: 'Planning',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
        stripeColor: '#3b82f6',
      };
    case 'upcoming':
      return {
        label: 'Upcoming',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
        stripeColor: '#f59e0b',
      };
    case 'ongoing':
      return {
        label: 'Ongoing',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500 animate-pulse',
        stripeColor: '#10b981',
      };
    case 'completed':
      return {
        label: 'Completed',
        bg: 'bg-stone-100 dark:bg-stone-800/50',
        text: 'text-stone-600 dark:text-stone-400',
        dot: 'bg-stone-400',
        stripeColor: '#78716c',
      };
    default:
      return {
        label: 'Planning',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
        stripeColor: '#3b82f6',
      };
  }
}

// Trip card with Square UI stripe pattern
function TripCard({ trip, onClick }: { trip: any; onClick: () => void }) {
  const tripName = trip.name || trip.title || 'Untitled Trip';
  const dateRange = formatTripDateRange(trip.start_date, trip.end_date);
  const coverImage = trip.cover_image || trip.coverImage;
  const statusConfig = getStatusConfig(trip.status);
  const stripePattern = `repeating-linear-gradient(90deg, ${statusConfig.stripeColor} 0px, ${statusConfig.stripeColor} 4px, transparent 4px, transparent 8px)`;

  return (
    <button
      onClick={onClick}
      className="group relative w-full bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-stone-300 dark:hover:border-gray-700 hover:shadow-md transition-all text-left"
    >
      <div className="flex">
        {/* Left: Image */}
        <div className="relative w-24 h-24 bg-stone-100 dark:bg-gray-800 flex-shrink-0">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={tripName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="96px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-stone-300 dark:text-gray-600" />
            </div>
          )}
        </div>

        {/* Right: Content */}
        <div className="flex-1 p-3.5 flex flex-col justify-between min-h-[96px]">
          <div>
            <h4 className="font-semibold text-sm text-stone-900 dark:text-white truncate pr-2 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
              {tripName}
            </h4>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100 dark:border-gray-800">
            <div className="text-xs text-stone-500 dark:text-gray-400 truncate max-w-[120px]">
              {trip.destination ? (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  {formatDestinationsFromField(trip.destination)}
                </span>
              ) : (
                <span className="italic">No destination</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-stone-400 dark:text-gray-500">
              {dateRange || <span className="italic">No dates</span>}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>

      {/* Square UI stripe at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: stripePattern }}
      />
    </button>
  );
}

/**
 * TripListDrawer - Redesigned to match SavedPlacesDrawer style
 * Content only - Drawer shell handled by DrawerMount
 */
export default function TripListDrawer({ trips: propsTrips, onNewTrip }: TripListDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
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

  const handleNewTrip = async () => {
    if (onNewTrip) {
      onNewTrip();
      return;
    }

    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          title: 'New Trip',
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;

      closeDrawer();
      if (data) {
        setTimeout(() => {
          router.push(`/trips/${data.id}`);
        }, 200);
      }
    } catch (err) {
      console.error('Error creating trip:', err);
    }
  };

  const handleSelectTrip = (trip: any) => {
    closeDrawer();
    setTimeout(() => {
      router.push(`/trips/${trip.id}`);
    }, 200);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-16">
        <Loader2 className="w-8 h-8 sm:w-6 sm:h-6 animate-spin text-stone-300 dark:text-gray-600" />
        <p className="mt-4 text-base sm:text-sm text-stone-500 dark:text-gray-400">
          Loading trips...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-16 px-8 text-center">
        <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-5">
          <Compass className="w-9 h-9 sm:w-7 sm:h-7 text-red-400 dark:text-red-500" />
        </div>
        <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
          Failed to load
        </h3>
        <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 max-w-[240px] mb-6">
          {error}
        </p>
        <button
          onClick={fetchTrips}
          className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 sm:py-16 px-8 text-center">
        <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-5">
          <Compass className="w-9 h-9 sm:w-7 sm:h-7 text-stone-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
          No trips yet
        </h3>
        <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 max-w-[240px] mb-6">
          Start planning your next adventure
        </p>
        <button
          onClick={handleNewTrip}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Trip
        </button>
      </div>
    );
  }

  // Main content
  return (
    <>
      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-safe">
        {/* New Trip Button */}
        <div className="px-4 sm:px-5 pt-4 pb-2">
          <button
            onClick={handleNewTrip}
            className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-base sm:text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all min-h-[52px] sm:min-h-[44px] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Trip
          </button>
        </div>

        {/* Trip List */}
        <div className="px-4 sm:px-5 space-y-3 pb-4 pt-2">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onClick={() => handleSelectTrip(trip)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-100 dark:border-gray-900">
        <button
          onClick={() => {
            closeDrawer();
            setTimeout(() => {
              router.push('/trips');
            }, 200);
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-h-[52px] sm:min-h-[44px]"
        >
          View all trips
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
