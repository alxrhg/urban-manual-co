'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryIconComponent } from '@/lib/icons/category-icons';

export interface ExpandableCategorySelectProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** List of category options to choose from */
  categories: string[];
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Featured categories to show prominently */
  featuredCategories?: string[];
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class name for the container */
  className?: string;
}

// Category item with icon
function CategoryItem({
  category,
  isSelected,
  onClick,
  size = 'default',
}: {
  category: string;
  isSelected: boolean;
  onClick: () => void;
  size?: 'default' | 'compact';
}) {
  const IconComponent = getCategoryIconComponent(category);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md transition-colors',
        size === 'compact' ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm',
        isSelected
          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      )}
    >
      {IconComponent && <IconComponent className="h-3.5 w-3.5" size={14} />}
      {category}
    </button>
  );
}

export function ExpandableCategorySelect({
  value,
  onChange,
  categories,
  placeholder = 'Select category...',
  featuredCategories = ['Dining', 'Hotel', 'Bar', 'Cafe', 'Culture', 'Shopping'],
  disabled = false,
  className,
}: ExpandableCategorySelectProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setSearchQuery('');
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Focus search input when expanded
  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isExpanded]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setSearchQuery('');
    }
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsExpanded(!isExpanded);
      if (isExpanded) {
        setSearchQuery('');
      }
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsExpanded(false);
    setSearchQuery('');
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(
    (cat) => !searchQuery || cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get featured categories that exist in the categories list
  const validFeaturedCategories = featuredCategories.filter(cat => categories.includes(cat));

  // Get all other categories (not in featured list)
  const allOtherCategories = filteredCategories.filter(cat => !validFeaturedCategories.includes(cat));

  // Get the icon for the selected category
  const SelectedIcon = value ? getCategoryIconComponent(value) : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Collapsed/Trigger State */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full min-h-[44px] px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm',
          'focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all duration-300',
          'text-left flex items-center justify-between gap-2',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {value ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
              {SelectedIcon && <SelectedIcon className="h-3.5 w-3.5" size={14} />}
              {value}
              <button
                type="button"
                onClick={handleRemove}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <X className="h-3 w-3 text-gray-500" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleToggle(); }}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add category</span>
            </button>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-300 flex-shrink-0',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded State */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-out',
          isExpanded ? 'max-h-[350px] opacity-100 mt-1' : 'max-h-0 opacity-0'
        )}
      >
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Search Field */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search categories..."
                className="w-full pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              ) : null}
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Content Area */}
          <div className="max-h-[250px] overflow-y-auto p-3 space-y-4">
            {/* Featured Categories Section */}
            {validFeaturedCategories.length > 0 && !searchQuery && (
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Popular Categories
                </span>
                <div className="flex flex-wrap gap-2">
                  {validFeaturedCategories.map((cat) => (
                    <CategoryItem
                      key={cat}
                      category={cat}
                      isSelected={value === cat}
                      onClick={() => handleSelect(cat)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All/Search Results Section */}
            {(allOtherCategories.length > 0 || searchQuery) && (
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {searchQuery ? `Search Results (${filteredCategories.length})` : 'All Categories'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(searchQuery ? filteredCategories : allOtherCategories).map((cat) => (
                    <CategoryItem
                      key={cat}
                      category={cat}
                      isSelected={value === cat}
                      onClick={() => handleSelect(cat)}
                    />
                  ))}
                </div>

                {/* Empty state */}
                {filteredCategories.length === 0 && searchQuery && (
                  <p className="text-sm text-gray-500 py-2">No matching categories found</p>
                )}
              </div>
            )}

            {/* Empty state when no categories */}
            {categories.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">No categories available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
