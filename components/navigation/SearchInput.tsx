/**
 * Search Input Component
 *
 * Extracted from NavigationRow for better modularity.
 * Provides a reusable search input with clear button.
 */

'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional class names */
  className?: string;
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to auto-focus the input */
  autoFocus?: boolean;
  /** ID for the input (for labels) */
  id?: string;
}

const sizeClasses = {
  sm: 'py-1.5 pl-8 pr-8 text-xs',
  md: 'py-2.5 pl-10 pr-10 text-sm',
  lg: 'py-3 pl-12 pr-12 text-base',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

const iconPositions = {
  sm: 'left-3',
  md: 'left-4',
  lg: 'left-4',
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  size = 'md',
  autoFocus = false,
  id,
}: SearchInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClear = React.useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <Search
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500',
          iconSizes[size],
          iconPositions[size]
        )}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search destinations"
        className={cn(
          'w-full border border-gray-200 dark:border-gray-800 rounded-2xl',
          'bg-white dark:bg-gray-950 text-gray-900 dark:text-white',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white',
          'focus:border-transparent transition-all',
          sizeClasses[size]
        )}
      />
      {value && (
        <button
          onClick={handleClear}
          className={cn(
            'absolute right-4 top-1/2 -translate-y-1/2',
            'text-gray-400 dark:text-gray-500',
            'hover:text-gray-900 dark:hover:text-white transition-colors'
          )}
          aria-label="Clear search"
          type="button"
        >
          <X className={iconSizes[size]} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
