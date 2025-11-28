'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, RefreshCw, Plus } from 'lucide-react';

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
 * SmartSuggestions - Unified suggestions for improving a trip
 * Combines local analysis with AI-powered recommendations
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
  const [hasLoadedAI, setHasLoadedAI] = useState(false);

  // Fetch AI suggestions automatically when destination is set
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
        setAISuggestions(result.suggestions?.slice(0, 4) || []);
        setHasLoadedAI(true);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  }, [destination, days]);

  // Auto-fetch on mount if destination exists
  useEffect(() => {
    if (destination && days.length > 0 && !hasLoadedAI) {
      fetchAISuggestions();
    }
  }, [destination, days.length, hasLoadedAI, fetchAISuggestions]);

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

    // Suggestions based on analysis
    if (!hasBreakfast) {
      result.push({
        id: 'breakfast',
        text: 'Add a morning cafe',
        priority: 10,
        action: { type: 'add_category', dayNumber: 1, category: 'cafe' },
      });
    }

    for (const day of days) {
      const slots = timeSlotsByDay[day.dayNumber];
      if (day.items.length > 0 && !slots.has('afternoon') && !hasMuseum) {
        result.push({
          id: `museum-day-${day.dayNumber}`,
          text: `Add museum for Day ${day.dayNumber}`,
          priority: 8,
          action: { type: 'add_category', dayNumber: day.dayNumber, category: 'museum' },
        });
        break;
      }
    }

    if (!hasDinner && allItems.length >= 2) {
      result.push({
        id: 'dinner',
        text: 'Add dinner reservation',
        priority: 9,
        action: { type: 'add_category', dayNumber: 1, category: 'restaurant' },
      });
    }

    if (hasDinner && !hasBars && allItems.length >= 3) {
      result.push({
        id: 'nightlife',
        text: 'Add a cocktail bar',
        priority: 5,
        action: { type: 'add_category', category: 'bar' },
      });
    }

    for (const day of days) {
      if (day.items.length === 1) {
        result.push({
          id: `sparse-day-${day.dayNumber}`,
          text: `Day ${day.dayNumber} needs more`,
          priority: 7,
          action: { type: 'add_place', dayNumber: day.dayNumber },
        });
        break;
      }
    }

    return result
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }, [days]);

  // Don't render if nothing to show
  const hasContent = localSuggestions.length > 0 || aiSuggestions.length > 0 || isLoadingAI || destination;
  if (!hasContent) {
    return null;
  }

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-[15px] text-stone-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-stone-400" />
          Suggestions
        </h3>
        {destination && hasLoadedAI && (
          <button
            onClick={fetchAISuggestions}
            disabled={isLoadingAI}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
          >
            {isLoadingAI ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoadingAI && aiSuggestions.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
          <span className="ml-2 text-xs text-stone-500">Analyzing your trip...</span>
        </div>
      )}

      {/* Suggestions list */}
      {!isLoadingAI || aiSuggestions.length > 0 ? (
        <div className="space-y-2">
          {/* Quick text suggestions (local) */}
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
              className="w-full flex items-center gap-3 text-left group hover:bg-stone-50 dark:hover:bg-gray-800/50 px-2 py-2 -mx-2 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 text-stone-400" />
              </div>
              <span className="text-sm text-stone-600 dark:text-gray-400 group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
                {suggestion.text}
              </span>
            </button>
          ))}

          {/* AI place suggestions */}
          {aiSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.destination.slug}-${index}`}
              onClick={() => onAddAISuggestion?.(suggestion)}
              className="w-full flex items-center gap-3 text-left group hover:bg-stone-50 dark:hover:bg-gray-800/50 px-2 py-2 -mx-2 rounded-lg transition-colors"
            >
              {suggestion.destination.image_thumbnail ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 dark:bg-gray-800">
                  <img
                    src={suggestion.destination.image_thumbnail}
                    alt={suggestion.destination.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-stone-900 dark:text-white truncate group-hover:text-stone-900 dark:group-hover:text-white">
                    {suggestion.destination.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400 rounded flex-shrink-0">
                    Day {suggestion.day}
                  </span>
                </div>
                <p className="text-xs text-stone-400 dark:text-gray-500 truncate">
                  {suggestion.destination.category} · {suggestion.startTime}
                </p>
              </div>
            </button>
          ))}

          {/* Empty state */}
          {localSuggestions.length === 0 && aiSuggestions.length === 0 && !isLoadingAI && (
            <p className="text-xs text-stone-500 dark:text-gray-400 py-2 text-center">
              Your trip looks well-planned
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
