'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, SlidersHorizontal, LayoutGrid, Map, Plus, X } from 'lucide-react';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';
import Image from 'next/image';
import { SearchFiltersComponent } from '@/src/features/search/SearchFilters';
import type { SearchFilters } from '@/src/features/search/SearchFilters';

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
  const citiesDropdownRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

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

  const displayedCities = showAllCities ? cities : cities.slice(0, 4);
  const getCategoryIcon = (category: string) => getCategoryIconComponent(category);

  return (
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
                onClick={() => onSearchChange('')}
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
            onClick={() => setIsCitiesDropdownOpen(!isCitiesDropdownOpen)}
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

        {/* 3. Filter Button - Capsule, opens filters expand pushdown */}
        <div className="relative">
          <SearchFiltersComponent
            filters={filters}
            onFiltersChange={onFiltersChange}
            availableCities={availableCities}
            availableCategories={availableCategories}
            onLocationChange={onLocationChange}
            sortBy={sortBy}
            onSortChange={onSortChange}
            isAdmin={isAdmin}
          />
        </div>

        {/* 4. Category Selector - Horizontal scroll, chips */}
        <div 
          ref={categoryScrollRef}
          className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide ${isCategoryScrollable ? 'max-w-[300px] md:max-w-none' : ''}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => {
              onCategoryChange('');
              onAdvancedFiltersChange({
                ...advancedFilters,
                category: undefined,
                michelin: undefined,
              });
            }}
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
            onClick={() => {
              const newValue = !advancedFilters.michelin;
              onCategoryChange('');
              onAdvancedFiltersChange({
                ...advancedFilters,
                category: undefined,
                michelin: newValue || undefined,
              });
            }}
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
            onClick={() => onViewModeChange('grid')}
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
            onClick={() => onViewModeChange('map')}
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
  );
}

