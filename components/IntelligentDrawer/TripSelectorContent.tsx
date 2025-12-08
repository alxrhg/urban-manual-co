'use client';

import { memo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Plus,
  ChevronRight,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { useAuth } from '@/contexts/AuthContext';

/**
 * TripSelectorContent - Choose from saved trips or create new
 */
const TripSelectorContent = memo(function TripSelectorContent() {
  const { user } = useAuth();
  const { navigate, close } = useIntelligentDrawer();
  const {
    savedTrips,
    isLoadingTrips,
    refreshSavedTrips,
    switchToTrip,
    startTrip,
  } = useTripBuilder();

  // Refresh trips on mount
  useEffect(() => {
    if (user) {
      refreshSavedTrips();
    }
  }, [user, refreshSavedTrips]);

  const handleSelectTrip = useCallback(
    async (tripId: string) => {
      await switchToTrip(tripId);
      navigate('trip', { tripId });
    },
    [switchToTrip, navigate]
  );

  const handleNewTrip = useCallback(() => {
    startTrip('New Trip', 3);
    navigate('trip', {});
  }, [startTrip, navigate]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-[15px] font-medium text-gray-900 dark:text-white mb-2">
          Sign in to access your trips
        </p>
        <p className="text-[13px] text-gray-500 text-center">
          Create an account to save and manage your travel plans
        </p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">
          Your Trips
        </h2>
        <p className="text-[13px] text-gray-500 mt-1">
          Select a trip to edit or create a new one
        </p>
      </div>

      {/* New Trip Button */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={handleNewTrip}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 dark:bg-black/10 flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-[14px] font-medium">Create New Trip</p>
            <p className="text-[12px] opacity-70">Start planning your next adventure</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto opacity-50" />
        </button>
      </div>

      {/* Saved Trips */}
      <div className="px-5 py-4">
        {isLoadingTrips ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[13px] text-gray-400">No saved trips yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => handleSelectTrip(trip.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                  {trip.cover_image ? (
                    <Image
                      src={trip.cover_image}
                      alt={trip.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                    {trip.title}
                  </p>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <span>{trip.destination}</span>
                    <span>·</span>
                    <span>{trip.itemCount} places</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default TripSelectorContent;
