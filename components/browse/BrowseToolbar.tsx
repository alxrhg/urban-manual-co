'use client';

import { memo } from 'react';
import { LayoutGrid, List, Map, ArrowUpDown, TrendingUp, Star, Clock, DollarSign } from 'lucide-react';

export type SortOption = 'popularity' | 'rating' | 'newest' | 'price_asc' | 'price_desc' | 'name';
export type ViewMode = 'grid' | 'list';

interface BrowseToolbarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  resultCount: number;
  className?: string;
}

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof TrendingUp }[] = [
  { value: 'popularity', label: 'Most Popular', icon: TrendingUp },
  { value: 'rating', label: 'Highest Rated', icon: Star },
  { value: 'newest', label: 'Newest', icon: Clock },
  { value: 'price_asc', label: 'Price: Low to High', icon: DollarSign },
  { value: 'price_desc', label: 'Price: High to Low', icon: DollarSign },
  { value: 'name', label: 'Name A-Z', icon: ArrowUpDown },
];

export const BrowseToolbar = memo(function BrowseToolbar({
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  resultCount,
  className = '',
}: BrowseToolbarProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}>
      {/* Left side - Sort */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Sort by</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onSortChange(option.value)}
              className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                sortBy === option.value
                  ? 'font-medium text-black dark:text-white'
                  : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right side - View Toggle + Results Count */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {resultCount} {resultCount === 1 ? 'result' : 'results'}
        </span>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-full transition-all duration-200 ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-full transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});
