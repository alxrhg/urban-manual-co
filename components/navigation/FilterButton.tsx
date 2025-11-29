/**
 * Filter Button Component
 *
 * Extracted from NavigationRow for better modularity.
 * Provides a button to toggle filters panel with active count badge.
 */

'use client';

import * as React from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterButtonProps {
  /** Number of active filters */
  activeCount?: number;
  /** Whether filters panel is open */
  isOpen: boolean;
  /** Toggle filters panel */
  onToggle: () => void;
  /** Label text */
  label?: string;
  /** Additional class names */
  className?: string;
}

export function FilterButton({
  activeCount = 0,
  isOpen,
  onToggle,
  label = 'Filters',
  className,
}: FilterButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5',
        'bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800',
        'rounded-full text-sm font-medium text-gray-900 dark:text-white',
        'hover:border-gray-300 dark:hover:border-gray-700',
        'transition-all duration-180',
        className
      )}
      aria-label={isOpen ? 'Close filters' : 'Open filters'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      <SlidersHorizontal
        className="w-4 h-4 text-gray-500 dark:text-gray-400"
        strokeWidth={1.5}
      />
      <span>{label}</span>
      {activeCount > 0 && (
        <span
          className={cn(
            'flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs',
            'bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full'
          )}
          aria-label={`${activeCount} active filters`}
        >
          {activeCount}
        </span>
      )}
      <ChevronDown
        className={cn(
          'w-4 h-4 text-gray-500 dark:text-gray-400',
          'transition-transform duration-[220ms] ease-out',
          isOpen && 'rotate-180'
        )}
        strokeWidth={1.5}
      />
    </button>
  );
}
