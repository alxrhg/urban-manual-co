'use client';

import { useEffect, useState } from 'react';
import { WifiOff, MapPin, Calendar, Plane, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Trip } from '@/types/trip';
import { formatDestinationsFromField } from '@/types/trip';

const TRIPS_CACHE_KEY = 'urban-manual-offline-trips';

interface CachedTripsData {
  trips: Trip[];
  cachedAt: string;
}

/**
 * Offline page that displays cached trips when the user is offline.
 * Trips are cached to localStorage when the user visits the trips page.
 */
export default function OfflinePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load cached trips
    try {
      const cached = localStorage.getItem(TRIPS_CACHE_KEY);
      if (cached) {
        const data: CachedTripsData = JSON.parse(cached);
        setTrips(data.trips);
        setCachedAt(data.cachedAt);
      }
    } catch (error) {
      console.error('Error loading cached trips:', error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.href = '/';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // If back online, show option to go home
  if (isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;re back online!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your connection has been restored.
          </p>
          <Button onClick={handleRetry} size="lg">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-20">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8 text-orange-600 dark:text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You&apos;re Offline
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          Don&apos;t worry! You can still view your saved trips while offline.
        </p>
      </div>

      {/* Cached Trips */}
      {trips.length > 0 ? (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Plane className="w-5 h-5" />
              Your Trips
            </h2>
            {cachedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last synced: {formatDate(cachedAt)}
              </span>
            )}
          </div>

          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {trip.title}
                    </h3>

                    {trip.destination && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {formatDestinationsFromField(trip.destination)}
                        </span>
                      </div>
                    )}

                    {(trip.start_date || trip.end_date) && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500 dark:text-gray-500">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          {formatDate(trip.start_date)}
                          {trip.end_date && ` - ${formatDate(trip.end_date)}`}
                        </span>
                      </div>
                    )}

                    {trip.description && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {trip.description}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full capitalize flex-shrink-0 ${getStatusColor(
                      trip.status
                    )}`}
                  >
                    {trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Plane className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Cached Trips
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Visit your trips page while online to cache them for offline viewing.
          </p>
        </div>
      )}

      {/* Retry Button */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
        <Button onClick={handleRetry} variant="outline" className="w-full" size="lg">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper function to cache trips for offline use.
 * Call this when trips are loaded on the trips page.
 */
export function cacheTripsForOffline(trips: Trip[]): void {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedTripsData = {
      trips,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(TRIPS_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error caching trips for offline:', error);
  }
}
