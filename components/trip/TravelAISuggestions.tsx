'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Loader2, Clock, MapPin, Building2, Waves, Dumbbell, Coffee } from 'lucide-react';
import { Trip, ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import { Destination } from '@/types/destination';

/**
 * Schedule gap representation
 */
interface ScheduleGap {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening' | 'night';
  afterItem?: {
    id: string;
    title: string;
    category?: string;
  };
}

/**
 * Hotel booking with amenity info
 */
export interface HotelBooking {
  id: string;
  name: string;
  checkInDate: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  amenities?: string[];
  hasPool?: boolean;
  hasSpa?: boolean;
  hasGym?: boolean;
  hasBreakfast?: boolean;
  latitude?: number;
  longitude?: number;
}

/**
 * Hotel activity types
 */
type HotelActivityType = 'pool' | 'spa' | 'gym' | 'breakfast' | 'checkout';

/**
 * Gap suggestion from API
 */
interface GapSuggestion {
  gap: ScheduleGap;
  destinations: Destination[];
  reason: string;
}

/**
 * Hotel reminder from API
 */
interface HotelReminder {
  activity: HotelActivityType;
  hotel: HotelBooking;
  suggestedTime: string;
  title: string;
}

/**
 * API response shape
 */
interface SuggestionsResponse {
  gaps: ScheduleGap[];
  suggestions: GapSuggestion[];
  hotelReminders: HotelReminder[];
}

interface TravelAISuggestionsProps {
  trip: Trip;
  day: number;
  items: ItineraryItem[];
  hotels: HotelBooking[];
  onAddSuggestion: (item: Partial<ItineraryItem>) => void;
  className?: string;
}

/**
 * Format time range for display
 */
function formatTimeRange(startTime: string, endTime: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Get icon for hotel activity
 */
function getActivityIcon(activity: HotelActivityType) {
  switch (activity) {
    case 'pool':
      return <Waves className="w-4 h-4" />;
    case 'gym':
      return <Dumbbell className="w-4 h-4" />;
    case 'spa':
      return <Sparkles className="w-4 h-4" />;
    case 'breakfast':
      return <Coffee className="w-4 h-4" />;
    default:
      return <Building2 className="w-4 h-4" />;
  }
}

/**
 * Get section title for gap type
 */
function getSectionTitle(type: ScheduleGap['type']): string {
  switch (type) {
    case 'morning':
      return 'MORNING';
    case 'lunch':
      return 'LUNCH';
    case 'afternoon':
      return 'AFTERNOON';
    case 'dinner':
      return 'DINNER';
    case 'evening':
      return 'EVENING';
    case 'night':
      return 'NIGHTLIFE';
    default:
      return 'SUGGESTIONS';
  }
}

/**
 * Format price level for display
 */
function formatPriceLevel(level: number | null | undefined): string {
  if (!level) return '';
  return '$'.repeat(Math.min(level, 4));
}

/**
 * TravelAISuggestions - Sidebar component showing AI-powered suggestions
 * Analyzes the current day schedule and suggests:
 * 1. Gap-based suggestions for free time
 * 2. Nearby destinations based on existing items
 * 3. Hotel amenity reminders
 */
export default function TravelAISuggestions({
  trip,
  day,
  items,
  hotels,
  onAddSuggestion,
  className = '',
}: TravelAISuggestionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [suggestions, setSuggestions] = useState<GapSuggestion[]>([]);
  const [hotelReminders, setHotelReminders] = useState<HotelReminder[]>([]);
  const [gaps, setGaps] = useState<ScheduleGap[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch suggestions from API
   */
  const fetchSuggestions = useCallback(async () => {
    if (!trip.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/intelligence/trip-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          day,
          existingItems: items,
          hotels,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: SuggestionsResponse = await response.json();
      setGaps(data.gaps || []);
      setSuggestions(data.suggestions || []);
      setHotelReminders(data.hotelReminders || []);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setError('Unable to load suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [trip.id, day, items, hotels]);

  // Fetch suggestions on mount and when dependencies change
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  /**
   * Handle adding a destination suggestion
   */
  const handleAddDestination = (destination: Destination, gap: ScheduleGap) => {
    const notes: ItineraryItemNotes = {
      type: 'place',
      category: destination.category,
      slug: destination.slug,
      image: destination.image_thumbnail || destination.image || undefined,
      latitude: destination.latitude ?? undefined,
      longitude: destination.longitude ?? undefined,
      duration: 90, // Default 1.5 hours
    };

    onAddSuggestion({
      trip_id: trip.id,
      destination_slug: destination.slug,
      day,
      time: gap.startTime,
      title: destination.name,
      description: destination.micro_description || destination.description || undefined,
      notes: JSON.stringify(notes),
    });
  };

  /**
   * Handle adding a hotel activity
   */
  const handleAddHotelActivity = (reminder: HotelReminder) => {
    const activityTypeMap: Record<HotelActivityType, string> = {
      pool: 'pool',
      spa: 'spa',
      gym: 'gym',
      breakfast: 'breakfast-at-hotel',
      checkout: 'checkout-prep',
    };

    const notes: ItineraryItemNotes = {
      type: 'activity',
      activityType: activityTypeMap[reminder.activity] as ItineraryItemNotes['activityType'],
      linkedHotelId: reminder.hotel.id,
      location: reminder.hotel.name,
      duration: reminder.activity === 'breakfast' ? 60 : 90,
    };

    onAddSuggestion({
      trip_id: trip.id,
      day,
      time: reminder.suggestedTime,
      title: reminder.title,
      notes: JSON.stringify(notes),
    });
  };

  /**
   * Auto-fill the day with suggestions
   */
  const handleAutoFill = async () => {
    if (suggestions.length === 0) return;

    setIsAutoFilling(true);

    try {
      // Add top suggestion from each gap
      for (const suggestion of suggestions) {
        if (suggestion.destinations.length > 0) {
          handleAddDestination(suggestion.destinations[0], suggestion.gap);
          // Small delay to prevent overwhelming the UI
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Optionally add hotel reminders
      for (const reminder of hotelReminders.slice(0, 2)) {
        handleAddHotelActivity(reminder);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Don't render if no suggestions and not loading
  const hasContent = suggestions.length > 0 || hotelReminders.length > 0 || isLoading;
  if (!hasContent && !error) {
    return null;
  }

  // Find the primary gap for header
  const primaryGap = gaps.length > 0 ? gaps[0] : null;
  const freeTimeDisplay = primaryGap
    ? formatTimeRange(primaryGap.startTime, primaryGap.endTime)
    : null;

  return (
    <div className={`bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-medium text-[15px] text-gray-900 dark:text-white">
            Complete Day {day}
          </h3>
        </div>

        {/* Free time indicator */}
        {freeTimeDisplay && !isLoading && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{freeTimeDisplay} free</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Analyzing your day...</span>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
            <button
              onClick={fetchSuggestions}
              className="mt-2 text-sm text-gray-900 dark:text-white underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Suggestions by gap type */}
        {!isLoading && !error && (
          <div className="space-y-5">
            {suggestions.map((suggestion: GapSuggestion, index: number) => (
              <div key={`gap-${index}`}>
                {/* Section header */}
                <div className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase mb-2">
                  {getSectionTitle(suggestion.gap.type)}
                </div>

                {/* Destination suggestions */}
                <div className="space-y-1.5">
                  {suggestion.destinations.map((destination: Destination) => (
                    <button
                      key={destination.slug}
                      onClick={() => handleAddDestination(destination, suggestion.gap)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 -mx-3 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                        <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {destination.name}
                          </span>
                          {destination.price_level && (
                            <span className="text-xs text-gray-400">
                              {formatPriceLevel(destination.price_level)}
                            </span>
                          )}
                        </div>
                        {destination.city && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {destination.city}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Hotel amenity reminders */}
            {hotelReminders.length > 0 && (
              <div>
                <div className="text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase mb-2">
                  AT YOUR HOTEL
                </div>
                <div className="space-y-1.5">
                  {hotelReminders.map((reminder: HotelReminder, index: number) => (
                    <button
                      key={`hotel-${index}`}
                      onClick={() => handleAddHotelActivity(reminder)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 -mx-3 text-left rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                        <span className="text-blue-500 dark:text-blue-400">
                          {getActivityIcon(reminder.activity)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                          {reminder.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {reminder.hotel.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {suggestions.length === 0 && hotelReminders.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Your day looks well-planned!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Auto-fill button */}
      {suggestions.length > 0 && !isLoading && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={handleAutoFill}
            disabled={isAutoFilling}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAutoFilling ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding suggestions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Auto-fill day</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
