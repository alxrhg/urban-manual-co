'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Search, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { SearchSuggestions, SearchSuggestionsHandle } from './SearchSuggestions';

interface SearchFilter {
  id: string;
  label: string;
  active?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type?: string;
  image?: string;
}

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, filters: string[]) => void;
  results?: SearchResult[];
  filters?: SearchFilter[];
  placeholder?: string;
  isLoading?: boolean;
  onResultClick?: (result: SearchResult) => void;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Show suggestions dropdown */
  showSuggestions?: boolean;
}

/**
 * Highlight matching text in search results
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
 * SearchOverlay - Full-screen search view
 * Enhanced with keyboard navigation, debouncing, and text highlighting
 */
export default function SearchOverlay({
  isOpen,
  onClose,
  onSearch,
  results = [],
  filters = [],
  placeholder = 'Search destinations, cities, or categories...',
  isLoading,
  onResultClick,
  debounceMs = 300,
  showSuggestions = true,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<{
    destinations: any[];
    cities: { city: string; country?: string }[];
    categories: string[];
  } | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showingSuggestions, setShowingSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<SearchSuggestionsHandle>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setShowingSuggestions(true);
    } else {
      // Reset state when closed
      setQuery('');
      setSelectedResultIndex(-1);
      setSelectedSuggestionIndex(-1);
      setSuggestions(null);
      setShowingSuggestions(false);
    }
  }, [isOpen]);

  // Debounced search
  const debouncedSearch = useCallback(
    (searchQuery: string, searchFilters: string[]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onSearch(searchQuery, searchFilters);
        // Track search for history
        if (searchQuery.trim().length >= 2) {
          addSearch(searchQuery);
        }
      }, debounceMs);
    },
    [onSearch, debounceMs, addSearch]
  );

  // Fetch suggestions as user types
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsFetchingSuggestions(true);
    try {
      const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}&limit=10`, {
        signal: abortControllerRef.current.signal,
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to fetch suggestions:', error);
      }
    } finally {
      setIsFetchingSuggestions(false);
    }
  }, []);

  // Handle query changes
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      setSelectedResultIndex(-1);
      setSelectedSuggestionIndex(-1);
      setShowingSuggestions(true);

      // Fetch suggestions immediately (with debounce for search)
      if (showSuggestions) {
        fetchSuggestions(newQuery);
      }

      // Debounce the main search
      debouncedSearch(newQuery, activeFilters);
    },
    [activeFilters, debouncedSearch, fetchSuggestions, showSuggestions]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalResults = results.length;
      const totalSuggestions = suggestionsRef.current?.getTotalItems() || 0;

      // Handle suggestions navigation when showing suggestions
      if (showingSuggestions && totalSuggestions > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < totalSuggestions - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : totalSuggestions - 1
          );
        } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const item = suggestionsRef.current?.getSelectedItem();
          if (item) {
            handleSuggestionSelect(item.value, item.type as any);
          }
        } else if (e.key === 'Escape') {
          if (showingSuggestions) {
            setShowingSuggestions(false);
            setSelectedSuggestionIndex(-1);
          } else {
            onClose();
          }
        }
        return;
      }

      // Handle results navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev < totalResults - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex((prev) =>
          prev > 0 ? prev - 1 : totalResults - 1
        );
      } else if (e.key === 'Enter' && selectedResultIndex >= 0 && results[selectedResultIndex]) {
        e.preventDefault();
        onResultClick?.(results[selectedResultIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, selectedResultIndex, showingSuggestions, selectedSuggestionIndex, onResultClick, onClose]
  );

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (value: string, type: 'destination' | 'city' | 'category' | 'query') => {
      setShowingSuggestions(false);
      setSelectedSuggestionIndex(-1);

      if (type === 'destination') {
        // Navigate to destination
        window.location.href = `/destinations/${value}`;
      } else if (type === 'city' || type === 'category') {
        // Update query and search
        setQuery(value);
        onSearch(value, activeFilters);
        addSearch(value);
      } else {
        // Query from recent/trending
        setQuery(value);
        onSearch(value, activeFilters);
      }
    },
    [activeFilters, onSearch, addSearch]
  );

  // Handle escape key at window level
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) => {
      const newFilters = prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId];
      debouncedSearch(query, newFilters);
      return newFilters;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-900">
        <div className="flex items-center gap-3 text-gray-400">
          <Search className="w-5 h-5" />
          <span className="text-sm">Search</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Keyboard hints */}
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">
                <ArrowUp className="w-3 h-3 inline" />
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">
                <ArrowDown className="w-3 h-3 inline" />
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">
                <CornerDownLeft className="w-3 h-3 inline" />
              </kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono">esc</kbd>
              close
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Search Input with Suggestions */}
      <div className="relative px-6 py-8 border-b border-gray-100 dark:border-gray-900">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowingSuggestions(true)}
          placeholder={placeholder}
          className="w-full text-3xl font-serif border-none focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-gray-800"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && showingSuggestions && (
          <SearchSuggestions
            ref={suggestionsRef}
            query={query}
            suggestions={suggestions}
            recentSearches={recentSearches}
            isLoading={isFetchingSuggestions}
            selectedIndex={selectedSuggestionIndex}
            onSelect={handleSuggestionSelect}
            onRemoveRecent={removeSearch}
            onClearRecent={clearSearches}
          />
        )}
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="flex gap-2 px-6 py-4 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-900">
          {filters.map((filter) => {
            const isActive = activeFilters.includes(filter.id);
            return (
              <button
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div className="px-6 py-4 space-y-1 overflow-y-auto h-[calc(100%-200px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => onResultClick?.(result)}
              onMouseEnter={() => setSelectedResultIndex(index)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-lg transition-colors text-left',
                selectedResultIndex === index
                  ? 'bg-gray-100 dark:bg-gray-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
              )}
            >
              {/* Image */}
              {result.image && (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                  <img
                    src={result.image}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  <HighlightMatch text={result.title} query={query} />
                </h4>
                {result.subtitle && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    <HighlightMatch text={result.subtitle} query={query} />
                  </p>
                )}
              </div>

              {/* Type Badge */}
              {result.type && (
                <span className="text-[10px] uppercase tracking-widest text-gray-400 flex-shrink-0">
                  {result.type}
                </span>
              )}

              {/* Selection indicator */}
              {selectedResultIndex === index && (
                <CornerDownLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </button>
          ))
        ) : query ? (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-600">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-2">
              Try a different search term or remove some filters
            </p>
          </div>
        ) : !showingSuggestions ? (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-600">
              Start typing to search
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
