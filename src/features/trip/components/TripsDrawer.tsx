'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { Drawer } from '@/ui/Drawer';
import { Loader2, Compass, ChevronLeft, X, ArrowRight, MapPin, Plus, Plane } from 'lucide-react';
import Image from 'next/image';
import { formatTripDateRange } from '@/lib/utils';
import { formatDestinationsFromField } from '@/types/trip';
import { Button } from '@/ui/button';

interface Trip {
  id: string;
  name?: string;
  title?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  cover_image?: string;
  coverImage?: string;
  status?: string;
}

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

export function TripsDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer, goBack, canGoBack } = useDrawer();
  const isOpen = isDrawerOpen('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      return;
    }

    setLoading(true);
    try {
      const supabaseClient = createClient();
      const { data, error } = await supabaseClient
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchTrips();
    }
  }, [isOpen, fetchTrips]);

  const handleSelectTrip = (tripId: string) => {
    closeDrawer();
    setTimeout(() => router.push(`/trips/${tripId}`), 200);
  };

  const handleNewTrip = async () => {
    if (!user) {
      closeDrawer();
      router.push('/auth/login');
      return;
    }

    try {
      const supabaseClient = createClient();
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
        setTimeout(() => router.push(`/trips/${data.id}`), 200);
      }
    } catch (err) {
      console.error('Error creating trip:', err);
    }
  };

  const handleClose = canGoBack ? goBack : closeDrawer;

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} position="right">
      <div className="h-full flex flex-col bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-6 sm:pt-5 pb-4">
          <div className="flex items-center gap-3">
            {canGoBack ? (
              <button
                onClick={goBack}
                className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-gray-400" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-stone-100 dark:bg-gray-800">
                <Compass className="w-5 h-5 text-stone-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-lg font-semibold text-stone-900 dark:text-white">
                Trips
              </h1>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-gray-400">
                {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 sm:p-2 rounded-full bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700 hover:text-stone-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* New Trip Button */}
        <div className="px-5 sm:px-6 pb-4">
          <Button onClick={handleNewTrip} className="w-full h-12 rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-safe">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16">
              <Loader2 className="w-8 h-8 sm:w-6 sm:h-6 animate-spin text-stone-300 dark:text-gray-600" />
              <p className="mt-4 text-base sm:text-sm text-stone-500 dark:text-gray-400">
                Loading trips...
              </p>
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 sm:py-16 px-8 text-center">
              <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center mb-5">
                <Plane className="w-9 h-9 sm:w-7 sm:h-7 text-stone-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
                No trips yet
              </h3>
              <p className="text-base sm:text-sm text-stone-500 dark:text-gray-400 max-w-[240px]">
                Start planning your next adventure
              </p>
            </div>
          ) : (
            <div className="px-4 sm:px-5 space-y-3 pb-4">
              {trips.map((trip) => {
                const tripName = trip.name || trip.title || 'Untitled Trip';
                const dateRange = formatTripDateRange(trip.start_date, trip.end_date);
                const coverImage = trip.cover_image || trip.coverImage;
                const statusConfig = getStatusConfig(trip.status);

                return (
                  <button
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip.id)}
                    className="group relative w-full border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all text-left bg-white dark:bg-gray-900"
                  >
                    <div className="flex">
                      {/* Left: Image */}
                      <div className="relative w-24 h-24 sm:w-28 sm:h-full bg-gray-100 dark:bg-gray-800 flex-shrink-0 self-center">
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
                            <MapPin className="w-6 h-6 text-gray-300 dark:text-gray-600" />
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

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                          <div className="flex flex-col text-xs text-gray-500">
                            {trip.destination && (
                              <span className="flex items-center gap-1 truncate max-w-[120px]">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {formatDestinationsFromField(trip.destination)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
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
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {trips.length > 0 && (
          <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-100 dark:border-gray-900">
            <button
              onClick={() => {
                closeDrawer();
                router.push('/trips');
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-3 rounded-xl text-base sm:text-sm font-medium text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-800 active:bg-stone-200 dark:active:bg-gray-700 transition-colors min-h-[52px] sm:min-h-[44px]"
            >
              View all trips
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
