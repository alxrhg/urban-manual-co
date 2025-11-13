'use client';

import * as React from 'react';
import clsx from 'clsx';

export type FilterChipTone =
  | 'default'
  | 'neutral'
  | 'blue'
  | 'green'
  | 'orange'
  | 'yellow'
  | 'gray';

const toneClasses: Record<FilterChipTone, string> = {
  default:
    'bg-white/80 text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-900/60 dark:text-gray-200 dark:border-gray-700 dark:hover:border-gray-600',
  neutral:
    'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300 dark:bg-gray-800/70 dark:text-gray-200 dark:border-gray-700 dark:hover:border-gray-600',
  blue:
    'bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
  green:
    'bg-green-50 text-green-700 border-green-100 hover:border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
  orange:
    'bg-orange-50 text-orange-700 border-orange-100 hover:border-orange-200 dark:bg-orange-900/20 dark:text-orange-200 dark:border-orange-800',
  yellow:
    'bg-yellow-50 text-yellow-700 border-yellow-100 hover:border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800',
  gray:
    'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
};

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  selected?: boolean;
  leadingVisual?: React.ReactNode;
  trailingVisual?: React.ReactNode;
  tone?: FilterChipTone;
}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({
    label,
    selected = false,
    leadingVisual,
    trailingVisual,
    tone = 'default',
    className,
    ...rest
  }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 dark:focus-visible:ring-white',
          selected
            ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/10 dark:bg-white dark:text-gray-900 dark:border-white dark:shadow-white/10'
            : toneClasses[tone],
          className,
        )}
        aria-pressed={selected}
        {...rest}
      >
        {leadingVisual ? (
          <span className="flex items-center text-current" aria-hidden="true">
            {leadingVisual}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
        {trailingVisual ? (
          <span className="flex items-center text-current" aria-hidden="true">
            {trailingVisual}
          </span>
        ) : null}
      </button>
    );
  }
);
FilterChip.displayName = 'FilterChip';

export interface ChipGroupProps {
  children?: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  loading?: boolean;
  skeletonCount?: number;
  ariaLabel?: string;
}

export function ChipGroup({
  children,
  className,
  scrollable = false,
  loading = false,
  skeletonCount = 6,
  ariaLabel,
}: ChipGroupProps) {
  return (
    <div
      className={clsx(
        'flex flex-wrap gap-2',
        scrollable && 'overflow-x-auto pb-2 -mx-2 px-2 md:px-0',
        className,
      )}
      aria-label={ariaLabel}
    >
      {loading
        ? Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={index}
              className="h-8 min-w-[72px] rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse"
            />
          ))
        : children}
    </div>
  );
}
