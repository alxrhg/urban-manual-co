'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronRight, X, Loader2, Calendar, MapPin, Plus, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDestinationsFromField } from '@/types/trip';

interface Trip {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface InlineTripPromptProps {
  destinationSlug: string;
  destinationName: string;
  destinationCity?: string;
  onAddToTrip: (tripId: string, tripTitle: string) => void;
  onDismiss: () => void;
  onCreateTrip?: () => void;
  className?: string;
}

/**
 * Inline trip prompt that appears after saving a destination
 * Shows relevant upcoming trips and allows quick add or dismiss
 */
export function InlineTripPrompt({
  destinationSlug,
  destinationName,
  destinationCity,
  onAddToTrip,
  onDismiss,
  onCreateTrip,
  className = '',
}: InlineTripPromptProps) {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load user's upcoming/planning trips
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadTrips() {
      try {
        const supabase = createClient();
        if (!supabase) return;

        // Get trips that are planning or upcoming, ordered by start_date
        const { data, error } = await supabase
          .from('trips')
          .select('id, title, destination, start_date, end_date')
          .eq('user_id', user!.id)
          .in('status', ['planning', 'upcoming'])
          .order('start_date', { ascending: true, nullsFirst: false })
          .limit(5);

        if (error) throw error;

        // Sort trips: matching city first, then by date
        const sortedTrips = (data || []).sort((a, b) => {
          const aMatches = destinationCity &&
            formatDestinationsFromField(a.destination).toLowerCase().includes(destinationCity.toLowerCase());
          const bMatches = destinationCity &&
            formatDestinationsFromField(b.destination).toLowerCase().includes(destinationCity.toLowerCase());

          if (aMatches && !bMatches) return -1;
          if (!aMatches && bMatches) return 1;
          return 0;
        });

        setTrips(sortedTrips);
      } catch (error) {
        console.error('Error loading trips:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [user, destinationCity]);

  const handleAddToTrip = useCallback(async (tripId: string, tripTitle: string) => {
    if (!user || adding) return;

    setAdding(tripId);
    try {
      const supabase = createClient();
      if (!supabase) return;

      // Get the max order_index for day 1
      const { data: existingItems } = await supabase
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('day', 1)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      // Add to itinerary
      const { error } = await supabase
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destinationSlug,
          title: destinationName,
          day: 1,
          order_index: nextOrder,
        });

      if (error) throw error;

      // Update saved_places with trip_id
      await supabase
        .from('saved_places')
        .update({
          trip_id: tripId,
          intent: 'for_trip',
        })
        .eq('user_id', user.id)
        .eq('destination_slug', destinationSlug);

      setSuccess(tripId);
      setTimeout(() => {
        onAddToTrip(tripId, tripTitle);
      }, 800);
    } catch (error) {
      console.error('Error adding to trip:', error);
      setAdding(null);
    }
  }, [user, adding, destinationSlug, destinationName, onAddToTrip]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if trip destination matches the saved destination's city
  const tripMatchesCity = (trip: Trip) => {
    if (!destinationCity) return false;
    const tripDest = formatDestinationsFromField(trip.destination).toLowerCase();
    return tripDest.includes(destinationCity.toLowerCase());
  };

  if (loading) {
    return (
      <div className={`mt-3 p-3 bg-stone-50 dark:bg-stone-900 rounded-xl animate-in fade-in ${className}`}>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading trips...</span>
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className={`mt-3 p-3 bg-stone-50 dark:bg-stone-900 rounded-xl animate-in fade-in slide-in-from-top-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-600 dark:text-stone-400">
              Planning a trip to {destinationCity || 'somewhere new'}?
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onCreateTrip && (
              <button
                onClick={onCreateTrip}
                className="px-2.5 py-1 text-xs font-medium text-stone-900 dark:text-white bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                <Plus className="w-3 h-3 inline mr-1" />
                Create trip
              </button>
            )}
            <button
              onClick={onDismiss}
              className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find the best matching trip
  const matchingTrip = trips.find(tripMatchesCity);
  const primaryTrip = matchingTrip || trips[0];
  const otherTrips = trips.filter(t => t.id !== primaryTrip.id).slice(0, 2);

  return (
    <div className={`mt-3 p-3 bg-stone-50 dark:bg-stone-900 rounded-xl animate-in fade-in slide-in-from-top-2 ${className}`}>
      {/* Primary trip suggestion */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {matchingTrip ? (
            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
          )}
          <span className="text-xs text-stone-600 dark:text-stone-400 truncate">
            {matchingTrip
              ? `Add to your ${formatDestinationsFromField(primaryTrip.destination)} trip?`
              : 'Add to a trip?'
            }
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => handleAddToTrip(primaryTrip.id, primaryTrip.title)}
            disabled={adding !== null}
            className="px-3 py-1.5 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-stone-900 rounded-full hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {adding === primaryTrip.id ? (
              success === primaryTrip.id ? (
                <>
                  <Check className="w-3 h-3" />
                  Added
                </>
              ) : (
                <Loader2 className="w-3 h-3 animate-spin" />
              )
            ) : (
              <>
                {primaryTrip.title}
                {primaryTrip.start_date && (
                  <span className="opacity-70">
                    · {formatDate(primaryTrip.start_date)}
                  </span>
                )}
              </>
            )}
          </button>

          <button
            onClick={onDismiss}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
            aria-label="Just save"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Other trips (collapsed) */}
      {otherTrips.length > 0 && (
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-stone-400 uppercase tracking-wide">
              Or:
            </span>
            {otherTrips.map(trip => (
              <button
                key={trip.id}
                onClick={() => handleAddToTrip(trip.id, trip.title)}
                disabled={adding !== null}
                className="px-2 py-1 text-[10px] text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-full hover:border-stone-300 dark:hover:border-stone-600 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {adding === trip.id ? (
                  success === trip.id ? (
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                  ) : (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  )
                ) : (
                  <>
                    <MapPin className="w-2.5 h-2.5" />
                    {formatDestinationsFromField(trip.destination) || trip.title}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
