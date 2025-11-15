'use client';

import { useEffect, useState } from 'react';
import { Search, MapPin, Tag } from 'lucide-react';

interface Suggestion {
  destinations?: Array<{
    id: number;
    name: string;
    slug: string;
    city: string;
    category: string;
  }>;
  cities?: Array<{ city: string; country: string }>;
  categories?: string[];
}

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  className?: string;
}

export function SearchSuggestions({ query, onSelect, className = '' }: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [query]);

  if (!suggestions || !query) {
    return null;
  }

  const hasResults = 
    (suggestions.destinations && suggestions.destinations.length > 0) ||
    (suggestions.cities && suggestions.cities.length > 0) ||
    (suggestions.categories && suggestions.categories.length > 0);

  if (!hasResults) {
    return null;
  }

  return (
    <div className={`absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden z-50 ${className}`}>
      <div className="max-h-[400px] overflow-y-auto">
        {suggestions.destinations && suggestions.destinations.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-800">
            <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Destinations
            </div>
            {suggestions.destinations.slice(0, 3).map((dest) => (
              <button
                key={dest.id}
                onClick={() => onSelect(dest.name)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
              >
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {dest.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {dest.category} • {dest.city}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {suggestions.cities && suggestions.cities.length > 0 && (
          <div className="border-b border-gray-100 dark:border-gray-800">
            <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Cities
            </div>
            {suggestions.cities.slice(0, 3).map((city, index) => (
              <button
                key={index}
                onClick={() => onSelect(`places in ${city.city}`)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {city.city}
                  </div>
                  {city.country && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {city.country}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {suggestions.categories && suggestions.categories.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Categories
            </div>
            {suggestions.categories.slice(0, 3).map((category, index) => (
              <button
                key={index}
                onClick={() => onSelect(category)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
              >
                <Tag className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
