'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X, Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toTitleCase } from '@/lib/utils';

export interface ExpandableSelectProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** List of options to choose from */
  options: string[];
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Label for the field (used in "+ Add {label}" text) */
  fieldLabel?: string;
  /** Featured options to show prominently */
  featuredOptions?: string[];
  /** Whether to allow custom values not in the options list */
  allowCustomValue?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class name for the container */
  className?: string;
  /** Whether the dropdown is loading options */
  isLoading?: boolean;
  /** Maximum number of items to show before "more" link */
  maxItemsShown?: number;
}

export function ExpandableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  fieldLabel = 'item',
  featuredOptions = [],
  allowCustomValue = true,
  disabled = false,
  className,
  isLoading = false,
  maxItemsShown = 16,
}: ExpandableSelectProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllItems, setShowAllItems] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setSearchQuery('');
        setShowAllItems(false);
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
      // Small delay to allow animation to start
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isExpanded]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setSearchQuery('');
      setShowAllItems(false);
    } else if (e.key === 'Enter' && searchQuery.trim() && allowCustomValue) {
      const normalizedValue = toTitleCase(searchQuery.trim());
      onChange(normalizedValue);
      setIsExpanded(false);
      setSearchQuery('');
    }
  }, [searchQuery, allowCustomValue, onChange]);

  const handleToggle = () => {
    if (!disabled) {
      setIsExpanded(!isExpanded);
      if (isExpanded) {
        setSearchQuery('');
        setShowAllItems(false);
      }
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsExpanded(false);
    setSearchQuery('');
    setShowAllItems(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleCustomValueSubmit = () => {
    if (searchQuery.trim() && allowCustomValue) {
      const normalizedValue = toTitleCase(searchQuery.trim());
      onChange(normalizedValue);
      setIsExpanded(false);
      setSearchQuery('');
    }
  };

  // Filter options based on search query
  const filteredOptions = options.filter(
    (option) => !searchQuery || option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get featured options that exist in the options list
  const validFeaturedOptions = featuredOptions.filter(opt => options.includes(opt));

  // Get all other options (not in featured list)
  const allOtherOptions = filteredOptions.filter(opt => !validFeaturedOptions.includes(opt));

  // Determine if we need to show "more" link
  const shouldShowMore = allOtherOptions.length > maxItemsShown && !showAllItems && !searchQuery;
  const displayedOtherOptions = shouldShowMore ? allOtherOptions.slice(0, maxItemsShown) : allOtherOptions;

  // Check if search query matches an existing option
  const searchMatchesExisting = options.some(
    (option) => option.toLowerCase() === searchQuery.trim().toLowerCase()
  );

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
              <span>Add {fieldLabel}</span>
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
        <div
          ref={contentRef}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg overflow-hidden"
        >
          {/* Search Field */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${fieldLabel.toLowerCase()}s...`}
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

            {/* Custom value option */}
            {searchQuery.trim() && allowCustomValue && !searchMatchesExisting && (
              <button
                type="button"
                onClick={handleCustomValueSubmit}
                className="w-full text-left px-2 py-1.5 mt-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
              >
                Use &ldquo;{toTitleCase(searchQuery.trim())}&rdquo;
              </button>
            )}
          </div>

          {/* Content Area */}
          <div className="max-h-[250px] overflow-y-auto p-3 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Featured Section */}
                {validFeaturedOptions.length > 0 && !searchQuery && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Featured {fieldLabel}s
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {validFeaturedOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSelect(option)}
                          className={cn(
                            'px-3 py-1.5 text-sm rounded-md transition-colors',
                            value === option
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* All/Search Results Section */}
                {(displayedOtherOptions.length > 0 || searchQuery) && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      {searchQuery ? `Search Results (${filteredOptions.length})` : `All ${fieldLabel}s`}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {displayedOtherOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSelect(option)}
                          className={cn(
                            'px-3 py-1.5 text-sm rounded-md transition-colors',
                            value === option
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {/* Show more link */}
                    {shouldShowMore && (
                      <button
                        type="button"
                        onClick={() => setShowAllItems(true)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        +{allOtherOptions.length - maxItemsShown} more {fieldLabel.toLowerCase()}s...
                      </button>
                    )}

                    {/* Empty state */}
                    {filteredOptions.length === 0 && searchQuery && !allowCustomValue && (
                      <p className="text-sm text-gray-500 py-2">No matching {fieldLabel.toLowerCase()}s found</p>
                    )}
                  </div>
                )}

                {/* Empty state when no options */}
                {options.length === 0 && !isLoading && (
                  <p className="text-sm text-gray-500 py-4 text-center">No {fieldLabel.toLowerCase()}s available</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
