'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, X, SlidersHorizontal, Star, DollarSign, MapPin } from 'lucide-react';
import { VALID_CATEGORIES, type CategoryType } from '@/lib/categories';
import { capitalizeCity, capitalizeCategory } from '@/lib/utils';

export interface AdvancedFilters {
  category?: string;
  city?: string;
  priceRange?: 'budget' | 'moderate' | 'premium' | 'luxury';
  minRating?: number;
  michelinStars?: number;
  architect?: string;
  hasArchitect?: boolean;
  sortBy?: 'featured' | 'newest' | 'popular' | 'rating';
}

interface AdvancedFilterProps {
  filters?: AdvancedFilters;
  onFiltersChange?: (filters: AdvancedFilters) => void;
  cities?: string[];
  architects?: string[];
  className?: string;
  showAsDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const PRICE_RANGES = [
  { value: 'budget', label: 'Budget', icon: '$' },
  { value: 'moderate', label: 'Moderate', icon: '$$' },
  { value: 'premium', label: 'Premium', icon: '$$$' },
  { value: 'luxury', label: 'Luxury', icon: '$$$$' },
] as const;

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
] as const;

/**
 * Advanced Filter Component
 * Provides comprehensive filtering for destinations with category alias support
 */
export function AdvancedFilter({
  filters = {},
  onFiltersChange,
  cities = [],
  architects = [],
  className = '',
  showAsDrawer = false,
  isOpen = true,
  onClose,
}: AdvancedFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(isOpen);

  // Local filter state
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(localFilters).filter(v => v !== undefined && v !== '').length;
  }, [localFilters]);

  // Update filter and notify parent
  const updateFilter = useCallback(<K extends keyof AdvancedFilters>(
    key: K,
    value: AdvancedFilters[K]
  ) => {
    const newFilters = { ...localFilters, [key]: value || undefined };

    // Remove undefined values
    Object.keys(newFilters).forEach(k => {
      if (newFilters[k as keyof AdvancedFilters] === undefined) {
        delete newFilters[k as keyof AdvancedFilters];
      }
    });

    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [localFilters, onFiltersChange]);

  // Apply filters to URL and navigate
  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Clear existing filter params
    ['category', 'city', 'price', 'rating', 'michelin', 'architect', 'sort'].forEach(key => {
      params.delete(key);
    });

    // Set new params
    if (localFilters.category) params.set('category', localFilters.category.toLowerCase());
    if (localFilters.city) params.set('city', localFilters.city);
    if (localFilters.priceRange) params.set('price', localFilters.priceRange);
    if (localFilters.minRating) params.set('rating', localFilters.minRating.toString());
    if (localFilters.michelinStars) params.set('michelin', localFilters.michelinStars.toString());
    if (localFilters.architect) params.set('architect', localFilters.architect);
    if (localFilters.sortBy && localFilters.sortBy !== 'featured') params.set('sort', localFilters.sortBy);

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);

    if (showAsDrawer) {
      setShowFilters(false);
      onClose?.();
    }
  }, [localFilters, searchParams, pathname, router, showAsDrawer, onClose]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setLocalFilters({});
    onFiltersChange?.({});

    // Clear URL params
    const params = new URLSearchParams(searchParams.toString());
    ['category', 'city', 'price', 'rating', 'michelin', 'architect', 'sort'].forEach(key => {
      params.delete(key);
    });

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  }, [searchParams, pathname, router, onFiltersChange]);

  // Toggle button (for non-drawer mode)
  const toggleButton = (
    <button
      onClick={() => setShowFilters(!showFilters)}
      className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-700 transition-all"
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span>Filters</span>
      {activeFilterCount > 0 && (
        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full">
          {activeFilterCount}
        </span>
      )}
      <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
    </button>
  );

  // Filter panel content
  const filterContent = (
    <div className={`bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg p-5 space-y-5 ${className}`}>
      {/* Header with clear button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Advanced Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Category
        </label>
        <select
          value={localFilters.category || ''}
          onChange={(e) => updateFilter('category', e.target.value as CategoryType || undefined)}
          className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
        >
          <option value="">All Categories</option>
          {VALID_CATEGORIES.map(category => (
            <option key={category} value={category}>
              {capitalizeCategory(category)}
            </option>
          ))}
        </select>
      </div>

      {/* City Filter */}
      {cities.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            <MapPin className="inline w-3 h-3 mr-1" />
            City
          </label>
          <select
            value={localFilters.city || ''}
            onChange={(e) => updateFilter('city', e.target.value || undefined)}
            className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          >
            <option value="">All Cities</option>
            {cities.map(city => (
              <option key={city} value={city}>
                {capitalizeCity(city)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Range */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DollarSign className="inline w-3 h-3 mr-1" />
          Price Range
        </label>
        <div className="flex gap-2">
          {PRICE_RANGES.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => updateFilter('priceRange', localFilters.priceRange === value ? undefined : value)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                localFilters.priceRange === value
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Minimum Rating */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Star className="inline w-3 h-3 mr-1" />
          Minimum Rating
        </label>
        <div className="flex gap-2">
          {[4, 4.5, 5].map(rating => (
            <button
              key={rating}
              onClick={() => updateFilter('minRating', localFilters.minRating === rating ? undefined : rating)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                localFilters.minRating === rating
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {rating}+
            </button>
          ))}
        </div>
      </div>

      {/* Michelin Stars */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Michelin Stars
        </label>
        <div className="flex gap-2">
          {[1, 2, 3].map(stars => (
            <button
              key={stars}
              onClick={() => updateFilter('michelinStars', localFilters.michelinStars === stars ? undefined : stars)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                localFilters.michelinStars === stars
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {'⭐'.repeat(stars)}
            </button>
          ))}
        </div>
      </div>

      {/* Architecture Filter */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localFilters.hasArchitect || false}
            onChange={(e) => updateFilter('hasArchitect', e.target.checked || undefined)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-gray-900 dark:focus:ring-white"
          />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Show only places with architect info
          </span>
        </label>
      </div>

      {/* Architect Dropdown (if architects provided) */}
      {architects.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Architect/Designer
          </label>
          <select
            value={localFilters.architect || ''}
            onChange={(e) => updateFilter('architect', e.target.value || undefined)}
            className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          >
            <option value="">All Architects</option>
            {architects.map(architect => (
              <option key={architect} value={architect}>
                {architect}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sort By */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
          Sort By
        </label>
        <select
          value={localFilters.sortBy || 'featured'}
          onChange={(e) => updateFilter('sortBy', e.target.value as AdvancedFilters['sortBy'])}
          className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Apply Button */}
      <button
        onClick={applyFilters}
        className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
      >
        Apply Filters
        {activeFilterCount > 0 && ` (${activeFilterCount})`}
      </button>
    </div>
  );

  // Drawer mode
  if (showAsDrawer) {
    return (
      <>
        {toggleButton}
        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setShowFilters(false);
                onClose?.();
              }}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-950 rounded-t-3xl md:rounded-3xl shadow-2xl animate-slide-up">
              {/* Handle bar (mobile) */}
              <div className="flex justify-center py-3 md:hidden">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  setShowFilters(false);
                  onClose?.();
                }}
                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-5 pt-0 md:pt-5">
                {filterContent}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Dropdown mode
  return (
    <div className="relative">
      {toggleButton}
      {showFilters && (
        <div className="absolute top-full left-0 mt-2 w-80 z-50">
          {filterContent}
        </div>
      )}
    </div>
  );
}

export default AdvancedFilter;
