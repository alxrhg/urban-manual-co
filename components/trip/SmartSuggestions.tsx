'use client';

import { useMemo, useState, useCallback } from 'react';
import { CheckCircle2, Sparkles, Loader2, RefreshCw, Lightbulb } from 'lucide-react';

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
      category?: string;
    };
  }>;
}

interface LocalSuggestion {
  id: string;
  text: string;
  icon: 'check' | 'sparkle';
  priority: number;
  action?: {
    type: 'add_place' | 'add_category';
    dayNumber?: number;
    category?: string;
  };
}

interface AISuggestion {
  destination: {
    id: number;
    slug: string;
    name: string;
    category: string;
    rating?: number;
    image_thumbnail?: string;
  };
  day: number;
  timeSlot: string;
  startTime: string;
  reason: string;
}

interface SmartSuggestionsProps {
  days: TripDay[];
  destination?: string | null;
  onAddPlace?: (dayNumber: number, category?: string) => void;
  onAddAISuggestion?: (suggestion: AISuggestion) => void;
  className?: string;
}

type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeSlot(time: string | null | undefined): TimeSlot | null {
  if (!time) return null;
  const hour = parseInt(time.split(':')[0], 10);
  if (isNaN(hour)) return null;
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * SmartSuggestions - AI-powered suggestions for improving a trip
 * Analyzes the current itinerary and suggests additions based on:
 * - Missing meal types (breakfast, lunch, dinner)
 * - Empty time slots per day
 * - Missing activity categories
 * - Trip balance and variety
 *
 * Now enhanced with AI-powered recommendations from the smart-fill API
 */
export default function SmartSuggestions({
  days,
  destination,
  onAddPlace,
  onAddAISuggestion,
  className = '',
}: SmartSuggestionsProps) {
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [hasLoadedAI, setHasLoadedAI] = useState(false);

  // Fetch AI suggestions
  const fetchAISuggestions = useCallback(async () => {
    if (!destination || days.length === 0) return;

    setIsLoadingAI(true);
    try {
      const allItems = days.flatMap(d => d.items);
      const existingItemsForAPI = allItems.map(item => ({
        day: days.find(d => d.items.includes(item))?.dayNumber || 1,
        time: item.time,
        title: item.title,
        destination_slug: item.destination_slug,
        category: item.parsedNotes?.category || item.destination?.category,
      }));

      const response = await fetch('/api/intelligence/smart-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: destination,
          existingItems: existingItemsForAPI,
          tripDays: days.length,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setAISuggestions(result.suggestions?.slice(0, 5) || []);
        setHasLoadedAI(true);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  }, [destination, days]);

  // Local suggestions (fast, no API)
  const localSuggestions = useMemo(() => {
    const result: LocalSuggestion[] = [];
    const allItems = days.flatMap(d => d.items);

    // No suggestions if trip is empty
    if (allItems.length === 0) return [];

    // Analyze categories present across the trip
    const categoriesPresent = new Set<string>();
    allItems.forEach(item => {
      const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      if (cat) categoriesPresent.add(cat);
    });

    // Analyze time slots filled per day
    const timeSlotsByDay: Record<number, Set<TimeSlot>> = {};
    days.forEach(day => {
      timeSlotsByDay[day.dayNumber] = new Set();
      day.items.forEach(item => {
        const slot = getTimeSlot(item.time);
        if (slot) timeSlotsByDay[day.dayNumber].add(slot);
      });
    });

    // Get first destination for proximity context
    const firstDestWithLocation = allItems.find(item =>
      item.destination?.latitude && item.destination?.longitude
    );

    // Category checks
    const hasBreakfast = Array.from(categoriesPresent).some(cat =>
      cat.includes('cafe') || cat.includes('coffee') || cat.includes('breakfast') || cat.includes('bakery')
    );
    const hasMuseum = Array.from(categoriesPresent).some(cat =>
      cat.includes('museum') || cat.includes('gallery') || cat.includes('landmark') || cat.includes('attraction')
    );
    const hasDinner = Array.from(categoriesPresent).some(cat =>
      cat.includes('restaurant') || cat.includes('dining') || cat.includes('bistro')
    );
    const hasBars = Array.from(categoriesPresent).some(cat =>
      cat.includes('bar') || cat.includes('cocktail') || cat.includes('pub') || cat.includes('nightlife')
    );

    // 1. Morning suggestion - breakfast/cafe
    if (!hasBreakfast) {
      result.push({
        id: 'breakfast',
        text: firstDestWithLocation
          ? 'Add breakfast spots near your first destination'
          : 'Start your day with a morning cafe',
        icon: 'check',
        priority: 10,
        action: { type: 'add_category', dayNumber: 1, category: 'cafe' },
      });
    }

    // 2. Find days missing afternoon activities
    for (const day of days) {
      const slots = timeSlotsByDay[day.dayNumber];
      if (day.items.length > 0 && !slots.has('afternoon') && !hasMuseum) {
        result.push({
          id: `museum-day-${day.dayNumber}`,
          text: `Consider adding a museum visit for Day ${day.dayNumber}`,
          icon: 'sparkle',
          priority: 8,
          action: { type: 'add_category', dayNumber: day.dayNumber, category: 'museum' },
        });
        break; // Only one museum suggestion
      }
    }

    // 3. Evening dining suggestion
    if (!hasDinner && allItems.length >= 2) {
      result.push({
        id: 'dinner',
        text: destination?.toLowerCase().includes('coast') || destination?.toLowerCase().includes('beach')
          ? 'You might enjoy a sunset dinner at the waterfront'
          : 'Add a dinner reservation for the evening',
        icon: 'check',
        priority: 9,
        action: { type: 'add_category', dayNumber: 1, category: 'restaurant' },
      });
    }

    // 4. Nightlife suggestion after dinner
    if (hasDinner && !hasBars && allItems.length >= 3) {
      result.push({
        id: 'nightlife',
        text: 'Top off your evening with a cocktail bar',
        icon: 'sparkle',
        priority: 5,
        action: { type: 'add_category', category: 'bar' },
      });
    }

    // 5. Sparse day suggestion
    for (const day of days) {
      if (day.items.length === 1) {
        result.push({
          id: `sparse-day-${day.dayNumber}`,
          text: `Day ${day.dayNumber} looks light — add more activities`,
          icon: 'check',
          priority: 7,
          action: { type: 'add_place', dayNumber: day.dayNumber },
        });
        break;
      }
    }

    // 6. Empty evening slot
    for (const day of days) {
      const slots = timeSlotsByDay[day.dayNumber];
      if (day.items.length >= 2 && !slots.has('evening') && !hasDinner) {
        result.push({
          id: `evening-day-${day.dayNumber}`,
          text: `Day ${day.dayNumber} needs an evening plan`,
          icon: 'sparkle',
          priority: 6,
          action: { type: 'add_category', dayNumber: day.dayNumber, category: 'restaurant' },
        });
        break;
      }
    }

    // Sort by priority and limit to 3
    return result
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [days, destination]);

  // Don't render if no suggestions and no destination for AI
  if (localSuggestions.length === 0 && !destination) {
    return null;
  }

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Local Suggestions Section */}
      {localSuggestions.length > 0 && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[15px] text-stone-900 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-stone-400" />
              Quick Suggestions
            </h3>
          </div>

          <div className="space-y-3">
            {localSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => {
                  if (onAddPlace && suggestion.action) {
                    onAddPlace(
                      suggestion.action.dayNumber || 1,
                      suggestion.action.category
                    );
                  }
                }}
                className="w-full flex items-start gap-3 text-left group hover:bg-stone-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
              >
                <span className="flex-shrink-0 mt-0.5 text-stone-400 dark:text-gray-500 group-hover:text-stone-600 dark:group-hover:text-gray-400 transition-colors">
                  {suggestion.icon === 'sparkle' ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </span>
                <span className="text-sm text-stone-600 dark:text-gray-400 group-hover:text-stone-900 dark:group-hover:text-gray-200 transition-colors">
                  {suggestion.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Suggestions Section */}
      {destination && (
        <div className={`p-5 ${localSuggestions.length > 0 ? 'border-t border-stone-200 dark:border-gray-800' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[15px] text-stone-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-stone-400" />
              AI Recommendations
            </h3>
            <button
              onClick={() => {
                if (!showAISuggestions) {
                  setShowAISuggestions(true);
                  if (!hasLoadedAI) fetchAISuggestions();
                } else if (hasLoadedAI) {
                  fetchAISuggestions();
                }
              }}
              disabled={isLoadingAI}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
            >
              {isLoadingAI ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analyzing...
                </>
              ) : showAISuggestions && hasLoadedAI ? (
                <>
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Get AI Ideas
                </>
              )}
            </button>
          </div>

          {!showAISuggestions ? (
            <p className="text-xs text-stone-500 dark:text-gray-400">
              Click &quot;Get AI Ideas&quot; to receive personalized place recommendations based on your itinerary.
            </p>
          ) : isLoadingAI ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
            </div>
          ) : aiSuggestions.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-gray-400 py-2">
              Your trip looks well-balanced. No additional suggestions right now.
            </p>
          ) : (
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.destination.slug}-${index}`}
                  onClick={() => onAddAISuggestion?.(suggestion)}
                  className="w-full flex items-start gap-3 text-left group hover:bg-stone-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-2 rounded-xl transition-colors"
                >
                  {/* Thumbnail */}
                  {suggestion.destination.image_thumbnail ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-gray-800">
                      <img
                        src={suggestion.destination.image_thumbnail}
                        alt={suggestion.destination.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex-shrink-0 bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-stone-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-900 dark:text-white truncate">
                        {suggestion.destination.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400 rounded-full flex-shrink-0">
                        Day {suggestion.day}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-gray-400 truncate">
                      {suggestion.reason}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-stone-400 dark:text-gray-500 capitalize">
                        {suggestion.destination.category}
                      </span>
                      {suggestion.destination.rating && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-stone-300 dark:bg-gray-600" />
                          <span className="text-[10px] text-stone-400 dark:text-gray-500">
                            {suggestion.destination.rating.toFixed(1)}
                          </span>
                        </>
                      )}
                      <span className="w-0.5 h-0.5 rounded-full bg-stone-300 dark:bg-gray-600" />
                      <span className="text-[10px] text-stone-400 dark:text-gray-500">
                        {suggestion.startTime}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
