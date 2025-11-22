'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Globe, Funnel, LayoutGrid, Map, Plus } from 'lucide-react';
import type { SearchFilters } from '@/src/features/search/SearchFilters';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

interface ExpandableHomeControlsProps {
  // Cities
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  displayedCities: string[];
  showAllCities: boolean;
  onToggleShowAllCities: () => void;
  
  // Categories
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  
  // Filters
  advancedFilters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableCities: string[];
  availableCategories: string[];
  onLocationChange?: (lat: number | null, lng: number | null, radius: number) => void;
  sortBy?: 'default' | 'recent';
  onSortChange?: (sortBy: 'default' | 'recent') => void;
  isAdmin?: boolean;
  onTrackFilterChange: (data: { filterType: string; value: any }) => void;
  
  // View Toggle
  viewMode: 'grid' | 'map';
  onViewModeChange: (mode: 'grid' | 'map') => void;
  
  // Create Trip
  onCreateTrip: () => void;
  onAddPOI?: () => void;
}

export function ExpandableHomeControls({
  cities,
  selectedCity,
  onCityChange,
  displayedCities,
  showAllCities,
  onToggleShowAllCities,
  categories,
  selectedCategory,
  onCategoryChange,
  advancedFilters,
  onFiltersChange,
  availableCities,
  availableCategories,
  onLocationChange,
  sortBy,
  onSortChange,
  isAdmin,
  onTrackFilterChange,
  viewMode,
  onViewModeChange,
  onCreateTrip,
  onAddPOI,
}: ExpandableHomeControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);

  // Collapse on scroll
  useEffect(() => {
    if (!isExpanded) return;

    const handleScroll = () => {
      setIsExpanded(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  // Collapse on background click
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Drag to collapse handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isExpanded) return;
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  }, [isExpanded]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !isExpanded) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - startYRef.current;
    
    // Only allow dragging down (positive diffY)
    if (diffY > 0) {
      setDragY(diffY);
    }
  }, [isDragging, isExpanded]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    const threshold = window.innerHeight * 0.25; // 25% of screen height
    if (dragY > threshold) {
      setIsExpanded(false);
    }
    
    setDragY(0);
    setIsDragging(false);
  }, [isDragging, dragY]);

  const handleFilterPillClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleResetFilters = () => {
    onFiltersChange({});
    onCityChange('');
    onCategoryChange('');
  };

  const hasActiveFilters = Object.keys(advancedFilters).some(
    key => advancedFilters[key as keyof SearchFilters] !== undefined && 
           advancedFilters[key as keyof SearchFilters] !== null &&
           advancedFilters[key as keyof SearchFilters] !== ''
  ) || selectedCity || selectedCategory;

  // Spring animation style - iOS-style spring interpolation
  const springStyle = {
    transform: isExpanded 
      ? `translateY(0)` 
      : `translateY(${Math.min(dragY, 0)}px)`,
    transition: isDragging 
      ? 'none' 
      : isExpanded 
        ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out, max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out, max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  return (
    <div id="mid-nav" className="relative w-full sticky" style={{ top: '56px', zIndex: 250 }}>
      {/* Backdrop blur when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 transition-opacity duration-300"
          style={{ opacity: isExpanded ? 1 : 0 }}
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Controls Container */}
      <div
        ref={containerRef}
        className="relative z-50"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={springStyle}
      >
        {/* Collapsed State - Right-aligned horizontal stack */}
        <div 
          className={`flex items-center justify-end gap-2 transition-all duration-300 ${
            isExpanded ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100 h-11'
          }`}
          style={{ gap: '8px' }}
        >
          {/* Discover by Cities Pill */}
          <Link
            href="/cities"
            className="flex items-center justify-center gap-2 h-11 px-3.5 text-sm font-medium rounded-full transition-all duration-200 bg-white dark:bg-[rgba(255,255,255,0.06)] border border-gray-200 dark:border-[rgba(255,255,255,0.18)] text-gray-900 dark:text-[#F7F7F7] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.16)] backdrop-blur-[12px]"
          >
            <Globe className="h-4 w-4" />
            <span>Discover by Cities</span>
          </Link>

          {/* Filter Pill */}
          <button
            onClick={handleFilterPillClick}
            className={`flex items-center justify-center gap-2 h-11 px-3.5 text-sm font-medium rounded-full transition-all duration-200 bg-white dark:bg-[rgba(255,255,255,0.06)] border border-gray-200 dark:border-[rgba(255,255,255,0.18)] text-gray-900 dark:text-[#F7F7F7] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.16)] backdrop-blur-[12px] ${
              hasActiveFilters ? 'ring-2 ring-blue-500/50' : ''
            }`}
          >
            <Funnel className="h-4 w-4" />
            <span className="hidden md:inline">Filters</span>
            {hasActiveFilters && (
              <span className="flex items-center justify-center min-w-[18px] h-4.5 px-1.5 text-xs bg-blue-500 text-white rounded-full">
                {Object.keys(advancedFilters).filter(key => advancedFilters[key as keyof SearchFilters] !== undefined && advancedFilters[key as keyof SearchFilters] !== null && advancedFilters[key as keyof SearchFilters] !== '').length + (selectedCity ? 1 : 0) + (selectedCategory ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Grid/Map Toggle - Single Toggle Button */}
          <button
            onClick={() => onViewModeChange(viewMode === 'grid' ? 'map' : 'grid')}
            className="flex items-center justify-center gap-1.5 h-11 px-4 text-sm font-medium rounded-full transition-all duration-200 bg-white dark:bg-[rgba(255,255,255,0.06)] border border-gray-200 dark:border-[rgba(255,255,255,0.18)] text-gray-900 dark:text-[#F5F5F5] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.12)] active:bg-gray-100 dark:active:bg-[rgba(255,255,255,0.18)] backdrop-blur-[14px]"
            style={{ 
              gap: '6px',
              fontWeight: 500
            }}
            aria-label={viewMode === 'grid' ? 'Switch to Map' : 'Switch to Grid'}
          >
            {viewMode === 'grid' ? (
              <>
                <Map className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
                <span>Map</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
                <span>Grid</span>
              </>
            )}
          </button>

          {/* Create Trip Pill */}
          {isAdmin && onAddPOI ? (
            <button
              onClick={onAddPOI}
              className="flex items-center justify-center gap-2 h-11 px-3.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Add POI</span>
            </button>
          ) : (
            <button
              onClick={onCreateTrip}
              className="flex items-center justify-center gap-2 h-11 px-3.5 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Create Trip</span>
            </button>
          )}
        </div>

        {/* Expanded State */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? 'opacity-100 max-h-[2000px] py-4' : 'opacity-0 max-h-0 py-0'
          }`}
        >
          <div className="space-y-4">
            {/* Cities Section - Scroll Pills */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                <button
                  onClick={() => {
                    onCityChange('');
                    onTrackFilterChange({ filterType: 'city', value: 'all' });
                  }}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    !selectedCity
                      ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                      : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  All Cities
                </button>
                {(showAllCities ? cities : displayedCities).slice(0, 5).map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      const newCity = city === selectedCity ? '' : city;
                      onCityChange(newCity);
                      onTrackFilterChange({ filterType: 'city', value: newCity || 'all' });
                    }}
                    className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                      selectedCity === city
                        ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                        : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {capitalizeCity(city)}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories Section - Scroll Pills */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
                <button
                  onClick={() => {
                    onCategoryChange('');
                    onFiltersChange({ ...advancedFilters, category: undefined, michelin: undefined });
                    onTrackFilterChange({ filterType: 'category', value: 'all' });
                  }}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                    !selectedCategory && !advancedFilters.michelin
                      ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                      : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  All Categories
                </button>
                {categories.slice(0, 6).map((category) => {
                  const IconComponent = getCategoryIconComponent(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        const newCategory = category === selectedCategory ? '' : category;
                        onCategoryChange(newCategory);
                        onFiltersChange({ ...advancedFilters, category: newCategory || undefined });
                        onTrackFilterChange({ filterType: 'category', value: newCategory || 'all' });
                      }}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                        selectedCategory === category
                          ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      {IconComponent && <IconComponent className="h-3.5 w-3.5" />}
                      {capitalizeCategory(category)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filters Section - Inline Form */}
            <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.04)] rounded-2xl p-4 border border-gray-200 dark:border-[rgba(255,255,255,0.12)]">
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-900 dark:text-[#F7F7F7] mb-3">
                  Advanced Filters
                </div>
                
                {/* Special Filters */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-[rgba(255,255,255,0.52)] uppercase tracking-wide">
                    Special
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !advancedFilters.michelin;
                        onFiltersChange({ ...advancedFilters, michelin: newValue || undefined });
                        onTrackFilterChange({ filterType: 'michelin', value: newValue });
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        advancedFilters.michelin
                          ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      Michelin
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !advancedFilters.openNow;
                        onFiltersChange({ ...advancedFilters, openNow: newValue || undefined });
                        onTrackFilterChange({ filterType: 'openNow', value: newValue });
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        advancedFilters.openNow
                          ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      Open Now
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = !advancedFilters.excludeNested;
                          onFiltersChange({ ...advancedFilters, excludeNested: newValue || undefined });
                          onTrackFilterChange({ filterType: 'excludeNested', value: newValue });
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          advancedFilters.excludeNested
                            ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                            : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                        }`}
                        title="Hide nested places (e.g., restaurants in hotels)"
                      >
                        Exclude Nested
                      </button>
                    )}
                  </div>
                </div>

                {/* Rating Filter */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-[rgba(255,255,255,0.52)] uppercase tracking-wide">
                    Minimum Rating
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onFiltersChange({ ...advancedFilters, minRating: undefined });
                        onTrackFilterChange({ filterType: 'minRating', value: null });
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        !advancedFilters.minRating
                          ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      Any
                    </button>
                    {[4.5, 4.0, 3.5, 3.0].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => {
                          const newValue = advancedFilters.minRating === rating ? undefined : rating;
                          onFiltersChange({ ...advancedFilters, minRating: newValue });
                          onTrackFilterChange({ filterType: 'minRating', value: newValue });
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          advancedFilters.minRating === rating
                            ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                            : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                        }`}
                      >
                        {rating}+
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Filter */}
                <div className="space-y-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-[rgba(255,255,255,0.52)] uppercase tracking-wide">
                    Price Level
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onFiltersChange({ ...advancedFilters, minPrice: undefined, maxPrice: undefined });
                        onTrackFilterChange({ filterType: 'price', value: null });
                      }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        !advancedFilters.minPrice && !advancedFilters.maxPrice
                          ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                          : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                      }`}
                    >
                      Any
                    </button>
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          const isActive = advancedFilters.minPrice === level && advancedFilters.maxPrice === level;
                          onFiltersChange({ 
                            ...advancedFilters, 
                            minPrice: isActive ? undefined : level,
                            maxPrice: isActive ? undefined : level
                          });
                          onTrackFilterChange({ filterType: 'price', value: isActive ? null : level });
                        }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                          advancedFilters.minPrice === level && advancedFilters.maxPrice === level
                            ? 'bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7]'
                            : 'bg-gray-100 dark:bg-[rgba(255,255,255,0.06)] text-gray-700 dark:text-[rgba(255,255,255,0.52)] hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.08)]'
                        }`}
                      >
                        {'$'.repeat(level)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="flex items-center justify-end gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-[rgba(255,255,255,0.52)] hover:text-gray-900 dark:hover:text-[#F7F7F7] transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 text-sm font-medium bg-gray-900 dark:bg-[rgba(255,255,255,0.12)] text-white dark:text-[#F7F7F7] rounded-full hover:opacity-90 transition-opacity"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

