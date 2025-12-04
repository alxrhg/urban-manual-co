"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Destination } from "@/types/destination";
import { DestinationCard } from "@/components/DestinationCard";
import { DestinationGridSkeleton } from "@/components/skeletons/DestinationCardSkeleton";
import { useItemsPerPage } from "@/hooks/useGridColumns";

// Minimal destination type for grid display
type MinimalDestination = Pick<
  Destination,
  | "id"
  | "slug"
  | "name"
  | "city"
  | "country"
  | "category"
  | "image"
  | "image_thumbnail"
  | "michelin_stars"
  | "crown"
  | "rating"
  | "price_level"
  | "micro_description"
>;

export interface DestinationGridProps {
  destinations: MinimalDestination[];
  visitedSlugs: Set<string>;
  isLoading?: boolean;
  onDestinationClick: (destination: MinimalDestination, index: number) => void;
  // Virtualization options
  virtualizeThreshold?: number;
  overscan?: number;
}

// Virtualized row component
interface VirtualizedRowProps {
  destinations: MinimalDestination[];
  startIndex: number;
  visitedSlugs: Set<string>;
  onDestinationClick: (destination: MinimalDestination, index: number) => void;
  isVisible: boolean;
  rowHeight: number;
}

function VirtualizedRow({
  destinations,
  startIndex,
  visitedSlugs,
  onDestinationClick,
  isVisible,
  rowHeight,
}: VirtualizedRowProps) {
  if (!isVisible) {
    // Placeholder for non-visible rows to maintain scroll position
    return <div style={{ height: rowHeight }} className="w-full" />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {destinations.map((destination, idx) => {
        const globalIndex = startIndex + idx;
        return (
          <DestinationCard
            key={destination.slug}
            destination={destination}
            index={globalIndex}
            isVisited={visitedSlugs.has(destination.slug)}
            onClick={() => onDestinationClick(destination, globalIndex)}
          />
        );
      })}
    </div>
  );
}

export function DestinationGrid({
  destinations,
  visitedSlugs,
  isLoading = false,
  onDestinationClick,
  virtualizeThreshold = 50,
  overscan = 2,
}: DestinationGridProps) {
  const itemsPerPage = useItemsPerPage(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const [currentPage, setCurrentPage] = useState(1);
  const ROW_HEIGHT = 350; // Approximate height per row in pixels

  // Use virtualization only when we have many items
  const shouldVirtualize = destinations.length > virtualizeThreshold;

  // Calculate number of columns based on screen width
  const getColumnsCount = useCallback(() => {
    if (typeof window === "undefined") return 7;
    const width = window.innerWidth;
    if (width < 640) return 2;
    if (width < 768) return 3;
    if (width < 1024) return 4;
    if (width < 1280) return 5;
    if (width < 1536) return 6;
    return 7;
  }, []);

  // Split destinations into rows for virtualization
  const rows = useMemo(() => {
    if (!shouldVirtualize) return [];
    const cols = getColumnsCount();
    const result: { items: MinimalDestination[]; startIndex: number }[] = [];
    for (let i = 0; i < destinations.length; i += cols) {
      result.push({
        items: destinations.slice(i, i + cols),
        startIndex: i,
      });
    }
    return result;
  }, [destinations, shouldVirtualize, getColumnsCount]);

  // Intersection Observer for virtualization
  useEffect(() => {
    if (!shouldVirtualize || !containerRef.current) return;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const scrollTop = window.scrollY - container.offsetTop;
      const viewportHeight = window.innerHeight;

      const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - overscan);
      const endRow = Math.min(
        rows.length,
        Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + overscan
      );

      setVisibleRange({ start: startRow, end: endRow });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [shouldVirtualize, rows.length, overscan]);

  // Loading state
  if (isLoading) {
    return <DestinationGridSkeleton count={20} />;
  }

  // Empty state
  if (destinations.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No destinations found.
        </p>
      </div>
    );
  }

  // Virtualized rendering for large lists
  if (shouldVirtualize) {
    return (
      <div ref={containerRef}>
        <div
          style={{ height: rows.length * ROW_HEIGHT }}
          className="relative"
        >
          {rows.map((row, rowIndex) => {
            const isVisible =
              rowIndex >= visibleRange.start && rowIndex <= visibleRange.end;
            return (
              <div
                key={row.startIndex}
                style={{
                  position: "absolute",
                  top: rowIndex * ROW_HEIGHT,
                  left: 0,
                  right: 0,
                }}
              >
                <VirtualizedRow
                  destinations={row.items}
                  startIndex={row.startIndex}
                  visitedSlugs={visitedSlugs}
                  onDestinationClick={onDestinationClick}
                  isVisible={isVisible}
                  rowHeight={ROW_HEIGHT}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Non-virtualized rendering with pagination for smaller lists
  const totalPages = Math.ceil(destinations.length / itemsPerPage);
  const paginatedDestinations = destinations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
        {paginatedDestinations.map((destination, index) => {
          const globalIndex = (currentPage - 1) * itemsPerPage + index;
          return (
            <DestinationCard
              key={destination.slug}
              destination={destination}
              index={globalIndex}
              isVisited={visitedSlugs.has(destination.slug)}
              onClick={() => onDestinationClick(destination, globalIndex)}
            />
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

// Export minimal destination type for use in parent components
export type { MinimalDestination };
