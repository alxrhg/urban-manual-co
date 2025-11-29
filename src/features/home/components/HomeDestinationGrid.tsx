"use client";

import React, { useRef, useCallback, useMemo } from "react";
import { Destination } from "@/types/destination";
import { DestinationCard } from "@/components/DestinationCard";
import { UniversalGrid } from "@/components/UniversalGrid";
import { useItemsPerPage } from "@/hooks/useGridColumns";

interface HomeDestinationGridProps {
  destinations: Destination[];
  currentPage: number;
  onPageChange: (page: number) => void;
  visitedSlugs: Set<string>;
  isLoading: boolean;
  loadingText?: string;
  onDestinationClick: (destination: Destination, index: number) => void;
  user: { id: string } | null;
}

export function HomeDestinationGrid({
  destinations,
  currentPage,
  onPageChange,
  visitedSlugs,
  isLoading,
  loadingText = "Loading destinations...",
  onDestinationClick,
  user,
}: HomeDestinationGridProps) {
  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows
  const totalPages = Math.ceil(destinations.length / itemsPerPage);

  const gridSwipeState = useRef<{
    startX: number;
    startY: number;
    isActive: boolean;
    isHorizontal: boolean;
  }>({
    startX: 0,
    startY: 0,
    isActive: false,
    isHorizontal: false,
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDestinations = useMemo(
    () => destinations.slice(startIndex, endIndex),
    [destinations, startIndex, endIndex]
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (totalPages <= 1) return;
      const touch = event.touches[0];
      gridSwipeState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        isActive: true,
        isHorizontal: false,
      };
    },
    [totalPages]
  );

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const state = gridSwipeState.current;
    if (!state.isActive) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    if (!state.isHorizontal) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > 10 && absDeltaX > absDeltaY) {
        state.isHorizontal = true;
      } else if (absDeltaY > 10 && absDeltaY > absDeltaX) {
        state.isActive = false;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const state = gridSwipeState.current;
      if (!state.isActive) return;

      state.isActive = false;
      if (!state.isHorizontal || totalPages <= 1) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - state.startX;
      const threshold = 50;

      if (Math.abs(deltaX) < threshold) return;

      if (deltaX < 0) {
        onPageChange(Math.min(totalPages, currentPage + 1));
      } else {
        onPageChange(Math.max(1, currentPage - 1));
      }
    },
    [totalPages, currentPage, onPageChange]
  );

  // Loading state
  if (isLoading && destinations.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100 mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{loadingText}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (destinations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading destinations...
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative w-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <UniversalGrid
          items={paginatedDestinations}
          renderItem={(destination, index) => {
            const isVisited = !!(user && visitedSlugs.has(destination.slug));
            const globalIndex = startIndex + index;

            return (
              <DestinationCard
                key={destination.slug}
                destination={destination}
                onClick={() => onDestinationClick(destination, globalIndex)}
                index={globalIndex}
                isVisited={isVisited}
                showBadges={true}
              />
            );
          }}
          emptyState={
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                No destinations found
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Try adjusting your filters or search terms
              </p>
            </div>
          }
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}

// Pagination component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      if (totalPages <= 5) return i + 1;
      if (currentPage <= 3) return i + 1;
      if (currentPage >= totalPages - 2) return totalPages - 4 + i;
      return currentPage - 2 + i;
    });
  }, [currentPage, totalPages]);

  return (
    <div className="mt-12 w-full flex flex-wrap items-center justify-center gap-2 mx-auto">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        {pageNumbers.map((pageNum) => {
          const isActive = currentPage === pageNum;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                isActive
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
              aria-label={`Page ${pageNum}`}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

export default HomeDestinationGrid;
