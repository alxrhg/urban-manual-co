'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Plus, MapPin, Loader2 } from 'lucide-react';
import type { SuggestionPatch, TripPatch } from '@/lib/intelligence/types';

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
  subtext?: string;
  priority: number;
  patch?: TripPatch;
}

/**
 * @deprecated Use SuggestionPatch from @/lib/intelligence/types instead
 */
interface LegacyAISuggestion {
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
  selectedDayNumber?: number;
  /** @deprecated Use onApplyPatch instead */
  onAddPlace?: (dayNumber: number, category?: string) => void;
  /** @deprecated Use onApplyPatch instead */
  onAddAISuggestion?: (suggestion: LegacyAISuggestion) => void;
  /** Handler for applying a suggestion patch */
  onApplyPatch?: (patch: SuggestionPatch) => void;
  onAddFromNL?: (destination: unknown, dayNumber: number, time?: string) => Promise<void>;
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
 * SmartSuggestions - Subtle inline suggestions for trip gaps
 *
 * Philosophy: Intelligence works automatically and appears naturally.
 * No AI branding, no explicit prompts - just helpful hints that feel native.
 *
 * v2.0: Now uses SuggestionPatch format for "intelligence as operations"
 */
export default function SmartSuggestions({
  days,
  destination,
  selectedDayNumber = 1,
  onAddPlace,
  onAddAISuggestion,
  onApplyPatch,
  className = '',
}: SmartSuggestionsProps) {
  const [suggestionPatches, setSuggestionPatches] = useState<SuggestionPatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Silently fetch suggestions in background when destination is set
  const fetchSuggestions = useCallback(async () => {
    if (!destination || days.length === 0) return;

    setIsLoading(true);
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
        // Suggestions now come as SuggestionPatch objects
        // Only show top 2 - subtle, not overwhelming
        setSuggestionPatches(result.suggestions?.slice(0, 2) || []);
        setHasLoaded(true);
      }
    } catch {
      // Fail silently - suggestions are optional
    } finally {
      setIsLoading(false);
    }
  }, [destination, days]);

  // Auto-fetch once on mount (silent, no user action needed)
  useEffect(() => {
    if (destination && days.length > 0 && !hasLoaded) {
      fetchSuggestions();
    }
  }, [destination, days.length, hasLoaded, fetchSuggestions]);

  // Local analysis (instant, no API) - now returns LocalSuggestion with patches
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

    // Only add genuinely useful suggestions (silence is golden)
    // Now with patches for "intelligence as operations"
    if (!hasBreakfast && allItems.length >= 2) {
      result.push({
        id: 'breakfast',
        text: 'Morning cafe',
        subtext: 'Starts the day right',
        priority: 10,
        patch: {
          type: 'fillGap',
          payload: {
            dayIndex: 0,
            startTime: '09:00',
            durationMinutes: 60,
            blockType: 'meal',
          },
        },
      });
    }

    for (const day of days) {
      const slots = timeSlotsByDay[day.dayNumber];
      if (day.items.length > 0 && !slots.has('afternoon') && !hasMuseum) {
        result.push({
          id: `museum-day-${day.dayNumber}`,
          text: 'Afternoon activity',
          subtext: `Day ${day.dayNumber} has a gap`,
          priority: 8,
          patch: {
            type: 'fillGap',
            payload: {
              dayIndex: day.dayNumber - 1,
              startTime: '14:00',
              durationMinutes: 120,
              blockType: 'activity',
            },
          },
        });
        break;
      }
    }

    if (!hasDinner && allItems.length >= 3) {
      result.push({
        id: 'dinner',
        text: 'Dinner spot',
        subtext: 'Evening open',
        priority: 9,
        patch: {
          type: 'fillGap',
          payload: {
            dayIndex: 0,
            startTime: '19:00',
            durationMinutes: 90,
            blockType: 'meal',
          },
        },
      });
    }

    if (hasDinner && !hasBars && allItems.length >= 4) {
      result.push({
        id: 'nightlife',
        text: 'After dinner',
        subtext: 'Cocktail bar nearby',
        priority: 5,
        patch: {
          type: 'fillGap',
          payload: {
            dayIndex: 0,
            startTime: '21:30',
            durationMinutes: 90,
            blockType: 'activity',
          },
        },
      });
    }

    return result
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2); // Max 2 local suggestions - keep it subtle
  }, [days]);

  // Calculate what to show
  const hasSuggestions = localSuggestions.length > 0 || suggestionPatches.length > 0;

  // Don't render anything if no suggestions and not loading
  // Silence is golden - don't show empty states
  if (!hasSuggestions && !isLoading) {
    return null;
  }

  // While loading initially, show nothing (silent background load)
  if (isLoading && !hasLoaded) {
    return null;
  }

  // Handler for applying a local suggestion
  const handleLocalSuggestion = (suggestion: LocalSuggestion) => {
    if (onApplyPatch && suggestion.patch) {
      // Create a full SuggestionPatch from the local suggestion
      const fullPatch: SuggestionPatch = {
        id: suggestion.id,
        label: suggestion.text,
        patch: suggestion.patch,
        reason: suggestion.subtext || '',
        meta: {
          source: 'rule',
        },
      };
      onApplyPatch(fullPatch);
    } else if (onAddPlace) {
      // Legacy fallback
      const payload = suggestion.patch?.payload as any;
      onAddPlace(
        (payload?.dayIndex ?? 0) + 1,
        payload?.blockType === 'meal' ? 'restaurant' : 'museum'
      );
    }
  };

  // Handler for applying an AI suggestion patch
  const handleAISuggestion = (patch: SuggestionPatch) => {
    if (onApplyPatch) {
      onApplyPatch(patch);
    } else if (onAddAISuggestion && patch.meta?.destination) {
      // Legacy fallback - convert to old format
      const legacySuggestion: LegacyAISuggestion = {
        destination: {
          id: Number(patch.meta.destination.id) || 0,
          slug: patch.meta.destination.slug || '',
          name: patch.meta.destination.name || '',
          category: patch.meta.destination.category || '',
          rating: patch.meta.destination.rating,
          image_thumbnail: patch.meta.destination.imageThumbnail,
        },
        day: patch.meta.day || 1,
        timeSlot: patch.meta.timeSlot || 'afternoon',
        startTime: patch.meta.startTime || '12:00',
        reason: patch.reason,
      };
      onAddAISuggestion(legacySuggestion);
    }
  };

  return (
    <div className={`${className}`}>
      {/* Subtle inline suggestions - no headers, no AI branding */}
      <div className="flex flex-wrap gap-2">
        {/* Local gap suggestions as subtle pills */}
        {localSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            onClick={() => handleLocalSuggestion(suggestion)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-gray-800 transition-all"
          >
            <Plus className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            <span className="text-[12px] text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
              {suggestion.text}
            </span>
            {suggestion.subtext && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {suggestion.subtext}
              </span>
            )}
          </button>
        ))}

        {/* AI suggestion patches appear as natural destination cards */}
        {suggestionPatches.map((patch) => (
          <button
            key={patch.id}
            onClick={() => handleAISuggestion(patch)}
            className="group flex items-center gap-2 px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-gray-800 transition-all"
          >
            {patch.meta?.image ? (
              <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                <img
                  src={patch.meta.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-md flex-shrink-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-gray-400" />
              </div>
            )}
            <div className="text-left">
              <span className="text-[12px] text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                {patch.meta?.destination?.name || patch.label}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1.5">
                Day {patch.meta?.day || 1}
              </span>
            </div>
          </button>
        ))}

        {/* Loading indicator - very subtle */}
        {isLoading && (
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-gray-300" />
          </div>
        )}
      </div>
    </div>
  );
}
