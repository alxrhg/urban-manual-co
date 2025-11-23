'use client';

import { ReactNode, memo } from 'react';

interface UniversalGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  emptyState?: ReactNode;
}

/**
 * Universal Grid Component
 * 
 * A reusable grid component that provides consistent grid layout
 * across all pages (homepage, cities, categories, etc.)
 * 
 * Grid breakpoints:
 * - Mobile: 2 columns
 * - sm: 3 columns
 * - md: 4 columns
 * - lg: 5 columns
 * - xl: 6 columns
 * - 2xl: 7 columns
 * 
 * Memoized to prevent unnecessary re-renders when items haven't changed
 */
export const UniversalGrid = memo(function UniversalGrid<T>({
  items,
  renderItem,
  className = '',
  gap = 'md',
  emptyState,
}: UniversalGridProps<T>) {
  const gapClasses = {
    sm: 'gap-4 md:gap-5',
    md: 'gap-x-8 gap-y-10',
    lg: 'gap-6 md:gap-8 lg:gap-10',
  };

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 ${gapClasses[gap]} items-start ${className}`}
    >
      {items.map((item, index) => renderItem(item, index))}
    </div>
  );
}) as <T>(props: UniversalGridProps<T>) => ReactNode;

