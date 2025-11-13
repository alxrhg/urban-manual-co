'use client';

import * as React from 'react';
import clsx from 'clsx';

const columnPrefixes: Record<string, string> = {
  base: '',
  sm: 'sm:',
  md: 'md:',
  lg: 'lg:',
  xl: 'xl:',
  '2xl': '2xl:',
};

export type GridBreakpoint = keyof typeof columnPrefixes;

const defaultColumns: Record<GridBreakpoint, number> = {
  base: 2,
  sm: 3,
  md: 4,
  lg: 5,
  xl: 6,
  '2xl': 7,
};

function buildColumnClasses(columns?: Partial<Record<GridBreakpoint, number>>) {
  const merged = { ...defaultColumns, ...columns };
  return Object.entries(merged)
    .map(([breakpoint, value]) => `${columnPrefixes[breakpoint]}grid-cols-${value}`)
    .join(' ');
}

export interface ResultsGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => React.Key;
  columns?: Partial<Record<GridBreakpoint, number>>;
  gapClassName?: string;
  isLoading?: boolean;
  skeletonCount?: number;
  renderSkeleton?: (index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export function ResultsGrid<T>({
  items,
  renderItem,
  keyExtractor,
  columns,
  gapClassName = 'gap-4 md:gap-6 lg:gap-8',
  isLoading = false,
  skeletonCount = 8,
  renderSkeleton,
  emptyState = null,
  className,
}: ResultsGridProps<T>) {
  if (isLoading) {
    return (
      <div className={clsx('grid', gapClassName, buildColumnClasses(columns), className)}>
        {Array.from({ length: skeletonCount }).map((_, index) =>
          renderSkeleton ? (
            <React.Fragment key={index}>{renderSkeleton(index)}</React.Fragment>
          ) : (
            <div
              key={index}
              className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"
            />
          )
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return emptyState;
  }

  return (
    <div className={clsx('grid items-start', gapClassName, buildColumnClasses(columns), className)}>
      {items.map((item, index) => (
        <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
}
