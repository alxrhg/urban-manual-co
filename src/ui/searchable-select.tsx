'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toTitleCase } from '@/lib/utils';

export interface SearchableSelectProps {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** List of options to choose from */
  options: string[];
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Whether the dropdown is currently open */
  isOpen?: boolean;
  /** Callback to control open state externally */
  onOpenChange?: (isOpen: boolean) => void;
  /** Whether to allow custom values not in the options list */
  allowCustomValue?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional class name for the trigger button */
  className?: string;
  /** Whether to show the clear button when a value is selected */
  showClearButton?: boolean;
  /** Whether the dropdown is loading options */
  isLoading?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  isOpen: controlledIsOpen,
  onOpenChange,
  allowCustomValue = true,
  disabled = false,
  className,
  showClearButton = true,
  isLoading = false,
}: SearchableSelectProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
      }
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const handleCustomValueSubmit = () => {
    if (searchQuery.trim() && allowCustomValue) {
      const normalizedValue = toTitleCase(searchQuery.trim());
      onChange(normalizedValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomValueSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Filter options based on search query
  const filteredOptions = options.filter(
    (option) => !searchQuery || option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches an existing option (case-insensitive)
  const searchMatchesExisting = options.some(
    (option) => option.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-shadow text-left flex items-center justify-between',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        <span className={value ? '' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {showClearButton && value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* Search Input */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={allowCustomValue ? 'Type to search or add new...' : 'Type to search...'}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            {/* Custom value option */}
            {searchQuery.trim() && allowCustomValue && !searchMatchesExisting && (
              <button
                type="button"
                onClick={handleCustomValueSubmit}
                className="w-full text-left px-2 py-1.5 mt-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
              >
                Use "{toTitleCase(searchQuery.trim())}"
              </button>
            )}
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500">
              Loading options...
            </div>
          ) : (
            <>
              {/* Options list */}
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800',
                    value === option && 'bg-gray-50 dark:bg-gray-800 font-medium'
                  )}
                >
                  {option}
                </button>
              ))}

              {/* Empty state */}
              {filteredOptions.length === 0 && !searchQuery.trim() && (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No options available
                </div>
              )}

              {filteredOptions.length === 0 && searchQuery.trim() && !allowCustomValue && (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No matching options
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
