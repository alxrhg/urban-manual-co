'use client';

import { useMemo } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

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

interface Suggestion {
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

interface SmartSuggestionsProps {
  days: TripDay[];
  destination?: string | null;
  onAddPlace?: (dayNumber: number, category?: string) => void;
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
 */
export default function SmartSuggestions({
  days,
  destination,
  onAddPlace,
  className = '',
}: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];
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

  // Don't render if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`p-5 border border-stone-200 dark:border-gray-800 rounded-2xl ${className}`}>
      <h3 className="font-medium text-[15px] text-stone-900 dark:text-white mb-4">
        Smart Suggestions
      </h3>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
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
  );
}
