'use client';

import { useState, useEffect, useCallback } from 'react';
import { Coffee, Utensils, Martini, Landmark, MapPin, Sparkles, Loader2 } from 'lucide-react';
import type { TimeGap } from './useItineraryItems';
import type { Destination } from '@/types/destination';

interface SuggestionChipsProps {
  gap: TimeGap;
  tripId: string;
  city?: string;
  onSelect?: (destination: Destination) => void;
  onCategorySelect?: (category: string) => void;
  maxSuggestions?: number;
}

interface Suggestion {
  id: string;
  type: 'category' | 'destination';
  label: string;
  icon?: typeof Coffee;
  category?: string;
  destination?: Destination;
}

// Time-based category suggestions
function getSuggestedCategories(startTime: number): Suggestion[] {
  const hour = Math.floor(startTime / 60);

  // Morning (6-11)
  if (hour >= 6 && hour < 11) {
    return [
      { id: 'breakfast', type: 'category', label: 'Breakfast', icon: Coffee, category: 'cafe' },
      { id: 'museum', type: 'category', label: 'Museum', icon: Landmark, category: 'museum' },
      { id: 'explore', type: 'category', label: 'Explore', icon: MapPin, category: 'landmark' },
    ];
  }

  // Lunch (11-14)
  if (hour >= 11 && hour < 14) {
    return [
      { id: 'lunch', type: 'category', label: 'Lunch', icon: Utensils, category: 'restaurant' },
      { id: 'cafe', type: 'category', label: 'Cafe', icon: Coffee, category: 'cafe' },
      { id: 'gallery', type: 'category', label: 'Gallery', icon: Landmark, category: 'gallery' },
    ];
  }

  // Afternoon (14-17)
  if (hour >= 14 && hour < 17) {
    return [
      { id: 'explore', type: 'category', label: 'Explore', icon: MapPin, category: 'landmark' },
      { id: 'museum', type: 'category', label: 'Museum', icon: Landmark, category: 'museum' },
      { id: 'cafe', type: 'category', label: 'Cafe', icon: Coffee, category: 'cafe' },
    ];
  }

  // Evening (17-20)
  if (hour >= 17 && hour < 20) {
    return [
      { id: 'dinner', type: 'category', label: 'Dinner', icon: Utensils, category: 'restaurant' },
      { id: 'drinks', type: 'category', label: 'Drinks', icon: Martini, category: 'bar' },
      { id: 'explore', type: 'category', label: 'Explore', icon: MapPin, category: 'landmark' },
    ];
  }

  // Late night (20+)
  return [
    { id: 'dinner', type: 'category', label: 'Dinner', icon: Utensils, category: 'restaurant' },
    { id: 'drinks', type: 'category', label: 'Drinks', icon: Martini, category: 'bar' },
    { id: 'nightlife', type: 'category', label: 'Nightlife', icon: Martini, category: 'bar' },
  ];
}

/**
 * SuggestionChips - Smart suggestions that appear in timeline gaps
 * Shows contextual categories based on time of day and can load AI suggestions
 */
export function SuggestionChips({
  gap,
  tripId,
  city,
  onSelect,
  onCategorySelect,
  maxSuggestions = 3,
}: SuggestionChipsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Get time-based category suggestions
  useEffect(() => {
    const categories = getSuggestedCategories(gap.startTime);
    setSuggestions(categories.slice(0, maxSuggestions));
  }, [gap.startTime, maxSuggestions]);

  // Fetch AI suggestions when requested
  const fetchAISuggestions = useCallback(async () => {
    if (!city || loading) return;

    setLoading(true);
    setShowAI(true);

    try {
      // Call the suggestions API
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          city,
          timeOfDay: gap.startTime < 720 ? 'morning' : gap.startTime < 1020 ? 'afternoon' : 'evening',
          duration: gap.durationMinutes,
          limit: maxSuggestions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions) {
          setAiSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
    } finally {
      setLoading(false);
    }
  }, [city, tripId, gap.startTime, gap.durationMinutes, maxSuggestions, loading]);

  const handleCategoryClick = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.category && onCategorySelect) {
        onCategorySelect(suggestion.category);
      }
    },
    [onCategorySelect]
  );

  const handleDestinationClick = useCallback(
    (destination: Destination) => {
      if (onSelect) {
        onSelect(destination);
      }
    },
    [onSelect]
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Category chips */}
      {!showAI && suggestions.map((suggestion) => {
        const Icon = suggestion.icon || MapPin;
        return (
          <button
            key={suggestion.id}
            onClick={() => handleCategoryClick(suggestion)}
            className="
              flex items-center gap-1 px-2.5 py-1
              text-[11px] font-medium
              text-gray-500 dark:text-gray-400
              bg-gray-100 dark:bg-gray-800
              rounded-full
              hover:bg-gray-200 dark:hover:bg-gray-700
              hover:text-gray-700 dark:hover:text-gray-200
              transition-colors duration-150
            "
          >
            <Icon className="w-3 h-3" />
            {suggestion.label}
          </button>
        );
      })}

      {/* AI suggestions toggle */}
      {city && !showAI && (
        <button
          onClick={fetchAISuggestions}
          className="
            flex items-center gap-1 px-2.5 py-1
            text-[11px] font-medium
            text-gray-400 dark:text-gray-500
            rounded-full
            hover:text-gray-600 dark:hover:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-800
            transition-colors duration-150
          "
        >
          <Sparkles className="w-3 h-3" />
          Suggest
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Finding suggestions...
        </div>
      )}

      {/* AI destination suggestions */}
      {showAI && !loading && aiSuggestions.map((destination) => (
        <button
          key={destination.slug}
          onClick={() => handleDestinationClick(destination)}
          className="
            flex items-center gap-1.5 px-2.5 py-1
            text-[11px] font-medium
            text-gray-600 dark:text-gray-300
            bg-gradient-to-r from-purple-50 to-blue-50
            dark:from-purple-900/20 dark:to-blue-900/20
            border border-purple-100 dark:border-purple-800/30
            rounded-full
            hover:from-purple-100 hover:to-blue-100
            dark:hover:from-purple-900/30 dark:hover:to-blue-900/30
            transition-colors duration-150
          "
        >
          <Sparkles className="w-3 h-3 text-purple-400" />
          {destination.name}
        </button>
      ))}

      {/* Back to categories */}
      {showAI && !loading && (
        <button
          onClick={() => {
            setShowAI(false);
            setAiSuggestions([]);
          }}
          className="
            text-[11px] text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300
            transition-colors
          "
        >
          More options
        </button>
      )}
    </div>
  );
}
