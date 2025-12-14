'use client';

import { useState, useEffect, memo } from 'react';
import { X, Plus, MapPin, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { formatDestinationsFromField } from '@/types/trip';
import { toast } from '@/ui/sonner';

interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  cover_image: string | null;
}

interface QuickTripSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  destinationSlug: string;
  destinationName: string;
  destinationCity?: string;
}

/**
 * Quick trip selector modal for adding destinations to trips
 * Reduces friction by showing a simple list of trips to choose from
 */
export const QuickTripSelector = memo(function QuickTripSelector({
  isOpen,
  onClose,
  destinationSlug,
  destinationName,
  destinationCity,
}: QuickTripSelectorProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    async function loadTrips() {
      setLoading(true);
      try {
        const supabaseClient = createClient();
        const { data, error } = await supabaseClient
          .from('trips')
          .select('id, name, destination, start_date, cover_image')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setTrips(data || []);
      } catch (error) {
        console.error('Error loading trips:', error);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [isOpen, user]);

  const handleAddToTrip = async (tripId: string) => {
    if (!user) return;

    setAdding(tripId);
    try {
      const supabaseClient = createClient();

      // Get the max order_index for day 1 (default day)
      const { data: existingItems } = await supabaseClient
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('day', 1)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrder = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      // Add to itinerary_items
      const { error } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: tripId,
          destination_slug: destinationSlug,
          title: destinationName,
          day: 1,
          order_index: nextOrder,
          item_type: 'activity',
        });

      if (error) throw error;

      setSuccess(tripId);
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1000);
    } catch (error) {
      console.error('Error adding to trip:', error);
      toast.error('Failed to add to trip. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  const handleCreateTrip = async () => {
    if (!user) return;

    setAdding('new');
    try {
      const supabaseClient = createClient();

      // Create a new trip
      const { data: newTrip, error: tripError } = await supabaseClient
        .from('trips')
        .insert({
          user_id: user.id,
          name: destinationCity ? `Trip to ${destinationCity}` : 'New Trip',
          destination: destinationCity || null,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Add the destination as the first item
      const { error: itemError } = await supabaseClient
        .from('itinerary_items')
        .insert({
          trip_id: newTrip.id,
          destination_slug: destinationSlug,
          title: destinationName,
          day: 1,
          order_index: 0,
          item_type: 'activity',
        });

      if (itemError) throw itemError;

      setSuccess('new');
      setTimeout(() => {
        onClose();
        router.push(`/trips/${newTrip.id}`);
      }, 800);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error('Failed to create trip. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-md bg-white dark:bg-stone-900 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="text-lg font-medium text-stone-900 dark:text-white">Add to Trip</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {destinationName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ) : (
            <>
              {/* Create New Trip */}
              <button
                onClick={handleCreateTrip}
                disabled={adding !== null}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all disabled:opacity-50"
              >
                {adding === 'new' ? (
                  success === 'new' ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
                    </div>
                  )
                ) : (
                  <div className="w-10 h-10 rounded-full bg-stone-900 dark:bg-white flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white dark:text-stone-900" />
                  </div>
                )}
                <div className="flex-1 text-left">
                  <p className="font-medium text-stone-900 dark:text-white">Create New Trip</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Start planning a new adventure
                  </p>
                </div>
              </button>

              {/* Existing Trips */}
              {trips.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2 px-1">
                    Your Trips
                  </p>
                  {trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => handleAddToTrip(trip.id)}
                      disabled={adding !== null}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-all disabled:opacity-50"
                    >
                      {adding === trip.id ? (
                        success === trip.id ? (
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-stone-500" />
                          </div>
                        )
                      ) : trip.cover_image ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
                          <img
                            src={trip.cover_image}
                            alt={trip.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-stone-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-stone-900 dark:text-white truncate">{trip.name}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                          {formatDestinationsFromField(trip.destination) || 'No destination set'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {trips.length === 0 && (
                <p className="text-center text-sm text-stone-500 dark:text-stone-400 py-4">
                  You haven't created any trips yet.
                  <br />
                  Start by creating your first trip above!
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
