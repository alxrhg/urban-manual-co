'use client';

import { ReactNode, memo } from 'react';

// Generic type constraint
interface UniversalGridProps<T extends { id?: string | number; slug?: string }> {
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
 * Performance Optimization:
 * - Uses React.memo to prevent re-renders if props haven't changed
 * - Requires items to have stable IDs (id or slug) for keys
 * - Uses content-visibility: auto via CSS utility for off-screen rendering optimization
 */
function UniversalGridBase<T extends { id?: string | number; slug?: string }>({
  items,
  renderItem,
  className = '',
  gap = 'md',
  emptyState,
}: UniversalGridProps<T>) {
  const gapClasses = {
    sm: 'gap-4 md:gap-5',
    md: 'gap-5 md:gap-7 lg:gap-8',
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
      {items.map((item, index) => {
        // Use slug or id as key, fallback to index if absolutely necessary (but discourage it)
        const key = item.slug || item.id || index;
        return (
          <div key={key} className="contents">
            {renderItem(item, index)}
          </div>
        );
      })}
    </div>
  );
}

// Memoize the component to prevent re-renders when parent state changes but grid props don't
export const UniversalGrid = memo(UniversalGridBase) as typeof UniversalGridBase;
