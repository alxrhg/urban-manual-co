'use client';

import { useState, useEffect } from 'react';
import { X, SlidersHorizontal, MapPin, Loader2, Search } from 'lucide-react';
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
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  availableCities,
  availableCategories,
  onLocationChange,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  function updateFilter(key: keyof SearchFilters, value: any) {
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
  }, [hasLocation, latitude, longitude, filters.nearMe, nearMeRadius]);

  const hasActiveFilters = Object.keys(filters).length > 0;

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km}km`;
  };

  const capitalizeCity = (city: string) => {
    return city.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const capitalizeCategory = (category: string) => {
    return category.split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl transition-opacity hover:opacity-90"
        aria-label="Toggle filters"
        aria-expanded={isOpen}
      >
        <SlidersHorizontal className="h-5 w-5" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs bg-white/20 dark:bg-black/20 rounded-full">
            {Object.keys(filters).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="w-full mt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white">Filters</div>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-500 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="space-y-6">

              {/* Text Search - Only filters grid, doesn't trigger top search */}
              <div>
                <div className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Search</div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter destinations..."
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        clearFilter('searchQuery');
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Special Filters */}
              <div>
                <div className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Special</div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  <button
                    onClick={() => updateFilter('michelin', filters.michelin ? undefined : true)}
                    className={`transition-all ${
                      filters.michelin
                        ? "font-medium text-black dark:text-white"
                        : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                    }`}
                  >
                    Michelin
                  </button>
                  <button
                    onClick={() => updateFilter('openNow', filters.openNow ? undefined : true)}
                    className={`transition-all ${
                      filters.openNow
                        ? "font-medium text-black dark:text-white"
                        : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                    }`}
                  >
                    Open Now
                  </button>
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <div className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Minimum Rating</div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  <button
                    onClick={() => updateFilter('minRating', undefined)}
                    className={`transition-all ${
                      !filters.minRating
                        ? "font-medium text-black dark:text-white"
                        : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                    }`}
                  >
                    Any
                  </button>
                  {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => updateFilter('minRating', filters.minRating === rating ? undefined : rating)}
                      className={`transition-all ${
                        filters.minRating === rating
                          ? "font-medium text-black dark:text-white"
                          : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                      }`}
                    >
                      {rating}+
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <div className="text-xs font-medium mb-3 text-gray-500 dark:text-gray-500">Price Level</div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  <button
                    onClick={() => {
                      updateFilter('minPrice', undefined);
                      updateFilter('maxPrice', undefined);
                    }}
                    className={`transition-all ${
                      !filters.minPrice && !filters.maxPrice
                        ? "font-medium text-black dark:text-white"
                        : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                    }`}
                  >
                    Any
                  </button>
                  {[1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        if (filters.minPrice === level && filters.maxPrice === level) {
                          updateFilter('minPrice', undefined);
                          updateFilter('maxPrice', undefined);
                        } else {
                          updateFilter('minPrice', level);
                          updateFilter('maxPrice', level);
                        }
                      }}
                      className={`transition-all ${
                        filters.minPrice === level && filters.maxPrice === level
                          ? "font-medium text-black dark:text-white"
                          : "font-medium text-black/30 dark:text-gray-600 hover:text-black/60 dark:hover:text-gray-400"
                      }`}
                    >
                      {'$'.repeat(level)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Near Me Filter */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-500">Near Me</span>
                  </div>
                  <button
                    onClick={() => toggleNearMe(!filters.nearMe)}
                    disabled={loading}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      filters.nearMe ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white dark:bg-black transition-transform ${
                        filters.nearMe ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {loading && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500 mb-3">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Getting your location...</span>
                  </div>
                )}

                {error && filters.nearMe && (
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Location access denied. Please enable in browser settings.
                  </div>
                )}

                {filters.nearMe && hasLocation && !error && (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-500">Radius</span>
                      <span className="font-medium text-black dark:text-white">{formatDistance(nearMeRadius)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="25"
                      step="0.5"
                      value={nearMeRadius}
                      onChange={(e) => updateRadius(parseFloat(e.target.value))}
                      className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:bg-white"
                    />
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600">
                      <span>500m</span>
                      <span>25km</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
