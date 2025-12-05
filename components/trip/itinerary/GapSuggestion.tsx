'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Sparkles, MapPin, Coffee, Loader2, ChevronRight } from 'lucide-react';
import type { ActivityType } from '@/types/trip';

interface GapSuggestionProps {
  gapMinutes: number;
  hotelName?: string;
  hotelHasPool?: boolean;
  hotelHasSpa?: boolean;
  hotelHasGym?: boolean;
  suggestions?: SuggestionItem[];
  onAddActivity?: (activityType: ActivityType) => void;
  onAddCustom?: () => void;
  className?: string;
  // New props for proactive suggestions
  city?: string;
  previousItemLocation?: { lat: number; lng: number } | null;
  nextItemLocation?: { lat: number; lng: number } | null;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  onAddDestination?: (destination: NearbySuggestion) => void;
}

interface SuggestionItem {
  type: ActivityType | 'custom';
  emoji: string;
  label: string;
  sublabel?: string;
}

export interface NearbySuggestion {
  id: number;
  slug: string;
  name: string;
  category: string;
  image_thumbnail?: string;
  distance?: number;
}

// Activity suggestions based on time of day and available amenities
const getDefaultSuggestions = (
  gapMinutes: number,
  hotelName?: string,
  hotelHasPool?: boolean,
  hotelHasSpa?: boolean,
  hotelHasGym?: boolean
): SuggestionItem[] => {
  const suggestions: SuggestionItem[] = [];

  // Hotel-based suggestions (if hotel is linked)
  if (hotelName) {
    if (hotelHasPool && gapMinutes >= 60) {
      suggestions.push({
        type: 'pool',
        emoji: '🏊',
        label: 'Pool time',
        sublabel: hotelName,
      });
    }
    if (hotelHasSpa && gapMinutes >= 90) {
      suggestions.push({
        type: 'spa',
        emoji: '💆',
        label: 'Spa session',
        sublabel: hotelName,
      });
    }
    if (hotelHasGym && gapMinutes >= 45) {
      suggestions.push({
        type: 'gym',
        emoji: '🏋️',
        label: 'Workout',
        sublabel: hotelName,
      });
    }
    if (gapMinutes >= 60) {
      suggestions.push({
        type: 'nap',
        emoji: '😴',
        label: 'Rest at hotel',
        sublabel: hotelName,
      });
    }
  }

  // General suggestions
  if (gapMinutes >= 120) {
    suggestions.push({
      type: 'free-time',
      emoji: '☀️',
      label: 'Free time',
      sublabel: 'Explore the area',
    });
  }

  if (gapMinutes >= 30) {
    suggestions.push({
      type: 'photo-walk',
      emoji: '📸',
      label: 'Photo walk',
    });
  }

  if (gapMinutes >= 45) {
    suggestions.push({
      type: 'shopping-time',
      emoji: '🛍️',
      label: 'Shopping',
    });
  }

  return suggestions;
};

// Get proactive message based on gap duration and time of day
const getProactiveMessage = (
  gapMinutes: number,
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
): { message: string; suggestedCategory: string; emoji: string } => {
  const hours = Math.floor(gapMinutes / 60);
  const hourText = hours === 1 ? '1-hour' : `${hours}-hour`;

  // Time-based suggestions
  if (timeOfDay === 'morning' && gapMinutes >= 60) {
    return {
      message: `It looks like you have a ${hourText} gap here. Want to see nearby cafes?`,
      suggestedCategory: 'cafe',
      emoji: '☕',
    };
  }

  if (timeOfDay === 'afternoon' && gapMinutes >= 90) {
    return {
      message: `You have a ${hourText} gap in the afternoon. Want to explore nearby attractions?`,
      suggestedCategory: 'attraction',
      emoji: '🏛️',
    };
  }

  if (timeOfDay === 'evening' && gapMinutes >= 60) {
    return {
      message: `There's a ${hourText} gap before your next stop. How about a cocktail bar nearby?`,
      suggestedCategory: 'bar',
      emoji: '🍸',
    };
  }

  // Default suggestions based on gap length
  if (gapMinutes >= 180) {
    return {
      message: `You have ${hours} hours free here. Want to discover something nearby?`,
      suggestedCategory: 'attraction',
      emoji: '✨',
    };
  }

  if (gapMinutes >= 120) {
    return {
      message: `It looks like you have a ${hourText} gap here. Want to see nearby cafes?`,
      suggestedCategory: 'cafe',
      emoji: '☕',
    };
  }

  return {
    message: `${hourText} gap - want to add something?`,
    suggestedCategory: 'cafe',
    emoji: '☀️',
  };
};

/**
 * GapSuggestion - Shows suggestions for free time gaps > 2 hours
 * Displays proactive messages like "It looks like you have a 2-hour gap here. Want to see nearby cafes?"
 */
export default function GapSuggestion({
  gapMinutes,
  hotelName,
  hotelHasPool,
  hotelHasSpa,
  hotelHasGym,
  suggestions: customSuggestions,
  onAddActivity,
  onAddCustom,
  className = '',
  city,
  previousItemLocation,
  nextItemLocation,
  timeOfDay,
  onAddDestination,
}: GapSuggestionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [nearbySuggestions, setNearbySuggestions] = useState<NearbySuggestion[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [showNearbyPanel, setShowNearbyPanel] = useState(false);

  // Only show for gaps >= 2 hours
  if (gapMinutes < 120) return null;

  // Format gap duration
  const formatGap = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const suggestions = customSuggestions || getDefaultSuggestions(
    gapMinutes,
    hotelName,
    hotelHasPool,
    hotelHasSpa,
    hotelHasGym
  );

  // Get proactive message
  const proactive = getProactiveMessage(gapMinutes, timeOfDay);

  // Fetch nearby suggestions
  const fetchNearbySuggestions = async (category: string) => {
    if (!city) return;

    setIsLoadingNearby(true);
    setShowNearbyPanel(true);

    try {
      const params = new URLSearchParams({
        city,
        category,
        limit: '4',
      });

      if (previousItemLocation) {
        params.set('lat', previousItemLocation.lat.toString());
        params.set('lng', previousItemLocation.lng.toString());
      }

      const response = await fetch(`/api/intelligence/gap-suggestions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNearbySuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch nearby suggestions:', error);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  // Handle "Yes" click on proactive message
  const handleShowNearby = () => {
    fetchNearbySuggestions(proactive.suggestedCategory);
  };

  return (
    <div className={`py-3 ${className}`}>
      {/* Proactive Suggestion Banner */}
      {!isExpanded && !showNearbyPanel && (
        <div className="flex items-center justify-center gap-3">
          {/* Dashed line left */}
          <div className="flex-1 border-t border-dashed border-stone-200 dark:border-gray-700" />

          {/* Proactive message */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50">
            <span className="text-base">{proactive.emoji}</span>
            <span className="text-xs text-amber-800 dark:text-amber-200 max-w-[200px]">
              {proactive.message}
            </span>
            <button
              onClick={handleShowNearby}
              className="ml-2 px-2.5 py-1 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-full transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setIsExpanded(true)}
              className="px-2 py-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            >
              More
            </button>
          </div>

          {/* Dashed line right */}
          <div className="flex-1 border-t border-dashed border-stone-200 dark:border-gray-700" />
        </div>
      )}

      {/* Nearby Suggestions Panel */}
      {showNearbyPanel && (
        <div className="mx-4 mt-2 p-4 rounded-xl bg-white dark:bg-gray-900 border border-stone-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-stone-900 dark:text-white">
                Nearby {proactive.suggestedCategory}s
              </span>
            </div>
            <button
              onClick={() => {
                setShowNearbyPanel(false);
                setNearbySuggestions([]);
              }}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 text-lg"
            >
              ×
            </button>
          </div>

          {isLoadingNearby ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span className="ml-2 text-xs text-stone-500">Finding nearby places...</span>
            </div>
          ) : nearbySuggestions.length > 0 ? (
            <div className="space-y-2">
              {nearbySuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => {
                    onAddDestination?.(suggestion);
                    setShowNearbyPanel(false);
                    setNearbySuggestions([]);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors text-left group"
                >
                  {suggestion.image_thumbnail ? (
                    <img
                      src={suggestion.image_thumbnail}
                      alt={suggestion.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 dark:text-white truncate">
                      {suggestion.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-gray-400 truncate">
                      {suggestion.category}
                      {suggestion.distance && ` · ${suggestion.distance}m away`}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 dark:text-gray-600 group-hover:text-amber-500 transition-colors" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 dark:text-gray-400 text-center py-2">
              No nearby places found
            </p>
          )}

          {/* Quick category buttons */}
          <div className="mt-3 pt-3 border-t border-stone-100 dark:border-gray-800">
            <div className="flex flex-wrap gap-2">
              {[
                { category: 'cafe', emoji: '☕', label: 'Cafes' },
                { category: 'bar', emoji: '🍸', label: 'Bars' },
                { category: 'restaurant', emoji: '🍽️', label: 'Food' },
                { category: 'attraction', emoji: '🏛️', label: 'Sights' },
              ].map((cat) => (
                <button
                  key={cat.category}
                  onClick={() => fetchNearbySuggestions(cat.category)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
                    proactive.suggestedCategory === cat.category
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                      : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Activity Suggestions */}
      {isExpanded && (
        <div className="mx-4 mt-2">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex-1 border-t border-dashed border-stone-200 dark:border-gray-700" />
            <button
              onClick={() => setIsExpanded(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/50"
            >
              <span className="text-sm">☀️</span>
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {formatGap(gapMinutes)} free
              </span>
              <Plus className="w-3 h-3 text-amber-500 rotate-45" />
            </button>
            <div className="flex-1 border-t border-dashed border-stone-200 dark:border-gray-700" />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {/* Nearby places button */}
            {city && (
              <button
                onClick={handleShowNearby}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors text-xs"
              >
                <MapPin className="w-3 h-3" />
                <span>Find nearby</span>
              </button>
            )}

            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${index}`}
                onClick={() => {
                  if (suggestion.type === 'custom') {
                    onAddCustom?.();
                  } else {
                    onAddActivity?.(suggestion.type as ActivityType);
                  }
                  setIsExpanded(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:border-stone-300 dark:hover:border-gray-600 transition-colors text-xs"
              >
                <span>{suggestion.emoji}</span>
                <span className="text-stone-700 dark:text-gray-300">{suggestion.label}</span>
              </button>
            ))}

            {/* Custom option */}
            {onAddCustom && (
              <button
                onClick={() => {
                  onAddCustom();
                  setIsExpanded(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-dashed border-stone-300 dark:border-gray-600 hover:border-stone-400 dark:hover:border-gray-500 transition-colors text-xs text-stone-500 dark:text-gray-400"
              >
                <Plus className="w-3 h-3" />
                <span>Custom</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Gap Indicator (for smaller gaps)
// ============================================================================

interface CompactGapIndicatorProps {
  gapMinutes: number;
  onClick?: () => void;
  className?: string;
}

/**
 * CompactGapIndicator - Simple text indicator for gaps between items
 * Shows for gaps 30min - 2h
 */
export function CompactGapIndicator({
  gapMinutes,
  onClick,
  className = '',
}: CompactGapIndicatorProps) {
  // Only show for gaps between 30 min and 2 hours
  if (gapMinutes < 30 || gapMinutes >= 120) return null;

  const formatGap = (mins: number): string => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className={`flex items-center justify-center py-1 ${className}`}>
      <button
        onClick={onClick}
        className="text-[10px] text-stone-400 dark:text-gray-500 hover:text-stone-600 dark:hover:text-gray-400 transition-colors"
      >
        {formatGap(gapMinutes)} gap
        {onClick && <span className="ml-1">+</span>}
      </button>
    </div>
  );
}

// ============================================================================
// AI Suggestion Banner
// ============================================================================

interface AISuggestionBannerProps {
  message: string;
  suggestions?: SuggestionItem[];
  onAccept?: (suggestion: SuggestionItem) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * AISuggestionBanner - AI-powered suggestion for filling gaps
 * Shows personalized suggestions based on user preferences
 */
export function AISuggestionBanner({
  message,
  suggestions = [],
  onAccept,
  onDismiss,
  className = '',
}: AISuggestionBannerProps) {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r from-stone-50 to-gray-50 dark:from-gray-900/50 dark:to-gray-800/50 border border-stone-200/50 dark:border-gray-700/50 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-stone-500 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-900 dark:text-gray-100">{message}</p>
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onAccept?.(suggestion)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 hover:border-stone-300 dark:hover:border-gray-600 transition-colors text-xs"
                >
                  <span>{suggestion.emoji}</span>
                  <span className="text-stone-700 dark:text-gray-300">{suggestion.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <span className="text-lg">×</span>
          </button>
        )}
      </div>
    </div>
  );
}
