'use client';

import { useCallback, memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useHomepageStore, usePagination, useDestinationSelection } from '@/lib/stores/homepage-store';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { DestinationCard } from '@/components/DestinationCard';
import { Destination } from '@/types/destination';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * DestinationGrid - Responsive grid with pagination and animations
 *
 * Features:
 * - Responsive column layout (2-4 columns)
 * - Pagination with keyboard navigation
 * - Staggered animation on load
 * - Touch swipe for mobile pagination
 * - Skeleton loading states
 * - Hover preview (optional)
 * - Infinite scroll option
 */

// ============================================================================
// Types
// ============================================================================

interface DestinationGridProps {
  destinations?: Destination[];
  isLoading?: boolean;
  showPagination?: boolean;
  infiniteScroll?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  visitedSlugs?: Set<string>;
}

// ============================================================================
// Grid Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200,
    },
  },
};

// ============================================================================
// Destination Grid Component
// ============================================================================

export const DestinationGrid = memo(function DestinationGrid({
  destinations: propDestinations,
  isLoading: propIsLoading,
  showPagination = true,
  infiniteScroll = false,
  onLoadMore,
  hasMore = false,
  className,
  visitedSlugs,
}: DestinationGridProps) {
  // Store state
  const storeDestinations = useHomepageStore((state) => state.filteredDestinations);
  const storeIsLoading = useHomepageStore((state) => state.isLoading || state.isSearching);
  const storeVisitedSlugs = useHomepageStore((state) => state.visitedSlugs);
  const getPagedDestinations = useHomepageStore((state) => state.getPagedDestinations);

  // Use props or store
  const destinations = propDestinations ?? getPagedDestinations();
  const allDestinations = propDestinations ?? storeDestinations;
  const isLoading = propIsLoading ?? storeIsLoading;
  const visited = visitedSlugs ?? storeVisitedSlugs;

  // Pagination
  const {
    currentPage,
    totalPages,
    itemsPerPage,
    totalItems,
    setPage,
    nextPage,
    prevPage,
  } = usePagination();

  // Selection
  const { selectDestination, hoverDestination } = useDestinationSelection();

  // Drawer
  const openDrawer = useDrawerStore((state) => state.open);

  // Refs for touch handling
  const gridRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Handle destination click
  const handleDestinationClick = useCallback((destination: Destination, index: number) => {
    selectDestination(destination);
    openDrawer('destination', {
      destination,
      place: destination,
      index,
    });
  }, [selectDestination, openDrawer]);

  // Handle hover
  const handleDestinationHover = useCallback((destination: Destination | null) => {
    hoverDestination(destination);
  }, [hoverDestination]);

  // Touch swipe for pagination
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !showPagination) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      const diff = touchStartX.current - touchEndX.current;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentPage < totalPages) {
          nextPage();
        } else if (diff < 0 && currentPage > 1) {
          prevPage();
        }
      }
    };

    grid.addEventListener('touchstart', handleTouchStart, { passive: true });
    grid.addEventListener('touchmove', handleTouchMove, { passive: true });
    grid.addEventListener('touchend', handleTouchEnd);

    return () => {
      grid.removeEventListener('touchstart', handleTouchStart);
      grid.removeEventListener('touchmove', handleTouchMove);
      grid.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentPage, totalPages, nextPage, prevPage, showPagination]);

  // Infinite scroll observer
  useEffect(() => {
    if (!infiniteScroll || !loadMoreRef.current || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [infiniteScroll, onLoadMore, hasMore, isLoading]);

  // Keyboard navigation
  useEffect(() => {
    if (!showPagination) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentPage > 1) {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        e.preventDefault();
        nextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, nextPage, prevPage, showPagination]);

  // Loading state
  if (isLoading && destinations.length === 0) {
    return <GridSkeleton count={itemsPerPage} className={className} />;
  }

  // Empty state
  if (!isLoading && destinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 mb-4 text-gray-200 dark:text-gray-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No destinations found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Try adjusting your filters or search terms to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} data-component="DestinationGrid">
      {/* Grid */}
      <motion.div
        ref={gridRef}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={currentPage} // Re-animate on page change
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        <AnimatePresence mode="popLayout">
          {destinations.map((destination, index) => (
            <motion.div
              key={destination.slug || destination.id || index}
              variants={itemVariants}
              layout
              layoutId={destination.slug}
            >
              <DestinationCard
                destination={destination}
                index={index}
                isVisited={visited.has(destination.slug)}
                onClick={() => handleDestinationClick(destination, index)}
                onAddToTrip={() => {
                  openDrawer('quick-trip-selector', {
                    destinationSlug: destination.slug,
                    destinationName: destination.name,
                    destinationCity: destination.city,
                  });
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
          onPrev={prevPage}
          onNext={nextPage}
        />
      )}

      {/* Infinite scroll trigger */}
      {infiniteScroll && (
        <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
          {isLoading && (
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Pagination Controls
// ============================================================================

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    // Pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Page info */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Showing page {currentPage} of {totalPages} ({totalItems.toLocaleString()} results)
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="w-8 h-8 flex items-center justify-center text-gray-400"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  'h-8 w-8 p-0 text-xs',
                  currentPage === page && 'bg-black dark:bg-white text-white dark:text-black'
                )}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Grid Skeleton
// ============================================================================

interface GridSkeletonProps {
  count?: number;
  className?: string;
}

function GridSkeleton({ count = 12, className }: GridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col animate-pulse">
          <div className="aspect-video rounded-2xl bg-gray-200 dark:bg-gray-800 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default DestinationGrid;
