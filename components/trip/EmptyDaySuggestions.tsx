'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Plus, Loader2, Coffee, Utensils, Wine, Landmark } from 'lucide-react';

interface EmptyDaySuggestionsProps {
  dayNumber: number;
  city?: string | null;
  onAddPlace: (dayNumber: number, category?: string) => void;
  onAddSuggestion?: (destination: unknown, dayNumber: number, time?: string) => Promise<void>;
  className?: string;
}

interface QuickSuggestion {
  id: string;
  name: string;
  category: string;
  slug: string;
}

const timeSlots = [
  { label: 'Morning', time: '09:00', icon: Coffee, category: 'cafe' },
  { label: 'Lunch', time: '12:30', icon: Utensils, category: 'restaurant' },
  { label: 'Afternoon', time: '15:00', icon: Landmark, category: 'museum' },
  { label: 'Dinner', time: '19:00', icon: Utensils, category: 'restaurant' },
  { label: 'Evening', time: '21:00', icon: Wine, category: 'bar' },
];

/**
 * EmptyDaySuggestions - Shows when a day has no items
 * Provides quick actions and AI suggestions inline
 */
export default function EmptyDaySuggestions({
  dayNumber,
  city,
  onAddPlace,
  onAddSuggestion,
  className = '',
}: EmptyDaySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<QuickSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch suggestions for this day
  useEffect(() => {
    if (!city) return;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/intelligence/quick-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, dayNumber, limit: 3 }),
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Silent fail
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, [city, dayNumber]);

  const handleAddSuggestion = async (suggestion: QuickSuggestion) => {
    if (!onAddSuggestion) return;
    setAddingId(suggestion.id);
    try {
      // Fetch full destination and add
      const response = await fetch(`/api/destinations/${suggestion.slug}`);
      if (response.ok) {
        const destination = await response.json();
        await onAddSuggestion(destination, dayNumber);
      }
    } catch {
      // Silent fail
    }
    setAddingId(null);
  };

  return (
    <div className={`text-center py-8 ${className}`}>
      {/* Quick add by time slot */}
      <p className="text-xs text-stone-400 dark:text-gray-500 mb-4">
        Plan your day
      </p>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {timeSlots.map((slot) => {
          const Icon = slot.icon;
          return (
            <button
              key={slot.label}
              onClick={() => onAddPlace(dayNumber, slot.category)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon className="w-3 h-3" />
              {slot.label}
            </button>
          );
        })}
      </div>

      {/* AI Suggestions */}
      {city && suggestions.length > 0 && (
        <div className="border-t border-stone-100 dark:border-gray-800 pt-4">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Sparkles className="w-3 h-3 text-stone-400" />
            <span className="text-[10px] text-stone-400 uppercase tracking-wide">
              Suggestions for {city}
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => handleAddSuggestion(s)}
                disabled={addingId === s.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-700 dark:text-gray-300 border border-stone-200 dark:border-gray-700 rounded-full hover:border-stone-300 dark:hover:border-gray-600 hover:bg-stone-50 dark:hover:bg-gray-800/50 transition-colors disabled:opacity-50"
              >
                {addingId === s.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Loader2 className="w-3 h-3 animate-spin text-stone-400" />
          <span className="text-xs text-stone-400">Finding suggestions...</span>
        </div>
      )}

      {/* Fallback add button */}
      <button
        onClick={() => onAddPlace(dayNumber)}
        className="mt-4 px-4 py-2 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-80 transition-opacity"
      >
        Browse all places
      </button>
    </div>
  );
}
