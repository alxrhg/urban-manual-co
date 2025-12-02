'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  Crown,
  Clock,
  MapPin,
  Grid3X3,
  Map,
  Columns,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useHomepageStore, useFilters, useViewMode, type ViewMode, type SortOption } from '@/lib/stores/homepage-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * FilterBar - Advanced filtering and view controls
 *
 * Features:
 * - City and category dropdowns
 * - Quick filters (Michelin, Crown, Open Now)
 * - Sort options
 * - View mode toggle (Grid/Map/Split)
 * - Active filter count badge
 * - Mobile-responsive design
 * - Filter presets (save/load)
 */

// ============================================================================
// Types
// ============================================================================

interface FilterBarProps {
  cities?: string[];
  categories?: string[];
  showViewToggle?: boolean;
  className?: string;
}

// ============================================================================
// Sort Options
// ============================================================================

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'default', label: 'Featured' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'recent', label: 'Recently Added' },
];

// ============================================================================
// View Mode Icons
// ============================================================================

const VIEW_MODE_CONFIG: { value: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'grid', label: 'Grid', icon: Grid3X3 },
  { value: 'map', label: 'Map', icon: Map },
  { value: 'split', label: 'Split', icon: Columns },
];

// ============================================================================
// Filter Bar Component
// ============================================================================

export const FilterBar = memo(function FilterBar({
  cities = [],
  categories = [],
  showViewToggle = true,
  className,
}: FilterBarProps) {
  // Store state
  const { filters, activeCount, setFilter, clearFilters, clearFilter } = useFilters();
  const { viewMode, setViewMode } = useViewMode();
  const sortBy = useHomepageStore((state) => state.sortBy);
  const setSortBy = useHomepageStore((state) => state.setSortBy);
  const totalItems = useHomepageStore((state) => state.pagination.totalItems);

  // Local state for expanded filter panel
  const [showExpandedFilters, setShowExpandedFilters] = useState(false);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handlers
  const handleCityChange = useCallback((city: string) => {
    setFilter('city', city === filters.city ? '' : city);
  }, [filters.city, setFilter]);

  const handleCategoryChange = useCallback((category: string) => {
    setFilter('category', category === filters.category ? '' : category);
  }, [filters.category, setFilter]);

  const handleQuickFilter = useCallback((key: 'michelinOnly' | 'crownOnly' | 'openNow') => {
    setFilter(key, !filters[key]);
  }, [filters, setFilter]);

  return (
    <div className={cn('w-full', className)} data-component="FilterBar">
      {/* Main Filter Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* City Filter */}
          <FilterDropdown
            label="City"
            value={filters.city}
            options={cities}
            onChange={handleCityChange}
            icon={MapPin}
          />

          {/* Category Filter */}
          <FilterDropdown
            label="Category"
            value={filters.category}
            options={categories}
            onChange={handleCategoryChange}
          />

          {/* Quick Filters */}
          <div className="hidden sm:flex items-center gap-1.5">
            <QuickFilterButton
              active={filters.michelinOnly}
              onClick={() => handleQuickFilter('michelinOnly')}
              icon={Star}
              label="Michelin"
            />
            <QuickFilterButton
              active={filters.crownOnly}
              onClick={() => handleQuickFilter('crownOnly')}
              icon={Crown}
              label="Crown"
            />
            <QuickFilterButton
              active={filters.openNow}
              onClick={() => handleQuickFilter('openNow')}
              icon={Clock}
              label="Open"
            />
          </div>

          {/* More Filters Button (Mobile) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExpandedFilters(!showExpandedFilters)}
            className={cn(
              'h-8 px-3 text-xs font-medium gap-1.5',
              activeCount > 0 && 'border-black dark:border-white'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>

          {/* Clear Filters */}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Right: View controls */}
        <div className="flex items-center gap-2">
          {/* Results count */}
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            {totalItems.toLocaleString()} places
          </span>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium gap-1">
                <span className="hidden sm:inline">Sort:</span>
                <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className="text-xs"
                >
                  {sortBy === option.value && <Check className="w-3 h-3 mr-2" />}
                  <span className={sortBy !== option.value ? 'ml-5' : ''}>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle */}
          {showViewToggle && (
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {VIEW_MODE_CONFIG.map((config) => (
                <button
                  key={config.value}
                  onClick={() => setViewMode(config.value)}
                  className={cn(
                    'p-1.5 transition-colors',
                    viewMode === config.value
                      ? 'bg-black dark:bg-white text-white dark:text-black'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                  title={config.label}
                  aria-label={`Switch to ${config.label} view`}
                >
                  <config.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Pills */}
      <AnimatePresence>
        {activeCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-wrap gap-2"
          >
            {filters.city && (
              <FilterPill
                label={`City: ${filters.city}`}
                onRemove={() => clearFilter('city')}
              />
            )}
            {filters.category && (
              <FilterPill
                label={`Category: ${filters.category}`}
                onRemove={() => clearFilter('category')}
              />
            )}
            {filters.michelinOnly && (
              <FilterPill
                label="Michelin starred"
                onRemove={() => clearFilter('michelinOnly')}
              />
            )}
            {filters.crownOnly && (
              <FilterPill
                label="Crown awarded"
                onRemove={() => clearFilter('crownOnly')}
              />
            )}
            {filters.openNow && (
              <FilterPill
                label="Open now"
                onRemove={() => clearFilter('openNow')}
              />
            )}
            {filters.searchTerm && (
              <FilterPill
                label={`Search: "${filters.searchTerm}"`}
                onRemove={() => clearFilter('searchTerm')}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {showExpandedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Quick Filters (Mobile) */}
              <div className="col-span-2 sm:hidden">
                <p className="text-xs font-medium text-gray-500 mb-2">Quick Filters</p>
                <div className="flex flex-wrap gap-2">
                  <QuickFilterButton
                    active={filters.michelinOnly}
                    onClick={() => handleQuickFilter('michelinOnly')}
                    icon={Star}
                    label="Michelin"
                    size="lg"
                  />
                  <QuickFilterButton
                    active={filters.crownOnly}
                    onClick={() => handleQuickFilter('crownOnly')}
                    icon={Crown}
                    label="Crown"
                    size="lg"
                  />
                  <QuickFilterButton
                    active={filters.openNow}
                    onClick={() => handleQuickFilter('openNow')}
                    icon={Clock}
                    label="Open Now"
                    size="lg"
                  />
                </div>
              </div>

              {/* Price Level */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Price Level</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilter('priceLevel', filters.priceLevel === level ? null : level)}
                      className={cn(
                        'px-2.5 py-1.5 text-xs rounded-lg transition-colors',
                        filters.priceLevel === level
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {'$'.repeat(level)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Min Rating</p>
                <div className="flex gap-1">
                  {[4, 4.5, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setFilter('minRating', filters.minRating === rating ? null : rating)}
                      className={cn(
                        'px-2.5 py-1.5 text-xs rounded-lg flex items-center gap-1 transition-colors',
                        filters.minRating === rating
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      {rating}+
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
}

function FilterDropdown({ label, value, options, onChange, icon: Icon }: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 px-3 text-xs font-medium gap-1.5',
            value && 'border-black dark:border-white'
          )}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          <span>{value || label}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-gray-500">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-64">
          <DropdownMenuItem
            onClick={() => onChange('')}
            className="text-xs"
          >
            {!value && <Check className="w-3 h-3 mr-2" />}
            <span className={value ? 'ml-5' : ''}>All {label}s</span>
          </DropdownMenuItem>
          {options.map((option) => (
            <DropdownMenuItem
              key={option}
              onClick={() => onChange(option)}
              className="text-xs"
            >
              {value === option && <Check className="w-3 h-3 mr-2" />}
              <span className={value !== option ? 'ml-5' : ''}>{option}</span>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface QuickFilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  size?: 'sm' | 'lg';
}

function QuickFilterButton({ active, onClick, icon: Icon, label, size = 'sm' }: QuickFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full transition-all',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
        active
          ? 'bg-black dark:bg-white text-white dark:text-black'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5', active && 'fill-current')} />
      <span>{label}</span>
    </button>
  );
}

interface FilterPillProps {
  label: string;
  onRemove: () => void;
}

function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={onRemove}
      className="flex items-center gap-1.5 h-7 px-2.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
    >
      <span>{label}</span>
      <X className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
    </motion.button>
  );
}

export default FilterBar;
