'use client';

import { useState } from 'react';
import { X, SlidersHorizontal, Clock } from 'lucide-react';

export interface SearchFilters {
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableCities: string[];
  availableCategories: string[];
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  availableCities,
  availableCategories,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  function updateFilter(key: keyof SearchFilters, value: any) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearFilter(key: keyof SearchFilters) {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  }

  function clearAll() {
    onFiltersChange({});
  }

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-2xl transition-opacity flex-shrink-0"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop - matches nav */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popup - matches nav design */}
          <div
            className="absolute top-full right-0 mt-2 z-50 w-80 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-black/5 overflow-hidden origin-top-right animate-in fade-in slide-in-from-top-2 duration-150"
            role="menu"
          >
            {/* Arrow/caret - matches nav */}
            <div className="absolute -top-2 right-6 h-4 w-4 rotate-45 bg-white dark:bg-gray-900 border-t border-l border-gray-200 dark:border-gray-800" />

            <div className="py-2">
              {/* Header */}
              <div className="px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Filters</span>
                {hasActiveFilters && (
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Active filters badges */}
              {hasActiveFilters && (
                <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800">
                  {Object.entries(filters).map(([key, value]) => {
                    let displayValue = String(value);
                    if (key === 'openNow' && value === true) displayValue = 'Open Now';
                    else if (key === 'michelin' && value === true) displayValue = 'Michelin';
                    else if (key === 'crown' && value === true) displayValue = 'Crown';
                    else if (key === 'minPrice') displayValue = `Min $${'$'.repeat(value as number)}`;
                    else if (key === 'maxPrice') displayValue = `Max $${'$'.repeat(value as number)}`;
                    else if (key === 'minRating') displayValue = `${value}+ ⭐`;

                    return (
                      <button
                        key={key}
                        onClick={() => clearFilter(key as keyof SearchFilters)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-xs transition-colors"
                      >
                        {displayValue}
                        <X className="h-3 w-3" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Scrollable content */}
              <div className="max-h-96 overflow-y-auto py-2">
                {/* City Filter */}
                <div className="px-4 py-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">City</label>
                  <select
                    value={filters.city || ''}
                    onChange={(e) => updateFilter('city', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <option value="">All Cities</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="px-4 py-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Category</label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => updateFilter('category', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                {/* Michelin Filter */}
                <button
                  onClick={() => updateFilter('michelin', !filters.michelin || undefined)}
                  className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.michelin || false}
                      onChange={(e) => updateFilter('michelin', e.target.checked || undefined)}
                      className="w-4 h-4 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>Michelin Starred Only</span>
                  </label>
                </button>

                {/* Crown Filter */}
                <button
                  onClick={() => updateFilter('crown', !filters.crown || undefined)}
                  className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.crown || false}
                      onChange={(e) => updateFilter('crown', e.target.checked || undefined)}
                      className="w-4 h-4 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span>Crown Badge Only</span>
                  </label>
                </button>

                {/* Open Now Filter */}
                <button
                  onClick={() => updateFilter('openNow', !filters.openNow || undefined)}
                  className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.openNow || false}
                      onChange={(e) => updateFilter('openNow', e.target.checked || undefined)}
                      className="w-4 h-4 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span>Open Now</span>
                  </label>
                </button>

                <div className="my-2 border-t border-gray-200 dark:border-gray-800" />

                {/* Price Range */}
                <div className="px-4 py-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Price Level</label>
                  <div className="flex gap-2">
                    <select
                      value={filters.minPrice || ''}
                      onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <option value="">Min</option>
                      {[1, 2, 3, 4].map(level => (
                        <option key={level} value={level}>{'$'.repeat(level)}</option>
                      ))}
                    </select>
                    <select
                      value={filters.maxPrice || ''}
                      onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <option value="">Max</option>
                      {[1, 2, 3, 4].map(level => (
                        <option key={level} value={level}>{'$'.repeat(level)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="px-4 py-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Minimum Rating</label>
                  <select
                    value={filters.minRating || ''}
                    onChange={(e) => updateFilter('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <option value="">Any</option>
                    <option value="4.5">4.5+ ⭐</option>
                    <option value="4.0">4.0+ ⭐</option>
                    <option value="3.5">3.5+ ⭐</option>
                    <option value="3.0">3.0+ ⭐</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
