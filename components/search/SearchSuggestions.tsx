'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  MapPin,
  Tag,
  Clock,
  X,
  Star,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Destination {
  id: number;
  name: string;
  slug: string;
  city: string;
  country?: string;
  category: string;
  image?: string;
  michelin_stars?: number;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

interface TrendingSearch {
  query: string;
  count: number;
}

interface SearchSuggestionsProps {
  query: string;
  suggestions: {
    destinations: Destination[];
    cities: { city: string; country?: string }[];
    categories: string[];
  } | null;
  recentSearches?: RecentSearch[];
  trendingSearches?: TrendingSearch[];
  isLoading?: boolean;
  selectedIndex: number;
  onSelect: (value: string, type: 'destination' | 'city' | 'category' | 'query') => void;
  onRemoveRecent?: (query: string) => void;
  onClearRecent?: () => void;
  className?: string;
}

export interface SearchSuggestionsHandle {
  getTotalItems: () => number;
  getSelectedItem: () => { value: string; type: string } | null;
}

/**
 * Highlights matching text in a string
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/**
 * SearchSuggestions - Dropdown with grouped suggestions and keyboard navigation
 */
export const SearchSuggestions = forwardRef<SearchSuggestionsHandle, SearchSuggestionsProps>(
  function SearchSuggestions(
    {
      query,
      suggestions,
      recentSearches = [],
      trendingSearches = [],
      isLoading,
      selectedIndex,
      onSelect,
      onRemoveRecent,
      onClearRecent,
      className,
    },
    ref
  ) {
    // Build flat list for keyboard navigation
    const [flatItems, setFlatItems] = useState<
      { value: string; type: 'destination' | 'city' | 'category' | 'query'; slug?: string }[]
    >([]);

    useEffect(() => {
      const items: typeof flatItems = [];

      if (query.trim()) {
        // With query: show suggestions
        if (suggestions) {
          // Cities first
          suggestions.cities.forEach((c) => {
            items.push({ value: c.city, type: 'city' });
          });
          // Categories
          suggestions.categories.forEach((cat) => {
            items.push({ value: cat, type: 'category' });
          });
          // Destinations
          suggestions.destinations.forEach((d) => {
            items.push({ value: d.name, type: 'destination', slug: d.slug });
          });
        }
      } else {
        // No query: show recent and trending
        recentSearches.slice(0, 5).forEach((r) => {
          items.push({ value: r.query, type: 'query' });
        });
        trendingSearches.slice(0, 5).forEach((t) => {
          items.push({ value: t.query, type: 'query' });
        });
      }

      setFlatItems(items);
    }, [query, suggestions, recentSearches, trendingSearches]);

    // Expose methods for parent keyboard handling
    useImperativeHandle(ref, () => ({
      getTotalItems: () => flatItems.length,
      getSelectedItem: () => {
        if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
          return flatItems[selectedIndex];
        }
        return null;
      },
    }));

    const hasQuery = query.trim().length > 0;
    const hasRecentSearches = recentSearches.length > 0;
    const hasTrendingSearches = trendingSearches.length > 0;
    const hasSuggestions =
      suggestions &&
      (suggestions.destinations.length > 0 ||
        suggestions.cities.length > 0 ||
        suggestions.categories.length > 0);

    // Don't render if nothing to show
    if (!hasQuery && !hasRecentSearches && !hasTrendingSearches) {
      return null;
    }

    if (hasQuery && !hasSuggestions && !isLoading) {
      return null;
    }

    // Track current index across all items
    let currentIndex = 0;

    return (
      <div
        className={cn(
          'absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-950',
          'border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg',
          'max-h-[400px] overflow-y-auto z-50',
          className
        )}
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          </div>
        ) : hasQuery && suggestions ? (
          // Query suggestions
          <div className="py-2">
            {/* Cities */}
            {suggestions.cities.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  Cities
                </div>
                {suggestions.cities.map((city) => {
                  const itemIndex = currentIndex++;
                  return (
                    <button
                      key={city.city}
                      onClick={() => onSelect(city.city, 'city')}
                      className={cn(
                        'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors',
                        selectedIndex === itemIndex
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      )}
                    >
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        <HighlightMatch text={city.city} query={query} />
                        {city.country && (
                          <span className="text-gray-500 dark:text-gray-400">
                            , {city.country}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Categories */}
            {suggestions.categories.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-3 h-3" />
                  Categories
                </div>
                {suggestions.categories.map((category) => {
                  const itemIndex = currentIndex++;
                  return (
                    <button
                      key={category}
                      onClick={() => onSelect(category, 'category')}
                      className={cn(
                        'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors',
                        selectedIndex === itemIndex
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      )}
                    >
                      <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        <HighlightMatch text={category} query={query} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Destinations */}
            {suggestions.destinations.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3 h-3" />
                  Destinations
                </div>
                {suggestions.destinations.slice(0, 6).map((dest) => {
                  const itemIndex = currentIndex++;
                  return (
                    <button
                      key={dest.id}
                      onClick={() => onSelect(dest.slug, 'destination')}
                      className={cn(
                        'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors',
                        selectedIndex === itemIndex
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      )}
                    >
                      {dest.image ? (
                        <img
                          src={dest.image}
                          alt=""
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                          <HighlightMatch text={dest.name} query={query} />
                          {dest.michelin_stars && dest.michelin_stars > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: dest.michelin_stars }).map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-current" />
                              ))}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {dest.category} in {dest.city}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // No query: show recent and trending
          <div className="py-2">
            {/* Recent Searches */}
            {hasRecentSearches && (
              <div>
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Recent Searches
                  </span>
                  {onClearRecent && (
                    <button
                      onClick={onClearRecent}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {recentSearches.slice(0, 5).map((recent) => {
                  const itemIndex = currentIndex++;
                  return (
                    <div
                      key={recent.query}
                      className={cn(
                        'flex items-center group',
                        selectedIndex === itemIndex
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      )}
                    >
                      <button
                        onClick={() => onSelect(recent.query, 'query')}
                        className="flex-1 px-4 py-2.5 text-left flex items-center gap-3"
                      >
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {recent.query}
                        </span>
                      </button>
                      {onRemoveRecent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveRecent(recent.query);
                          }}
                          className="p-2 mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all"
                          aria-label="Remove search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Trending Searches */}
            {hasTrendingSearches && (
              <div className={hasRecentSearches ? 'border-t border-gray-100 dark:border-gray-800' : ''}>
                <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Trending
                </div>
                {trendingSearches.slice(0, 5).map((trending) => {
                  const itemIndex = currentIndex++;
                  return (
                    <button
                      key={trending.query}
                      onClick={() => onSelect(trending.query, 'query')}
                      className={cn(
                        'w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors',
                        selectedIndex === itemIndex
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      )}
                    >
                      <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {trending.query}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {trending.count} searches
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);
