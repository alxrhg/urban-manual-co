'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';

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
}

/**
 * SearchOverlay - Full-screen search view
 * Lovably style: large serif input, pill filters
 */
export default function SearchOverlay({
  isOpen,
  onClose,
  onSearch,
  results = [],
  filters = [],
  placeholder = 'Search...',
  isLoading,
  onResultClick,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Trigger search on query or filter change
  useEffect(() => {
    onSearch(query, activeFilters);
  }, [query, activeFilters, onSearch]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((f) => f !== filterId)
        : [...prev, filterId]
    );
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
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-6 py-8 border-b border-gray-100 dark:border-gray-900">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full text-3xl font-serif border-none focus:ring-0 focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder:text-gray-200 dark:placeholder:text-gray-800"
        />
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
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-colors
                  ${isActive
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }
                `}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Results */}
      <div className="px-6 py-4 space-y-4 overflow-y-auto h-[calc(100%-200px)]">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          results.map((result) => (
            <button
              key={result.id}
              onClick={() => onResultClick?.(result)}
              className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-sm transition-colors text-left"
            >
              {/* Image */}
              {result.image && (
                <div className="w-12 h-12 rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
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
                  {result.title}
                </h4>
                {result.subtitle && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {result.subtitle}
                  </p>
                )}
              </div>

              {/* Type Badge */}
              {result.type && (
                <span className="text-[10px] uppercase tracking-widest text-gray-400 flex-shrink-0">
                  {result.type}
                </span>
              )}
            </button>
          ))
        ) : query ? (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-600">
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 dark:text-gray-600">
              Start typing to search
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
