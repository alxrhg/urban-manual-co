'use client';

import { useMemo, useState } from 'react';
import {
  Lightbulb,
  MapPin,
  UtensilsCrossed,
  Coffee,
  Sparkles,
  Clock,
  ChevronRight,
  Plus,
  Navigation,
  Star,
} from 'lucide-react';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';

interface Suggestion {
  id: string;
  type: 'missing_meal' | 'nearby_attraction' | 'time_gap' | 'popular_spot' | 'weather_alternative';
  priority: 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  dayNumber: number;
  suggestedTime?: string;
  destinations?: Destination[];
  action?: {
    label: string;
    handler: () => void;
  };
}

interface SmartSidebarProps {
  days: TripDay[];
  city: string;
  selectedDayNumber: number;
  curatedDestinations?: Destination[];
  onAddPlace?: (destination: Destination, dayNumber: number) => void;
  onOpenSearch?: () => void;
  className?: string;
}

function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatMinutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Duration estimates by category
const DURATION_BY_CATEGORY: Record<string, number> = {
  restaurant: 90,
  cafe: 45,
  bar: 60,
  museum: 120,
  gallery: 90,
  landmark: 45,
  attraction: 90,
  shop: 45,
  default: 60,
};

function getDuration(item: EnrichedItineraryItem): number {
  const noteDuration = item.parsedNotes?.duration;
  if (noteDuration) return noteDuration;

  const category = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
  for (const [key, duration] of Object.entries(DURATION_BY_CATEGORY)) {
    if (category.includes(key)) return duration;
  }
  return DURATION_BY_CATEGORY.default;
}

export default function SmartSidebar({
  days,
  city,
  selectedDayNumber,
  curatedDestinations = [],
  onAddPlace,
  onOpenSearch,
  className = '',
}: SmartSidebarProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Analyze trip and generate suggestions
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];
    const selectedDay = days.find(d => d.dayNumber === selectedDayNumber);

    if (!selectedDay) return result;

    const items = selectedDay.items.filter(item => {
      const type = item.parsedNotes?.type;
      return type !== 'hotel' || item.parsedNotes?.hotelItemType;
    });

    // Sort items by time
    const sortedItems = [...items]
      .filter(item => item.time)
      .sort((a, b) => {
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        return timeA - timeB;
      });

    // Check for meal gaps
    const hasMorningMeal = items.some(item => {
      const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      const time = parseTime(item.time);
      return (cat.includes('cafe') || cat.includes('breakfast') || cat.includes('bakery')) &&
             time !== null && time < 11 * 60;
    });

    const hasLunch = items.some(item => {
      const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      const time = parseTime(item.time);
      return cat.includes('restaurant') && time !== null && time >= 11 * 60 && time <= 14 * 60;
    });

    const hasDinner = items.some(item => {
      const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      const time = parseTime(item.time);
      return cat.includes('restaurant') && time !== null && time >= 18 * 60;
    });

    if (!hasMorningMeal && items.length > 0) {
      const breakfastSpots = curatedDestinations.filter(d =>
        d.city?.toLowerCase() === city.toLowerCase() &&
        (d.category?.toLowerCase().includes('cafe') || d.category?.toLowerCase().includes('bakery'))
      ).slice(0, 3);

      result.push({
        id: 'breakfast',
        type: 'missing_meal',
        priority: 'medium',
        title: 'Add breakfast',
        reason: 'No morning meal planned. Start your day right!',
        dayNumber: selectedDayNumber,
        suggestedTime: '9:00 AM',
        destinations: breakfastSpots,
      });
    }

    if (!hasLunch && items.length >= 2) {
      const lunchSpots = curatedDestinations.filter(d =>
        d.city?.toLowerCase() === city.toLowerCase() &&
        d.category?.toLowerCase().includes('restaurant')
      ).slice(0, 3);

      result.push({
        id: 'lunch',
        type: 'missing_meal',
        priority: 'high',
        title: 'Add lunch',
        reason: 'No lunch reservation. Consider booking between 12:00-14:00',
        dayNumber: selectedDayNumber,
        suggestedTime: '12:30 PM',
        destinations: lunchSpots,
      });
    }

    if (!hasDinner && items.length >= 3) {
      const dinnerSpots = curatedDestinations.filter(d =>
        d.city?.toLowerCase() === city.toLowerCase() &&
        d.category?.toLowerCase().includes('restaurant')
      ).slice(0, 3);

      result.push({
        id: 'dinner',
        type: 'missing_meal',
        priority: 'high',
        title: 'Add dinner',
        reason: 'No dinner reservation. Evening is open!',
        dayNumber: selectedDayNumber,
        suggestedTime: '7:00 PM',
        destinations: dinnerSpots,
      });
    }

    // Check for time gaps
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const current = sortedItems[i];
      const next = sortedItems[i + 1];
      const currentEnd = (parseTime(current.time) || 0) + getDuration(current);
      const nextStart = parseTime(next.time) || 0;
      const gap = nextStart - currentEnd;

      // If gap is more than 2 hours, suggest filling it
      if (gap > 120) {
        const midPoint = currentEnd + gap / 2;

        // Find nearby attractions
        const currentLat = current.destination?.latitude ?? current.parsedNotes?.latitude;
        const currentLon = current.destination?.longitude ?? current.parsedNotes?.longitude;

        let nearbyAttractions: Destination[] = [];
        if (currentLat && currentLon) {
          nearbyAttractions = curatedDestinations
            .filter(d => {
              if (!d.latitude || !d.longitude) return false;
              if (d.city?.toLowerCase() !== city.toLowerCase()) return false;
              const dLat = Math.abs(d.latitude - currentLat);
              const dLon = Math.abs(d.longitude - currentLon);
              return dLat < 0.02 && dLon < 0.02; // ~2km radius
            })
            .slice(0, 3);
        }

        result.push({
          id: `gap-${i}`,
          type: 'time_gap',
          priority: 'low',
          title: `${Math.round(gap / 60)}h gap between activities`,
          reason: `Free time from ${formatMinutesToTime(currentEnd)} to ${formatMinutesToTime(nextStart)}`,
          dayNumber: selectedDayNumber,
          suggestedTime: formatMinutesToTime(midPoint),
          destinations: nearbyAttractions,
        });
      }
    }

    // Suggest popular spots in the city
    const popularSpots = curatedDestinations
      .filter(d =>
        d.city?.toLowerCase() === city.toLowerCase() &&
        (d.rating || 0) >= 4.5 &&
        !items.some(item => item.destination_slug === d.slug)
      )
      .slice(0, 5);

    if (popularSpots.length > 0) {
      result.push({
        id: 'popular',
        type: 'popular_spot',
        priority: 'low',
        title: `Top rated in ${city}`,
        reason: 'Highly recommended spots you haven\'t added yet',
        dayNumber: selectedDayNumber,
        destinations: popularSpots,
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [days, selectedDayNumber, city, curatedDestinations]);

  const getTypeIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'missing_meal':
        return <UtensilsCrossed className="w-4 h-4" />;
      case 'nearby_attraction':
        return <MapPin className="w-4 h-4" />;
      case 'time_gap':
        return <Clock className="w-4 h-4" />;
      case 'popular_spot':
        return <Star className="w-4 h-4" />;
      case 'weather_alternative':
        return <Navigation className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'medium':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'low':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <span className="text-[14px] font-semibold text-gray-900 dark:text-white">
          Smart Suggestions
        </span>
        <span className="ml-auto text-[11px] text-gray-400">
          Day {selectedDayNumber}
        </span>
      </div>

      {/* Suggestions list */}
      {suggestions.length === 0 ? (
        <div className="p-6 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-[13px] font-medium text-gray-900 dark:text-white mb-1">
            Looking good!
          </p>
          <p className="text-[12px] text-gray-500">
            Your day is well-planned. No suggestions right now.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {suggestions.map(suggestion => {
            const isExpanded = expandedSuggestion === suggestion.id;

            return (
              <div key={suggestion.id}>
                <button
                  onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`p-1.5 rounded-lg ${getPriorityColor(suggestion.priority)}`}>
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                        {suggestion.title}
                      </span>
                      {suggestion.suggestedTime && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500">
                          {suggestion.suggestedTime}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      {suggestion.reason}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded content with destination suggestions */}
                {isExpanded && suggestion.destinations && suggestion.destinations.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="pl-9 space-y-2">
                      {suggestion.destinations.map(dest => (
                        <div
                          key={dest.slug}
                          className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                            {dest.image || dest.image_thumbnail ? (
                              <img
                                src={dest.image_thumbnail || dest.image || ''}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[12px] font-medium text-gray-900 dark:text-white truncate block">
                              {dest.name}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate block">
                              {dest.neighborhood || dest.category}
                            </span>
                          </div>
                          {onAddPlace && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddPlace(dest, suggestion.dayNumber);
                              }}
                              className="p-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-80 transition-opacity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {onOpenSearch && (
                      <button
                        onClick={onOpenSearch}
                        className="mt-3 ml-9 flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <MapPin className="w-3 h-3" />
                        Browse more places
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
