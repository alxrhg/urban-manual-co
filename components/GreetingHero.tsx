'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface GreetingHeroProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenFilters?: () => void;
  onSubmit?: (query: string) => void; // CHAT MODE: Explicit submit handler
  userName?: string;
  isAIEnabled?: boolean;
  isSearching?: boolean;
  filters?: any;
  onFiltersChange?: (filters: any) => void;
  availableCities?: string[];
  availableCategories?: string[];
  userCity?: string; // User's current city for contextual placeholders
  upcomingTrip?: { city: string } | null; // User's upcoming trip
}

export default function GreetingHero({
  searchQuery,
  onSearchChange,
  onOpenFilters,
  onSubmit,
  userName,
  isAIEnabled = false,
  isSearching = false,
  filters,
  onFiltersChange,
  availableCities = [],
  availableCategories = [],
  userCity,
  upcomingTrip,
}: GreetingHeroProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current time for greeting (sentence case, subtle)
  const now = new Date();
  const currentHour = now.getHours();
  let greeting = 'Good evening';
  if (currentHour < 12) {
    greeting = 'Good morning';
  } else if (currentHour < 18) {
    greeting = 'Good afternoon';
  }

  // Extract first name only for subtle personalization
  const firstName = userName?.split(' ')[0];

  // Contextual placeholder based on time, location, and trips
  const getContextualPlaceholder = (): string => {
    // Has upcoming trip - suggest for that destination
    if (upcomingTrip?.city) {
      return `things to do in ${upcomingTrip.city.toLowerCase()}`;
    }

    // Time-based suggestions
    if (currentHour >= 6 && currentHour < 10) {
      return userCity
        ? `breakfast in ${userCity.toLowerCase()}`
        : 'best coffee shops nearby';
    }

    if (currentHour >= 11 && currentHour < 14) {
      return 'lunch spots nearby';
    }

    if (currentHour >= 17 && currentHour < 21) {
      return 'dinner tonight';
    }

    if (currentHour >= 21 || currentHour < 6) {
      return 'late night eats';
    }

    return 'restaurants, hotels, or hidden gems';
  };

  // Fetch AI suggestions as user types (lower threshold for AI chat mode)
  useEffect(() => {
    if (!isAIEnabled || !searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch('/api/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery }),
        });
        if (!response.ok) {
          console.warn('Autocomplete API failed:', response.status);
          return;
        }
        const data = await response.json();

        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isAIEnabled]);

  const handleSuggestionClick = (suggestion: string) => {
    // Remove emoji prefixes for cleaner search
    const cleanSuggestion = suggestion
      .replace(/^[📍🏛️🏷️]\s*/, '') // Remove emoji prefixes
      .split(' - ')[0] // Take only the main part (remove city suffix for destinations)
      .trim();
    onSearchChange(cleanSuggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
    // Auto-submit if onSubmit handler is provided
    if (onSubmit && cleanSuggestion.trim()) {
      onSubmit(cleanSuggestion.trim());
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="w-full h-full relative" data-name="Search Bar">
      <div className="w-full relative">
        {/* Greeting - subtle, muted, sentence case */}
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500 tracking-wide mb-2">
          {greeting}{firstName ? `, ${firstName}` : ''}
        </p>

        {/* Search input with subtle underline */}
        <div className="search-input-container relative group">
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <input
            ref={inputRef}
            placeholder={getContextualPlaceholder()}
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (e.target.value.trim().length >= 2) {
                setShowSuggestions(true);
              } else {
                setShowSuggestions(false);
              }
            }}
            onKeyDown={(e) => {
              handleKeyDown(e);
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (onSubmit && searchQuery.trim()) {
                  onSubmit(searchQuery.trim());
                }
              }
            }}
            onFocus={() => {
              setIsFocused(true);
              if (suggestions.length > 0 && searchQuery.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setIsFocused(false)}
            className="w-full text-xl font-normal text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none bg-transparent border-none py-2 transition-all duration-200"
            style={{ paddingLeft: isSearching ? '32px' : '0' }}
          />
          {/* Subtle underline - visible on focus or hover */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-px transition-colors duration-200 ${
              isFocused
                ? 'bg-gray-400 dark:bg-gray-500'
                : 'bg-gray-200 dark:bg-gray-800 group-hover:bg-gray-300 dark:group-hover:bg-gray-700'
            }`}
          />

          {/* AI Suggestions Dropdown - simplified */}
          {isAIEnabled && showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
              {loadingSuggestions ? (
                <div className="px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ) : (
                <>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">{suggestion}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


