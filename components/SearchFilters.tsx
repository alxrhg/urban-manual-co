'use client';

import { useState } from 'react';
import { X, SlidersHorizontal, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-2xl transition-opacity flex-shrink-0"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              {Object.entries(filters).map(([key, value]) => {
                let displayValue = String(value);
                if (key === 'openNow' && value === true) displayValue = 'Open Now';
                else if (key === 'michelin' && value === true) displayValue = 'Michelin';
                else if (key === 'crown' && value === true) displayValue = 'Crown';
                else if (key === 'minPrice') displayValue = `Min $${'$'.repeat(value as number)}`;
                else if (key === 'maxPrice') displayValue = `Max $${'$'.repeat(value as number)}`;
                else if (key === 'minRating') displayValue = `${value}+ ⭐`;
                
                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {displayValue}
                    <button
                      onClick={() => clearFilter(key as keyof SearchFilters)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <select
                value={filters.city || ''}
                onChange={(e) => updateFilter('city', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Select City</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Select Category</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Michelin Filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.michelin || false}
                  onChange={(e) => updateFilter('michelin', e.target.checked || undefined)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Michelin Starred Only</span>
              </label>
            </div>

            {/* Crown Filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.crown || false}
                  onChange={(e) => updateFilter('crown', e.target.checked || undefined)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Crown Badge Only</span>
              </label>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-2">Price Level</label>
              <div className="flex gap-2">
                <select
                  value={filters.minPrice || ''}
                  onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Min</option>
                  {[1, 2, 3, 4].map(level => (
                    <option key={level} value={level}>{'$'.repeat(level)}</option>
                  ))}
                </select>
                <select
                  value={filters.maxPrice || ''}
                  onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Max</option>
                  {[1, 2, 3, 4].map(level => (
                    <option key={level} value={level}>{'$'.repeat(level)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Minimum Rating</label>
              <select
                value={filters.minRating || ''}
                onChange={(e) => updateFilter('minRating', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Any</option>
                <option value="4.5">4.5+ ⭐</option>
                <option value="4.0">4.0+ ⭐</option>
                <option value="3.5">3.5+ ⭐</option>
                <option value="3.0">3.0+ ⭐</option>
              </select>
            </div>

            {/* Open Now Filter */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.openNow || false}
                  onChange={(e) => updateFilter('openNow', e.target.checked || undefined)}
                  className="w-4 h-4 rounded"
                />
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">Open Now</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

