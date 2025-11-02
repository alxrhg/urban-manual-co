'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, Sparkles, Loader2, X, Clock } from 'lucide-react';
import { SearchFiltersComponent } from '@/components/SearchFilters';

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
}: GreetingHeroProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current time for greeting
  const now = new Date();
  const currentHour = now.getHours();
  let greeting = 'GOOD EVENING';
  if (currentHour < 12) {
    greeting = 'GOOD MORNING';
  } else if (currentHour < 18) {
    greeting = 'GOOD AFTERNOON';
  }

  // Format date and time
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const dateStr = now.toLocaleDateString('en-US', options);
  const timeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

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
      <div className="max-w-2xl mx-auto px-8 relative">
        {/* Greeting above search - Keep this */}
        <div className="text-center mb-8">
          <h1 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
            {greeting}{userName ? `, ${userName}` : ''}
          </h1>
        </div>

        {/* Borderless Text Input - Lovably style (no icon, no border) */}
        <div className="relative">
          {isSearching && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 z-10">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
          <input
            ref={inputRef}
            placeholder={isAIEnabled ? "Where would you like to go?" : "Search places..."}
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
              // CHAT MODE: Submit on Enter key (instant, bypasses debounce)
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (onSubmit && searchQuery.trim()) {
                  onSubmit(searchQuery.trim());
                }
              }
            }}
            onFocus={() => {
              if (suggestions.length > 0 && searchQuery.trim().length >= 2) {
                setShowSuggestions(true);
              }
            }}
            className="w-full text-center text-2xl md:text-3xl font-light placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white"
            style={{ 
              paddingLeft: isSearching ? '32px' : '0',
              paddingRight: '0'
            }}
          />
          
          {/* AI Suggestions Dropdown */}
          {isAIEnabled && showSuggestions && (suggestions.length > 0 || loadingSuggestions) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
              {loadingSuggestions ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Getting suggestions...</span>
                </div>
              ) : (
                <>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-black dark:text-white">{suggestion}</span>
                      </div>
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


