'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown, SlidersHorizontal, LayoutGrid, Map, Plus, X, Loader2 } from 'lucide-react';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import Image from 'next/image';
import type { SearchFilters } from '@/src/features/search/SearchFilters';
import { useGeolocation } from '@/hooks/useGeolocation';

interface NavigationRowProps {
  // Search
  searchTerm: string;
  onSearchChange: (value: string) => void;
  
  // Cities
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  showAllCities: boolean;
  onToggleShowAllCities: () => void;
  
  // Filters
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableCities: string[];
  availableCategories: string[];
  onLocationChange?: (lat: number | null, lng: number | null, radius: number) => void;
  sortBy?: 'default' | 'recent';
  onSortChange?: (sortBy: 'default' | 'recent') => void;
  isAdmin?: boolean;
  
  // Categories
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  advancedFilters: SearchFilters;
  onAdvancedFiltersChange: (filters: SearchFilters) => void;
  onTrackFilterChange: (data: { filterType: string; value: any }) => void;
  
  // View Toggle
  viewMode: 'grid' | 'map';
  onViewModeChange: (mode: 'grid' | 'map') => void;
  
  // Create Trip
  onCreateTrip: () => void;
  user?: any;
}

export function NavigationRow({
  searchTerm,
  onSearchChange,
  cities,
  selectedCity,
  onCityChange,
  showAllCities,
  onToggleShowAllCities,
  filters,
  onFiltersChange,
  availableCities,
  availableCategories,
  onLocationChange,
  sortBy,
  onSortChange,
  isAdmin,
  categories,
  selectedCategory,
  onCategoryChange,
  advancedFilters,
  onAdvancedFiltersChange,
  onTrackFilterChange,
  viewMode,
  onViewModeChange,
  onCreateTrip,
  user,
}: NavigationRowProps) {
  const [isCitiesDropdownOpen, setIsCitiesDropdownOpen] = useState(false);
  const [isCategoryScrollable, setIsCategoryScrollable] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterSearchQuery, setFilterSearchQuery] = useState(filters.searchQuery || '');
  const [nearMeRadius, setNearMeRadius] = useState(filters.nearMeRadius || 5);
  const citiesDropdownRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const { latitude, longitude, error, loading, requestLocation, hasLocation } = useGeolocation();

  // Close cities dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (citiesDropdownRef.current && !citiesDropdownRef.current.contains(event.target as Node)) {
        setIsCitiesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if category scroll is needed
  useEffect(() => {
    if (categoryScrollRef.current) {
      const { scrollWidth, clientWidth } = categoryScrollRef.current;
      setIsCategoryScrollable(scrollWidth > clientWidth);
    }
  }, [categories]);

  // Sync filterSearchQuery with filters
  useEffect(() => {
    setFilterSearchQuery(filters.searchQuery || '');
  }, [filters.searchQuery]);

  // Memoized filter handlers
  const updateFilter = useCallback((key: keyof SearchFilters, value: string | number | boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  }, [filters, onFiltersChange]);

  const clearFilter = useCallback((key: keyof SearchFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
    if (key === 'nearMe') {
      onLocationChange?.(null, null, nearMeRadius);
    }
  }, [filters, onFiltersChange, onLocationChange, nearMeRadius]);

  // Handle search query changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterSearchQuery !== (filters.searchQuery || '')) {
        if (filterSearchQuery.trim()) {
          updateFilter('searchQuery', filterSearchQuery.trim());
        } else {
          clearFilter('searchQuery');
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filterSearchQuery, filters.searchQuery, updateFilter, clearFilter]);

  const toggleNearMe = useCallback((enabled: boolean) => {
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
  }, [hasLocation, requestLocation, updateFilter, nearMeRadius, latitude, longitude, onLocationChange, clearFilter]);

  const updateRadius = useCallback((radius: number) => {
    setNearMeRadius(radius);
    updateFilter('nearMeRadius', radius);
    if (filters.nearMe && hasLocation && latitude && longitude) {
      onLocationChange?.(latitude, longitude, radius);
    }
  }, [updateFilter, filters.nearMe, hasLocation, latitude, longitude, onLocationChange]);

  useEffect(() => {
    if (filters.nearMe && hasLocation && latitude && longitude) {
      onLocationChange?.(latitude, longitude, nearMeRadius);
    }
  }, [hasLocation, latitude, longitude, filters.nearMe, nearMeRadius, onLocationChange]);

  // Memoized computed values
  const activeFilterCount = useMemo(() => Object.keys(filters).length, [filters]);
  const hasActiveFilters = activeFilterCount > 0;
  const displayedCities = useMemo(() => showAllCities ? cities : cities.slice(0, 4), [showAllCities, cities]);
  const getCategoryIcon = useCallback((category: string) => getCategoryIconComponent(category), []);

  // Memoize formatDistance as it's used in JSX
  const formatDistance = useCallback((km: number) => {
    if (km < 1) return `${Math.round(km * 1000)}m`;
    return `${km}km`;
  }, []);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleClearSearch = useCallback(() => onSearchChange(''), [onSearchChange]);
  const handleToggleCitiesDropdown = useCallback(() => setIsCitiesDropdownOpen(prev => !prev), []);
  const handleToggleFiltersOpen = useCallback(() => setIsFiltersOpen(prev => !prev), []);
  const handleCloseFilters = useCallback(() => setIsFiltersOpen(false), []);
  const handleSetGridView = useCallback(() => onViewModeChange('grid'), [onViewModeChange]);
  const handleSetMapView = useCallback(() => onViewModeChange('map'), [onViewModeChange]);

  const handleClearAllCategories = useCallback(() => {
    onCategoryChange('');
    onAdvancedFiltersChange({
      ...advancedFilters,
      category: undefined,
      michelin: undefined,
    });
  }, [onCategoryChange, onAdvancedFiltersChange, advancedFilters]);

  const handleToggleMichelin = useCallback(() => {
    const newValue = !advancedFilters.michelin;
    onCategoryChange('');
    onAdvancedFiltersChange({
      ...advancedFilters,
      category: undefined,
      michelin: newValue || undefined,
    });
  }, [advancedFilters, onCategoryChange, onAdvancedFiltersChange]);

  const handleToggleNearMeFilter = useCallback(() => {
    toggleNearMe(!filters.nearMe);
  }, [toggleNearMe, filters.nearMe]);

  return (
    <>
      <div className="w-full px-6 md:px-10 lg:px-12 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 1. Search Bar - flex-1, rounded large */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search destinations..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-950 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Cities Selector - Dropdown, capsule style */}
          <div className="relative" ref={citiesDropdownRef}>
            <button
              onClick={handleToggleCitiesDropdown}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-180 whitespace-nowrap"
            >
              <span>{selectedCity ? capitalizeCity(selectedCity) : 'All Cities'}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isCitiesDropdownOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
            </button>
            
            {isCitiesDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    onCityChange('');
                    setIsCitiesDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                    !selectedCity
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  All Cities
                </button>
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => {
                      onCityChange(city === selectedCity ? '' : city);
                      setIsCitiesDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                      selectedCity === city
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                  >
                    {capitalizeCity(city)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Filter Button - Right of city buttons */}
          <div className="relative">
            <button
              onClick={handleToggleFiltersOpen}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-180"
              aria-label={isFiltersOpen ? 'Close filters' : 'Open filters'}
              aria-expanded={isFiltersOpen}
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-[220ms] ease-out ${
                  isFiltersOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* 4. Category Selector - Horizontal scroll, chips */}
          <div 
            ref={categoryScrollRef}
            className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide ${isCategoryScrollable ? 'max-w-[300px] md:max-w-none' : ''}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={handleClearAllCategories}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-180 ${
                !selectedCategory && !advancedFilters.michelin
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All
            </button>

            {/* Michelin chip */}
            <button
              onClick={handleToggleMichelin}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-180 ${
                advancedFilters.michelin
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Image
                src="/michelin-star.svg"
                alt="Michelin star"
                width={12}
                height={12}
                className="h-3 w-3"
              />
              Michelin
            </button>
            
            {categories.map(category => {
              const IconComponent = getCategoryIcon(category);
              return (
                <button
                  key={category}
                  onClick={() => {
                    const newCategory = category === selectedCategory ? '' : category;
                    onCategoryChange(newCategory);
                    onAdvancedFiltersChange({
                      ...advancedFilters,
                      category: newCategory || undefined,
                      michelin: undefined,
                    });
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-180 ${
                    selectedCategory === category && !advancedFilters.michelin
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {IconComponent && (
                    <IconComponent className="h-3 w-3" size={12} />
                  )}
                  {capitalizeCategory(category)}
                </button>
              );
            })}
          </div>

          {/* 5. View Toggle - Segmented control */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 flex-shrink-0">
            <button
              onClick={handleSetGridView}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Grid</span>
            </button>
            <button
              onClick={handleSetMapView}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all rounded-full ${
                viewMode === 'map'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label="Map view"
            >
              <Map className="h-4 w-4" />
              <span>Map</span>
            </button>
          </div>

          {/* 6. Create Trip Button - Icon button */}
          <button
            onClick={onCreateTrip}
            className="flex items-center justify-center w-10 h-10 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:opacity-90 transition-all duration-180 flex-shrink-0"
            aria-label={user ? "Create Trip" : "Sign in to create trip"}
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel - Full Width Pushdown (in document flow) */}
      <div
        className={`w-full overflow-hidden transition-all duration-[220ms] ease-out ${
          isFiltersOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          overflow: isFiltersOpen ? 'visible' : 'hidden',
        }}
      >
        <div className="w-full px-6 md:px-10 lg:px-12 pt-5 pb-6 mb-6">
          <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 px-8 pt-6 pb-8">
            <div className="flex flex-col space-y-12">
              {/* Heading */}
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Filter destinations
              </h3>

              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                <input
                  type="text"
                  value={filterSearchQuery}
                  onChange={(e) => setFilterSearchQuery(e.target.value)}
                  placeholder="Search destinations..."
                  className="w-full pl-10 pr-10 py-3 px-4 text-sm border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all"
                />
                {filterSearchQuery && (
                  <button
                    onClick={() => {
                      setFilterSearchQuery('');
                      clearFilter('searchQuery');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                )}
              </div>

              {/* Special Section - Chips */}
              <div className="flex flex-col space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Special</h4>
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
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-180 ${
                      filters.michelin
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-180 ${
                      filters.openNow
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    aria-pressed={Boolean(filters.openNow)}
                  >
                    Open Now
                  </button>
                </div>
              </div>

              {/* Rating Section - Choice Chips */}
              <div className="flex flex-col space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Minimum Rating</h4>
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
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-180 ${
                          isSelected
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Level Section - Choice Chips */}
              <div className="flex flex-col space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Price Level</h4>
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
                        className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-180 ${
                          isSelected
                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Section - Action Row */}
              <div className="flex flex-col space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Location</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Use current location</span>
                    <button
                      type="button"
                      onClick={handleToggleNearMeFilter}
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
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-3">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Getting your location...</span>
                    </div>
                  )}
                  {error && filters.nearMe && (
                    <div className="text-xs text-red-600 dark:text-red-400 px-3">
                      Location access denied. Please enable in browser settings.
                    </div>
                  )}
                  {filters.nearMe && hasLocation && !error && (
                    <div className="space-y-2 px-3">
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
              </div>

              {/* Apply Button */}
              <div className="pt-2">
                <button
                  onClick={handleCloseFilters}
                  className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
