'use client';

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  children: ReactNode;
  /** Gap between items in pixels */
  gap?: number;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show scroll indicators */
  showIndicators?: boolean;
  /** Auto-scroll interval in ms (0 to disable) */
  autoScroll?: number;
  /** Pause auto-scroll on hover */
  pauseOnHover?: boolean;
  /** Additional classes for the container */
  className?: string;
  /** Additional classes for the scroll container */
  scrollClassName?: string;
  /** Number of items to scroll per click */
  scrollCount?: number;
}

/**
 * Horizontal carousel with smooth scrolling
 * Supports touch swipe, arrow navigation, and keyboard control
 */
export function Carousel({
  children,
  gap = 16,
  showArrows = true,
  showIndicators = false,
  autoScroll = 0,
  pauseOnHover = true,
  className = '',
  scrollClassName = '',
  scrollCount = 1,
}: CarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Check scroll state
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  // Initial and resize check
  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState]);

  // Auto-scroll
  useEffect(() => {
    if (!autoScroll || isPaused) return;

    const interval = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      if (canScrollRight) {
        scrollBy(1);
      } else {
        // Reset to start
        container.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }, autoScroll);

    return () => clearInterval(interval);
  }, [autoScroll, isPaused, canScrollRight]);

  // Scroll by number of items
  const scrollBy = useCallback((direction: -1 | 1) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Calculate item width from first child
    const firstChild = container.firstElementChild as HTMLElement;
    if (!firstChild) return;

    const itemWidth = firstChild.offsetWidth + gap;
    const scrollAmount = itemWidth * scrollCount * direction;

    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth',
    });
  }, [gap, scrollCount]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && canScrollLeft) {
      e.preventDefault();
      scrollBy(-1);
    } else if (e.key === 'ArrowRight' && canScrollRight) {
      e.preventDefault();
      scrollBy(1);
    }
  }, [canScrollLeft, canScrollRight, scrollBy]);

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Carousel"
    >
      {/* Navigation Arrows */}
      {showArrows && (
        <>
          {/* Left Arrow */}
          <button
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            className={`
              absolute left-0 top-1/2 -translate-y-1/2 z-10
              w-10 h-10 md:w-12 md:h-12
              flex items-center justify-center
              bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
              border border-gray-200 dark:border-gray-700
              rounded-full shadow-lg
              text-gray-700 dark:text-gray-300
              transition-all duration-200
              hover:bg-white dark:hover:bg-gray-900
              hover:scale-105
              disabled:opacity-0 disabled:pointer-events-none
              opacity-0 group-hover:opacity-100
              -translate-x-4 md:-translate-x-6
              focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white
            `}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            className={`
              absolute right-0 top-1/2 -translate-y-1/2 z-10
              w-10 h-10 md:w-12 md:h-12
              flex items-center justify-center
              bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
              border border-gray-200 dark:border-gray-700
              rounded-full shadow-lg
              text-gray-700 dark:text-gray-300
              transition-all duration-200
              hover:bg-white dark:hover:bg-gray-900
              hover:scale-105
              disabled:opacity-0 disabled:pointer-events-none
              opacity-0 group-hover:opacity-100
              translate-x-4 md:translate-x-6
              focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white
            `}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollState}
        className={`
          flex overflow-x-auto scroll-smooth
          scrollbar-hide
          snap-x snap-mandatory
          -mx-4 px-4 md:-mx-6 md:px-6
          ${scrollClassName}
        `}
        style={{ gap: `${gap}px` }}
        tabIndex={0}
      >
        {children}
      </div>

      {/* Gradient Overlays for scroll indication */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-16 bg-gradient-to-r from-white dark:from-gray-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-16 bg-gradient-to-l from-white dark:from-gray-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
}

/**
 * Carousel item wrapper with consistent snap behavior
 */
export function CarouselItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-shrink-0 snap-start ${className}`}>
      {children}
    </div>
  );
}
