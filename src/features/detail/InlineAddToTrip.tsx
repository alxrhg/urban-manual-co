'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import type { Trip, ItineraryItemNotes } from '@/domain/types/trip';

interface InlineAddToTripProps {
  destinationSlug: string;
  destinationName: string;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSuccess: (tripTitle: string, day?: number) => void;
  onError: (message: string) => void;
  isAddedToTrip: boolean;
}

interface TripWithDetails extends Trip {
  _itinerary_count?: number;
  _days?: number;
}

export function InlineAddToTrip({
  destinationSlug,
  destinationName,
  isExpanded,
  onExpandedChange,
  onSuccess,
  onError,
  isAddedToTrip,
}: InlineAddToTripProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [adding, setAdding] = useState(false);
  const [successState, setSuccessState] = useState<{ tripTitle: string } | null>(null);

  // Fetch trips when expanded
  useEffect(() => {
    if (isExpanded && user) {
      fetchTrips();
    }
  }, [isExpanded, user]);

  // Reset state when collapsed
  useEffect(() => {
    if (!isExpanded) {
      setSelectedTrip(null);
      setSelectedDay(1);
    }
  }, [isExpanded]);

  async function fetchTrips() {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch trips with itinerary counts
      const { data: tripsData, error } = await supabase
        .from('trips')
        .select(`
          *,
          itinerary_items(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process trips to add item counts and day counts
      const processedTrips = (tripsData || []).map(trip => {
        const itemCount = trip.itinerary_items?.[0]?.count || 0;
        // Calculate days from date range or default to 1
        let days = 1;
        if (trip.start_date && trip.end_date) {
          const start = new Date(trip.start_date);
          const end = new Date(trip.end_date);
          days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        }
        return {
          ...trip,
          _itinerary_count: itemCount,
          _days: days,
        };
      });

      setTrips(processedTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      onError('Failed to load trips');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToTrip() {
    if (!selectedTrip || !user || !destinationSlug) return;

    setAdding(true);
    try {
      const supabase = createClient();

      // Get the next order_index for the selected day
      const { data: existingItems, error: queryError } = await supabase
        .from('itinerary_items')
        .select('order_index')
        .eq('trip_id', selectedTrip.id)
        .eq('day', selectedDay)
        .order('order_index', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) throw queryError;

      const nextOrder = (existingItems?.order_index ?? -1) + 1;

      // Prepare notes data
      const notesData: ItineraryItemNotes = {
        raw: '',
      };

      // Insert the itinerary item
      const { error: insertError } = await supabase
        .from('itinerary_items')
        .insert({
          trip_id: selectedTrip.id,
          destination_slug: destinationSlug,
          day: selectedDay,
          order_index: nextOrder,
          title: destinationName,
          description: null,
          notes: JSON.stringify(notesData),
        });

      if (insertError) throw insertError;

      // Show success state briefly
      setSuccessState({ tripTitle: selectedTrip.title });
      onSuccess(selectedTrip.title, selectedDay);

      // Collapse after success
      setTimeout(() => {
        onExpandedChange(false);
        setSuccessState(null);
      }, 1500);
    } catch (error: any) {
      console.error('Error adding to trip:', error);
      onError(error?.message || 'Failed to add to trip');
    } finally {
      setAdding(false);
    }
  }

  function handleCreateNewTrip() {
    onExpandedChange(false);
    router.push(`/trips?prefill=${encodeURIComponent(destinationSlug)}`);
  }

  function formatTripDates(trip: TripWithDetails): string {
    if (trip.start_date && trip.end_date) {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    return '';
  }

  function getTripEmoji(trip: TripWithDetails): string {
    // Try to extract emoji from title if it starts with one
    const emojiMatch = trip.title.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    if (emojiMatch) return emojiMatch[0];

    // Default emoji based on destination
    const dest = trip.destination?.toLowerCase() || '';
    if (dest.includes('japan') || dest.includes('tokyo')) return '🇯🇵';
    if (dest.includes('london') || dest.includes('uk')) return '🇬🇧';
    if (dest.includes('paris') || dest.includes('france')) return '🇫🇷';
    if (dest.includes('new york') || dest.includes('nyc')) return '🗽';
    if (dest.includes('miami')) return '🌴';
    if (dest.includes('italy') || dest.includes('rome')) return '🇮🇹';
    return '✈️';
  }

  // If already added, show success state
  if (isAddedToTrip && !isExpanded) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <Check className="h-4 w-4" />
        Added to trip
      </div>
    );
  }

  // Collapsed state
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!user) {
            router.push('/auth/login');
            return;
          }
          onExpandedChange(true);
        }}
        className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-semibold transition-colors bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
      >
        <Plus className="h-4 w-4" />
        Add to Trip
      </button>
    );
  }

  // Expanded state
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
          Select Trip
        </span>
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : successState ? (
          <div className="flex items-center justify-center gap-2 py-6 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            <span className="font-medium">Added to {successState.tripTitle}</span>
          </div>
        ) : (
          <>
            {/* Trip List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {trips.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No trips yet. Create one to get started!
                </p>
              ) : (
                trips.map(trip => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const emoji = getTripEmoji(trip);
                  const dates = formatTripDates(trip);
                  const placesText = `${trip._itinerary_count || 0} place${(trip._itinerary_count || 0) !== 1 ? 's' : ''}`;

                  return (
                    <button
                      type="button"
                      key={trip.id}
                      onClick={() => {
                        setSelectedTrip(trip);
                        setSelectedDay(1);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[#C4704B] bg-[#C4704B]/5 dark:bg-[#C4704B]/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg flex-shrink-0">{emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {trip.title.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s*/u, '')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {dates && `${dates} · `}{placesText}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-[#C4704B] flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Create New Trip */}
            <button
              type="button"
              onClick={handleCreateNewTrip}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create New Trip
            </button>

            {/* Day Selector (shows when trip is selected) */}
            {selectedTrip && selectedTrip._days && selectedTrip._days > 1 && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-3" />
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Add to Day
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: selectedTrip._days }, (_, i) => i + 1).map(day => (
                      <button
                        type="button"
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          selectedDay === day
                            ? 'bg-[#C4704B] text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        Day {day}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            {selectedTrip && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-3" />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onExpandedChange(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToTrip}
                    disabled={adding}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#C4704B] text-white hover:bg-[#B3603B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {adding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>Add to Day {selectedDay}</>
                    )}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
