'use client';

import { ReactNode, memo, useMemo } from 'react';

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
 * - Mobile: paginated swipe (full-width pages, 2-column grid)
 * - sm: 3 columns
 * - md: 4 columns
 * - lg: 5 columns
 * - xl: 6 columns
 * - 2xl: 7 columns
 * 
 * Memoized to prevent unnecessary re-renders when items haven't changed
 */
const MOBILE_PAGE_SIZE = 4;

export const UniversalGrid = memo(function UniversalGrid<T>({
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

  const mobilePages = useMemo(() => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += MOBILE_PAGE_SIZE) {
      chunks.push(items.slice(i, i + MOBILE_PAGE_SIZE));
    }
    return chunks.length ? chunks : [items];
  }, [items]);

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex snap-x snap-mandatory overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch] sm:hidden">
        {mobilePages.map((pageItems, pageIndex) => (
          <div
            key={`mobile-page-${pageIndex}`}
            className="w-full shrink-0 snap-center px-1"
          >
            <div className={`grid grid-cols-2 ${gapClasses[gap]} items-start ${className}`}>
              {pageItems.map((item, itemIndex) =>
                renderItem(item, pageIndex * MOBILE_PAGE_SIZE + itemIndex),
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`hidden sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 ${gapClasses[gap]} items-start ${className}`}
      >
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
}) as <T>(props: UniversalGridProps<T>) => ReactNode;

