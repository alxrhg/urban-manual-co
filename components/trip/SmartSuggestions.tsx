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
  action?: {
    type: 'add_place' | 'add_category';
    dayNumber?: number;
    category?: string;
  };
}

interface SmartSuggestionsProps {
  days: TripDay[];
  destination?: string;
  onAddPlace?: (dayNumber: number, category?: string) => void;
  className?: string;
}

/**
 * SmartSuggestions - AI-powered suggestions for improving a trip
 * Analyzes the current itinerary and suggests additions
 */
export default function SmartSuggestions({
  days,
  destination,
  onAddPlace,
  className = '',
}: SmartSuggestionsProps) {
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];

    // Get all items across all days
    const allItems = days.flatMap(d => d.items);

    // Analyze categories present
    const categoriesPresent = new Set<string>();
    allItems.forEach(item => {
      const cat = item.parsedNotes?.category || item.destination?.category;
      if (cat) categoriesPresent.add(cat.toLowerCase());
    });

    // Analyze items per day
    const itemsPerDay: Record<number, number> = {};
    const categoriesPerDay: Record<number, Set<string>> = {};

    days.forEach(day => {
      itemsPerDay[day.dayNumber] = day.items.length;
      categoriesPerDay[day.dayNumber] = new Set();
      day.items.forEach(item => {
        const cat = item.parsedNotes?.category || item.destination?.category;
        if (cat) categoriesPerDay[day.dayNumber].add(cat.toLowerCase());
      });
    });

    // Check for morning activities (breakfast/cafe)
    const hasBreakfast = Array.from(categoriesPresent).some(cat =>
      cat.includes('cafe') || cat.includes('coffee') || cat.includes('breakfast') || cat.includes('bakery')
    );

    // Get first destination for location context
    const firstDestWithLocation = allItems.find(item =>
      item.destination?.latitude && item.destination?.longitude
    );

    // Suggestion 1: Breakfast spots
    if (!hasBreakfast && allItems.length > 0) {
      result.push({
        id: 'breakfast',
        text: firstDestWithLocation
          ? 'Add breakfast spots near your first destination'
          : 'Add a cafe or breakfast spot to start your day',
        icon: 'check',
        action: { type: 'add_category', dayNumber: 1, category: 'cafe' },
      });
    }

    // Suggestion 2: Check for days without cultural activities
    const hasCulturalActivity = Array.from(categoriesPresent).some(cat =>
      cat.includes('museum') || cat.includes('gallery') || cat.includes('landmark') || cat.includes('attraction')
    );

    if (!hasCulturalActivity && days.length > 1) {
      // Suggest museum for day 2 or later
      const suggestDay = days.length >= 2 ? 2 : 1;
      result.push({
        id: 'museum',
        text: `Consider adding a museum visit for Day ${suggestDay}`,
        icon: 'sparkle',
        action: { type: 'add_category', dayNumber: suggestDay, category: 'museum' },
      });
    }

    // Suggestion 3: Evening dining
    const hasEveningDining = Array.from(categoriesPresent).some(cat =>
      cat.includes('restaurant') || cat.includes('dining') || cat.includes('bistro')
    );

    if (!hasEveningDining) {
      result.push({
        id: 'dinner',
        text: destination
          ? `You might enjoy a sunset dinner at the waterfront`
          : 'Add a dinner spot for a memorable evening',
        icon: 'check',
        action: { type: 'add_category', dayNumber: 1, category: 'restaurant' },
      });
    }

    // Suggestion 4: Bars/nightlife if only restaurants
    const hasBars = Array.from(categoriesPresent).some(cat =>
      cat.includes('bar') || cat.includes('cocktail') || cat.includes('pub') || cat.includes('nightlife')
    );

    if (hasEveningDining && !hasBars && allItems.length >= 3) {
      result.push({
        id: 'nightlife',
        text: 'Top off your evening with a cocktail bar',
        icon: 'sparkle',
        action: { type: 'add_category', category: 'bar' },
      });
    }

    // Suggestion 5: Day with few items
    for (const day of days) {
      if (day.items.length === 1) {
        result.push({
          id: `sparse-day-${day.dayNumber}`,
          text: `Day ${day.dayNumber} looks light - add more activities`,
          icon: 'check',
          action: { type: 'add_place', dayNumber: day.dayNumber },
        });
        break; // Only one sparse day suggestion
      }
    }

    // Limit to 3 suggestions
    return result.slice(0, 3);
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
