'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Coffee,
  MapPin,
  Clock,
  CloudRain,
  Sun,
  Sparkles,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import {
  getContextualSuggestions,
  getCurrentTimeContext,
  type ContextualSuggestion,
  type TripContext,
  type WeatherContext,
} from '@/lib/contextual-suggestions';
import { useTripWeather } from '@/hooks/useWeather';

interface TripDay {
  dayNumber: number;
  date?: string | null;
  items: Array<{
    id: string;
    title: string;
    destination_slug?: string | null;
    destination?: {
      category?: string;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
    time?: string | null;
    parsedNotes?: {
      type?: string;
      category?: string;
      latitude?: number | null;
      longitude?: number | null;
      isHotel?: boolean;
      checkInDate?: string | null;
      checkOutDate?: string | null;
    };
  }>;
}

interface ContextualSuggestionsProps {
  days: TripDay[];
  destination?: string | null;
  selectedDayNumber?: number;
  onSuggestionClick?: (suggestion: ContextualSuggestion) => void;
  onSearch?: (query: { category?: string; location?: { lat: number; lng: number }; radiusKm?: number; openNow?: boolean }) => void;
  className?: string;
}

/**
 * Get icon component for suggestion type
 */
function SuggestionIcon({ icon, className = '' }: { icon?: ContextualSuggestion['icon']; className?: string }) {
  const iconClass = `w-4 h-4 ${className}`;

  switch (icon) {
    case 'coffee':
      return <Coffee className={iconClass} />;
    case 'map-pin':
      return <MapPin className={iconClass} />;
    case 'clock':
      return <Clock className={iconClass} />;
    case 'cloud-rain':
      return <CloudRain className={iconClass} />;
    case 'sun':
      return <Sun className={iconClass} />;
    default:
      return <Sparkles className={iconClass} />;
  }
}

/**
 * Get background color class for suggestion type
 */
function getSuggestionStyles(type: ContextualSuggestion['type']): { bg: string; iconBg: string; border: string } {
  switch (type) {
    case 'hotel_breakfast':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        iconBg: 'bg-amber-100 dark:bg-amber-800/40',
        border: 'border-amber-200 dark:border-amber-800/50',
      };
    case 'nearby':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        iconBg: 'bg-blue-100 dark:bg-blue-800/40',
        border: 'border-blue-200 dark:border-blue-800/50',
      };
    case 'open_now':
    case 'time_based':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        iconBg: 'bg-green-100 dark:bg-green-800/40',
        border: 'border-green-200 dark:border-green-800/50',
      };
    case 'weather_aware':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        iconBg: 'bg-purple-100 dark:bg-purple-800/40',
        border: 'border-purple-200 dark:border-purple-800/50',
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-800/50',
        iconBg: 'bg-gray-100 dark:bg-gray-700/50',
        border: 'border-gray-200 dark:border-gray-700',
      };
  }
}

/**
 * ContextualSuggestions - Smart, context-aware suggestions
 * Shows relevant suggestions based on:
 * - Hotel location (breakfast near hotel)
 * - Current time (open now filter)
 * - Weather conditions (indoor activities when raining)
 * - User location (what's nearby)
 */
export default function ContextualSuggestions({
  days,
  destination,
  selectedDayNumber = 1,
  onSuggestionClick,
  onSearch,
  className = '',
}: ContextualSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch weather for the trip destination
  const { data: weatherData, isLoading: weatherLoading, isRaining, isBadWeather } = useTripWeather(destination);

  // Extract hotels from trip items
  const hotels = useMemo(() => {
    const hotelList: TripContext['hotels'] = [];

    for (const day of days) {
      for (const item of day.items) {
        if (item.parsedNotes?.type === 'hotel' || item.parsedNotes?.isHotel) {
          hotelList.push({
            id: item.id,
            name: item.title,
            latitude: item.parsedNotes?.latitude ?? item.destination?.latitude,
            longitude: item.parsedNotes?.longitude ?? item.destination?.longitude,
            checkInDate: item.parsedNotes?.checkInDate,
            checkOutDate: item.parsedNotes?.checkOutDate,
          });
        }
      }
    }

    return hotelList;
  }, [days]);

  // Extract existing categories from the selected day
  const existingCategories = useMemo(() => {
    const categories = new Set<string>();
    const selectedDay = days.find(d => d.dayNumber === selectedDayNumber);

    if (selectedDay) {
      for (const item of selectedDay.items) {
        const category = item.parsedNotes?.category || item.destination?.category;
        if (category) {
          categories.add(category.toLowerCase());
        }
      }
    }

    return categories;
  }, [days, selectedDayNumber]);

  // Build trip context
  const tripContext: TripContext = useMemo(() => ({
    hotels,
    currentDayNumber: selectedDayNumber,
    existingCategories,
    city: destination || undefined,
  }), [hotels, selectedDayNumber, existingCategories, destination]);

  // Build weather context
  const weatherContext: WeatherContext | null = useMemo(() => {
    if (!weatherData) return null;

    return {
      isRaining,
      weatherCode: weatherData.current.weatherCode,
      temperature: weatherData.current.temperature,
      description: weatherData.current.weatherDescription,
    };
  }, [weatherData, isRaining]);

  // Get current time context
  const timeContext = useMemo(() => getCurrentTimeContext(), []);

  // Generate suggestions
  const suggestions = useMemo(() => {
    const allSuggestions = getContextualSuggestions(
      tripContext,
      timeContext,
      weatherContext,
      null // User location - could be passed in if available
    );

    // Filter out dismissed suggestions
    return allSuggestions.filter(s => !dismissedIds.has(s.id));
  }, [tripContext, timeContext, weatherContext, dismissedIds]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(async (suggestion: ContextualSuggestion) => {
    setProcessingId(suggestion.id);

    try {
      if (onSuggestionClick) {
        onSuggestionClick(suggestion);
      }

      if (onSearch && suggestion.action.type === 'search') {
        onSearch({
          category: suggestion.action.category,
          location: suggestion.action.location,
          radiusKm: suggestion.action.radiusKm,
          openNow: suggestion.action.filters?.openNow as boolean,
        });
      }
    } finally {
      setProcessingId(null);
    }
  }, [onSuggestionClick, onSearch]);

  // Handle dismiss
  const handleDismiss = useCallback((e: React.MouseEvent, suggestionId: string) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, suggestionId]));
  }, []);

  // Don't render if no suggestions
  if (suggestions.length === 0 && !weatherLoading) {
    return null;
  }

  return (
    <div className={`rounded-2xl bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="font-medium text-gray-900 dark:text-white text-sm">Smart Suggestions</span>
          {weatherData && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {Math.round(weatherData.current.temperature)}° {isRaining ? '(Rainy)' : ''}
            </span>
          )}
        </div>
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Suggestions List */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {weatherLoading && suggestions.length === 0 && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="ml-2 text-xs text-gray-500">Loading weather...</span>
            </div>
          )}

          {suggestions.map((suggestion) => {
            const styles = getSuggestionStyles(suggestion.type);
            const isProcessing = processingId === suggestion.id;

            return (
              <div
                key={suggestion.id}
                className={`relative group rounded-xl ${styles.bg} border ${styles.border} overflow-hidden`}
              >
                <button
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isProcessing}
                  className="w-full flex items-center gap-3 p-3 text-left hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    ) : (
                      <SuggestionIcon
                        icon={suggestion.icon}
                        className="text-gray-600 dark:text-gray-300"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 dark:text-white block truncate">
                      {suggestion.text}
                    </span>
                    {suggestion.subtext && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block truncate">
                        {suggestion.subtext}
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {/* Dismiss button */}
                <button
                  onClick={(e) => handleDismiss(e, suggestion.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white/50 dark:bg-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-700"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            );
          })}

          {/* Weather info banner */}
          {weatherData && isRaining && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <CloudRain className="w-3.5 h-3.5" />
                <span>
                  {weatherData.current.weatherDescription} in {destination} - indoor activities recommended
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
