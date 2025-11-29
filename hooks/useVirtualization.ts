/**
 * Virtualization Hook
 *
 * Provides efficient rendering for large lists by only rendering
 * items that are visible in the viewport.
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface UseVirtualizationOptions<T> {
  /** Full list of items */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Number of items to render above/below viewport */
  overscan?: number;
  /** Container height (can be dynamic) */
  containerHeight?: number;
  /** Get unique key for an item */
  getKey?: (item: T, index: number) => string | number;
}

interface VirtualItem<T> {
  /** The actual item data */
  item: T;
  /** Index in the original array */
  index: number;
  /** Top offset in pixels */
  offsetTop: number;
  /** Unique key for React */
  key: string | number;
}

interface UseVirtualizationResult<T> {
  /** Items to render */
  virtualItems: VirtualItem<T>[];
  /** Total height of all items */
  totalHeight: number;
  /** Ref to attach to the scroll container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Current scroll position */
  scrollTop: number;
  /** Scroll to a specific index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** Whether currently scrolling */
  isScrolling: boolean;
  /** Range of visible indices */
  visibleRange: { start: number; end: number };
}

/**
 * Hook for virtualizing large lists
 *
 * @example
 * ```tsx
 * const { virtualItems, totalHeight, containerRef } = useVirtualization({
 *   items: destinations,
 *   itemHeight: 120,
 *   overscan: 5,
 * });
 *
 * return (
 *   <div ref={containerRef} style={{ height: 600, overflow: 'auto' }}>
 *     <div style={{ height: totalHeight, position: 'relative' }}>
 *       {virtualItems.map(({ item, key, offsetTop }) => (
 *         <div key={key} style={{ position: 'absolute', top: offsetTop }}>
 *           <DestinationCard destination={item} />
 *         </div>
 *       ))}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useVirtualization<T>(
  options: UseVirtualizationOptions<T>
): UseVirtualizationResult<T> {
  const {
    items,
    itemHeight,
    overscan = 3,
    containerHeight: initialHeight,
    getKey = (_, index) => index,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialHeight ?? 0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate total height
  const totalHeight = items.length * itemHeight;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(
      items.length - 1,
      start + visibleCount + overscan * 2
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Generate virtual items
  const virtualItems = useMemo(() => {
    const result: VirtualItem<T>[] = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (items[i] !== undefined) {
        result.push({
          item: items[i],
          index: i,
          offsetTop: i * itemHeight,
          key: getKey(items[i], i),
        });
      }
    }
    return result;
  }, [items, visibleRange, itemHeight, getKey]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set timeout to detect scroll end
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const container = containerRef.current;
      if (!container) return;

      const targetTop = index * itemHeight;
      container.scrollTo({ top: targetTop, behavior });
    },
    [itemHeight]
  );

  return {
    virtualItems,
    totalHeight,
    containerRef,
    scrollTop,
    scrollToIndex,
    isScrolling,
    visibleRange,
  };
}

/**
 * Hook for virtualizing a grid layout
 */
interface UseVirtualGridOptions<T> extends Omit<UseVirtualizationOptions<T>, 'itemHeight'> {
  /** Height of each row in pixels */
  rowHeight: number;
  /** Number of columns */
  columnCount: number;
}

interface VirtualGridItem<T> extends VirtualItem<T> {
  /** Column index */
  columnIndex: number;
  /** Row index */
  rowIndex: number;
  /** Left offset in pixels (percentage-based) */
  columnOffset: string;
}

interface UseVirtualGridResult<T> extends Omit<UseVirtualizationResult<T>, 'virtualItems'> {
  virtualItems: VirtualGridItem<T>[];
}

export function useVirtualGrid<T>(
  options: UseVirtualGridOptions<T>
): UseVirtualGridResult<T> {
  const { items, rowHeight, columnCount, overscan = 2, getKey } = options;

  // Calculate rows
  const rowCount = Math.ceil(items.length / columnCount);

  // Use base virtualization for rows
  const base = useVirtualization({
    items: Array.from({ length: rowCount }, (_, i) => i),
    itemHeight: rowHeight,
    overscan,
    getKey: (_, i) => i,
  });

  // Map virtual rows to grid items
  const virtualItems = useMemo(() => {
    const result: VirtualGridItem<T>[] = [];

    for (const virtualRow of base.virtualItems) {
      const rowIndex = virtualRow.index;
      for (let col = 0; col < columnCount; col++) {
        const itemIndex = rowIndex * columnCount + col;
        if (itemIndex < items.length) {
          result.push({
            item: items[itemIndex],
            index: itemIndex,
            offsetTop: virtualRow.offsetTop,
            key: getKey ? getKey(items[itemIndex], itemIndex) : itemIndex,
            columnIndex: col,
            rowIndex,
            columnOffset: `${(col / columnCount) * 100}%`,
          });
        }
      }
    }

    return result;
  }, [base.virtualItems, items, columnCount, getKey]);

  return {
    ...base,
    totalHeight: rowCount * rowHeight,
    virtualItems,
  };
}
