'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** Threshold at which to trigger (0-1, default: 0.1) */
  threshold?: number | number[];
  /** Root margin for earlier/later triggering (default: '0px 0px -50px 0px') */
  rootMargin?: string;
  /** Whether to only trigger once (default: true) */
  triggerOnce?: boolean;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: React.RefObject<HTMLElement | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook to observe element intersection with viewport
 * Used for fade-in-view and lazy loading animations
 *
 * @example
 * const { ref, isIntersecting } = useIntersectionObserver();
 * return <div ref={ref} className={cn('fade-in-view', isIntersecting && 'in-view')}>...</div>
 */
export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  triggerOnce = true,
  enabled = true,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn {
  const ref = useRef<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!enabled || !element || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // If already intersected and triggerOnce is true, don't observe again
    if (triggerOnce && isIntersecting) {
      return;
    }

    const observer = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry);
        setIsIntersecting(observerEntry.isIntersecting);

        // Unobserve if triggerOnce and element is now visible
        if (triggerOnce && observerEntry.isIntersecting) {
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, enabled, isIntersecting]);

  return { ref, isIntersecting, entry };
}

/**
 * Hook for multiple elements with staggered reveal
 * Useful for grids and lists of items
 */
export function useStaggeredIntersection(
  itemCount: number,
  options: UseIntersectionObserverOptions = {}
) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const setItemRef = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: show all items immediately
      setVisibleItems(new Set(Array.from({ length: itemCount }, (_, i) => i)));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Array.from(itemRefs.current.entries()).find(
            ([, el]) => el === entry.target
          )?.[0];

          if (index !== undefined && entry.isIntersecting) {
            setVisibleItems((prev) => new Set([...prev, index]));
            if (options.triggerOnce !== false) {
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? '0px 0px -50px 0px',
      }
    );

    itemRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [itemCount, options.threshold, options.rootMargin, options.triggerOnce]);

  const isVisible = useCallback(
    (index: number) => visibleItems.has(index),
    [visibleItems]
  );

  return { setItemRef, isVisible, visibleItems };
}

export default useIntersectionObserver;
