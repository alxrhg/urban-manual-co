'use client';

import { useState, useEffect, useRef } from 'react';
import { X, MapPin, Loader2, Search, ChevronDown, Globe2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

export interface SearchFilters {
  searchQuery?: string;
  city?: string;
  category?: string;
  michelin?: boolean;
  crown?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  openNow?: boolean;
  nearMe?: boolean;
  nearMeRadius?: number;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableCities: string[];
  availableCategories: string[];
  onLocationChange?: (lat: number | null, lng: number | null, radius: number) => void;
  sortBy?: 'default' | 'recent';
  onSortChange?: (sortBy: 'default' | 'recent') => void;
  isAdmin?: boolean;
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  availableCities: _availableCities,
  availableCategories: _availableCategories,
  onLocationChange,
  sortBy = 'default',
  onSortChange,
  isAdmin = false,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { latitude, longitude, error, loading, requestLocation, hasLocation } = useGeolocation();
  const [nearMeRadius, setNearMeRadius] = useState(filters.nearMeRadius || 5);
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery || '');

  // Sync searchQuery with filters
  useEffect(() => {
    setSearchQuery(filters.searchQuery || '');
  }, [filters.searchQuery]);

  // Handle search query changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== (filters.searchQuery || '')) {
        if (searchQuery.trim()) {
          updateFilter('searchQuery', searchQuery.trim());
        } else {
          clearFilter('searchQuery');
        }
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  function updateFilter(key: keyof SearchFilters, value: string | number | boolean) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function clearFilter(key: keyof SearchFilters) {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);

    if (key === 'nearMe') {
      onLocationChange?.(null, null, nearMeRadius);
    }
  }

  function clearAll() {
    onFiltersChange({});
    onLocationChange?.(null, null, nearMeRadius);
  }

  function toggleNearMe(enabled: boolean) {
    if (enabled) {
      if (!hasLocation) {
        requestLocation();
      }
      updateFilter('nearMe', true);
      updateFilter('nearMeRadius', nearMeRadius);
      if (hasLocation && latitude && longitude) {
        onLocationChange?.(latitude, longitude, nearMeRadius);
      }
    } else {
      clearFilter('nearMe');
      clearFilter('nearMeRadius');
      onLocationChange?.(null, null, nearMeRadius);
    }
  }

  function updateRadius(radius: number) {
    setNearMeRadius(radius);
    updateFilter('nearMeRadius', radius);
    if (filters.nearMe && hasLocation && latitude && longitude) {
      onLocationChange?.(latitude, longitude, radius);
    }
  }

  useEffect(() => {
    if (filters.nearMe && hasLocation && latitude && longitude) {
      onLocationChange?.(latitude, longitude, nearMeRadius);
    }
  }, [hasLocation, latitude, longitude, filters.nearMe, nearMeRadius, onLocationChange]);

  const activeFilterCount = Object.keys(filters).length;
  const hasActiveFilters = activeFilterCount > 0;

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km}km`;
  };

  return (
    <div>
      {/* Trigger Button - Pill Shape */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 h-9 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-180"
        aria-label={isOpen ? 'Close filters' : 'Open filters'}
        aria-expanded={isOpen}
      >
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          strokeWidth={1.5}
        />
      </button>

      {/* Expanded Panel - Directly Under Button, Pushdown */}
      <div
        ref={panelRef}
        className={`w-[320px] overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[800px] opacity-100 mt-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-transparent py-4 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Filter destinations
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations..."
                className="w-full pl-10 pr-10 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    clearFilter('searchQuery');
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* Special */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Special
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (filters.michelin) {
                    clearFilter('michelin');
                  } else {
                    updateFilter('michelin', true);
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-180 ${
                  filters.michelin
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                aria-pressed={Boolean(filters.michelin)}
              >
                Michelin
              </button>
              <button
                type="button"
                onClick={() => {
                  if (filters.openNow) {
                    clearFilter('openNow');
                  } else {
                    updateFilter('openNow', true);
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-180 ${
                  filters.openNow
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                aria-pressed={Boolean(filters.openNow)}
              >
                Open Now
              </button>
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Minimum Rating
            </label>
            <div className="flex flex-wrap gap-2">
              {['Any', '4.5+', '4+', '3.5+', '3+'].map((option) => {
                const rating = option === 'Any' ? null : parseFloat(option.replace('+', ''));
                const isSelected = rating === null
                  ? !filters.minRating
                  : filters.minRating === rating;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (rating === null) {
                        clearFilter('minRating');
                      } else {
                        if (filters.minRating === rating) {
                          clearFilter('minRating');
                        } else {
                          updateFilter('minRating', rating);
                        }
                      }
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-180 ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Level */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Price Level
            </label>
            <div className="flex flex-wrap gap-2">
              {['Any', '$', '$$', '$$$', '$$$$'].map((option) => {
                const priceLevel = option === 'Any' ? null : option.length;
                const isSelected = priceLevel === null
                  ? !filters.minPrice && !filters.maxPrice
                  : filters.minPrice === priceLevel && filters.maxPrice === priceLevel;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (priceLevel === null) {
                        clearFilter('minPrice');
                        clearFilter('maxPrice');
                      } else {
                        if (filters.minPrice === priceLevel && filters.maxPrice === priceLevel) {
                          clearFilter('minPrice');
                          clearFilter('maxPrice');
                        } else {
                          updateFilter('minPrice', priceLevel);
                          updateFilter('maxPrice', priceLevel);
                        }
                      }
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-180 ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Location
            </label>
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
              <span className="text-sm text-gray-700 dark:text-gray-300">Use current location</span>
              <button
                type="button"
                onClick={() => toggleNearMe(!filters.nearMe)}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  filters.nearMe ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                aria-pressed={Boolean(filters.nearMe)}
                aria-label={filters.nearMe ? 'Disable near me filter' : 'Enable near me filter'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                    filters.nearMe ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Getting your location...</span>
              </div>
            )}
            {error && filters.nearMe && (
              <div className="text-xs text-red-600 dark:text-red-400">
                Location access denied. Please enable in browser settings.
              </div>
            )}
            {filters.nearMe && hasLocation && !error && (
              <div className="space-y-2 mt-2">
                <label htmlFor="near-me-radius" className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Radius</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDistance(nearMeRadius)}</span>
                </label>
                <input
                  id="near-me-radius"
                  type="range"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={nearMeRadius}
                  onChange={(e) => updateRadius(parseFloat(e.target.value))}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-900 dark:[&::-webkit-slider-thumb]:bg-white"
                  aria-valuenow={nearMeRadius}
                  aria-valuetext={formatDistance(nearMeRadius)}
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600">
                  <span>500m</span>
                  <span>25km</span>
                </div>
              </div>
            )}
          </div>

          {/* Explore */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Explore
            </label>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/cities';
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-180"
            >
              <Globe2 className="h-4 w-4" strokeWidth={1.5} />
              Discover by Cities
            </button>
          </div>

          {/* Apply Button */}
          <div className="pt-2">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
