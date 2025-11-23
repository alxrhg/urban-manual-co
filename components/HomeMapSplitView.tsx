'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, List, MapPin, X, ArrowLeft, Star, Clock, ExternalLink } from 'lucide-react';
import { useDestinationLoading } from '@/hooks/useDestinationLoading';
import { useRouter } from 'next/navigation';

const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100 mx-auto mb-2"></div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  )
});

interface HomeMapSplitViewProps {
  destinations: Destination[];
  selectedDestination?: Destination | null;
  onMarkerSelect?: (destination: Destination) => void;
  onListItemSelect?: (destination: Destination) => void;
  onCloseDetail?: () => void;
  isLoading?: boolean;
}

const DEFAULT_CENTER = { lat: 23.5, lng: 121.0 };
const LIST_ITEM_HEIGHT = 88; // Approximate height of each list item (76px + gap)
const MIN_ITEMS_PER_PAGE = 4; // Minimum items to show
const MAX_ITEMS_PER_PAGE = 6; // Maximum items to show

const formatCountLabel = (count: number) =>
  `${count} ${count === 1 ? 'place' : 'places'}`;

export default function HomeMapSplitView({
  destinations,
  selectedDestination,
  onMarkerSelect,
  onListItemSelect,
  onCloseDetail,
  isLoading = false,
}: HomeMapSplitViewProps) {
  const [isDesktopPanelCollapsed, setIsDesktopPanelCollapsed] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [listPage, setListPage] = useState(1);
  const { isDestinationLoading } = useDestinationLoading();
  const listContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(MIN_ITEMS_PER_PAGE);

  // Calculate dynamic items per page based on available height
  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (!listContainerRef.current) return;
      
      // Get the container's available height
      // Account for padding (py-4 = 16px top + 16px bottom = 32px total)
      const containerHeight = listContainerRef.current.clientHeight - 32;
      
      // Calculate how many items can fit
      const calculatedItems = Math.floor(containerHeight / LIST_ITEM_HEIGHT);
      
      // Clamp between min and max
      const clampedItems = Math.max(
        MIN_ITEMS_PER_PAGE,
        Math.min(MAX_ITEMS_PER_PAGE, calculatedItems)
      );
      
      setItemsPerPage(clampedItems);
    };

    // Calculate on mount and resize
    calculateItemsPerPage();
    window.addEventListener('resize', calculateItemsPerPage);
    
    // Also recalculate when panel visibility changes
    const observer = new ResizeObserver(() => {
      calculateItemsPerPage();
    });
    
    if (listContainerRef.current) {
      observer.observe(listContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', calculateItemsPerPage);
      observer.disconnect();
    };
  }, [isDesktopPanelCollapsed, isMobilePanelOpen]);

  // Reset page when destinations change or items per page changes
  useEffect(() => {
    setListPage(1);
  }, [destinations.length, itemsPerPage]);

  // Filter destinations with coordinates for map
  const destinationsWithCoords = useMemo(
    () =>
      destinations.filter(
        destination =>
          typeof destination.latitude === 'number' &&
          typeof destination.longitude === 'number'
      ),
    [destinations]
  );

  // Calculate map center and zoom to show all pins
  const mapCenter = useMemo(() => {
    if (!destinationsWithCoords.length) {
      return DEFAULT_CENTER;
    }

    const totals = destinationsWithCoords.reduce(
      (acc, destination) => {
        acc.lat += destination.latitude ?? 0;
        acc.lng += destination.longitude ?? 0;
        return acc;
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: totals.lat / destinationsWithCoords.length,
      lng: totals.lng / destinationsWithCoords.length,
    };
  }, [destinationsWithCoords]);

  const mapZoom = useMemo(() => {
    if (destinationsWithCoords.length <= 1) {
      return 13;
    }

    const lats = destinationsWithCoords.map(
      destination => destination.latitude ?? 0
    );
    const lngs = destinationsWithCoords.map(
      destination => destination.longitude ?? 0
    );
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    const maxRange = Math.max(latRange, lngRange);

    if (maxRange < 0.02) return 14;
    if (maxRange < 0.05) return 13;
    if (maxRange < 0.1) return 12;
    if (maxRange < 0.5) return 11;
    if (maxRange < 1.5) return 10;
    return 8;
  }, [destinationsWithCoords]);

  // Pagination for list - using dynamic items per page
  const totalListPages = Math.ceil(destinations.length / itemsPerPage);
  const startIndex = (listPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDestinations = destinations.slice(startIndex, endIndex);

  // Lazy loading: Set up intersection observer for visible items
  useEffect(() => {
    if (!listContainerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const slug = entry.target.getAttribute('data-slug');
          if (slug) {
            setVisibleItems((prev) => {
              const next = new Set(prev);
              if (entry.isIntersecting) {
                next.add(slug);
              } else {
                next.delete(slug);
              }
              return next;
            });
          }
        });
      },
      {
        root: listContainerRef.current,
        rootMargin: '50px', // Start loading slightly before item is visible
        threshold: 0.1,
      }
    );

    const items = listContainerRef.current.querySelectorAll('[data-slug]');
    items.forEach((item) => observerRef.current?.observe(item));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [paginatedDestinations]);

  const panelCountLabel = formatCountLabel(destinations.length);
  const pinnedCountLabel =
    destinationsWithCoords.length === destinations.length
      ? 'All mapped'
      : `${destinationsWithCoords.length} ${
          destinationsWithCoords.length === 1 ? 'pin' : 'pins'
        }`;

  const handlePreviousPage = useCallback(() => {
    setListPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setListPage((prev) => Math.min(totalListPages, prev + 1));
  }, [totalListPages]);

  if (!destinations.length && !isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          No destinations to map yet.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Adjust your filters or search to see map results.
        </p>
      </div>
    );
  }

  const renderListItem = (destination: Destination, index: number) => {
    const isSelected = selectedDestination?.slug === destination.slug;
    const isVisible = visibleItems.has(destination.slug) || index < 2; // Always load first 2 items
    const isLoading = isDestinationLoading(destination.slug);

    return (
      <div
        key={destination.slug}
        data-slug={destination.slug}
        className="transition-opacity duration-200"
        style={{ opacity: isVisible ? 1 : 0.3 }}
      >
        <button
          onClick={() => {
            onListItemSelect?.(destination);
          }}
          className={`w-full flex items-center gap-3 rounded-2xl border text-left transition-all duration-200 p-4 min-h-[76px] ${
            isSelected
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
              : 'bg-white/95 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/70'
          } ${isLoading ? 'opacity-50' : ''}`}
        >
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
            {destination.image && isVisible ? (
              <Image
                src={destination.image}
                alt={destination.name}
                fill
                sizes="56px"
                className="object-cover"
                loading={index < 2 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {destination.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {[destination.category, destination.city]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
        </button>
      </div>
    );
  };

  const router = useRouter();

  const renderDestinationDetail = () => {
    if (!selectedDestination) return null;

    const rating = selectedDestination.rating;
    const priceLevel = selectedDestination.price_level;

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Header with back button */}
        <div className="flex items-center gap-3 border-b border-gray-200/80 px-5 py-4 dark:border-gray-800/80 flex-shrink-0">
          <button
            onClick={() => onCloseDetail?.()}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
            aria-label="Back to list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">
            {selectedDestination.name}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Image */}
          {selectedDestination.image && (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image
                src={selectedDestination.image}
                alt={selectedDestination.name}
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-cover"
              />
            </div>
          )}

          {/* Rating and Price */}
          {(rating || priceLevel) && (
            <div className="flex items-center gap-3 flex-wrap">
              {rating && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
                </div>
              )}
              {priceLevel && priceLevel > 0 && (
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  {'$'.repeat(priceLevel)}
                </div>
              )}
            </div>
          )}

          {/* Category and City */}
          {(selectedDestination.category || selectedDestination.city) && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {[selectedDestination.category, selectedDestination.city]
                .filter(Boolean)
                .join(' • ')}
            </div>
          )}

          {/* Micro Description */}
          {selectedDestination.micro_description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {selectedDestination.micro_description}
            </p>
          )}

          {/* Description */}
          {selectedDestination.description && (
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-6">
                {selectedDestination.description.replace(/<[^>]*>/g, '')}
              </p>
            </div>
          )}

          {/* View Full Details Button */}
          <button
            onClick={() => {
              if (selectedDestination.slug) {
                router.push(`/destination/${selectedDestination.slug}`);
              }
            }}
            className="w-full px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
          >
            View Full Details
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderList = (variant: 'desktop' | 'mobile') => {
    const listItems = paginatedDestinations.map((destination, index) =>
      renderListItem(destination, startIndex + index)
    );

    return (
      <div className="relative h-full flex flex-col">
        {/* Fixed height scrollable list container */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          style={{ maxHeight: `${itemsPerPage * LIST_ITEM_HEIGHT}px` }}
        >
          {isLoading && destinations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100 mx-auto mb-2"></div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Loading destinations...</p>
              </div>
            </div>
          ) : (
            listItems
          )}
        </div>

        {/* Pagination controls - only show if more than one page */}
        {totalListPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-5 py-3 bg-white/95 dark:bg-gray-950/95">
            <button
              onClick={handlePreviousPage}
              disabled={listPage === 1}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {listPage} of {totalListPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={listPage === totalListPages}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative h-full w-full"
      role="region"
      aria-label="Homepage map view with destination list"
    >
      {/* Desktop List Panel */}
      <div
        className={`pointer-events-auto absolute left-0 top-0 hidden h-full w-[360px] flex-col overflow-hidden rounded-r-3xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-md transition-transform duration-300 dark:border-gray-800/80 dark:bg-gray-950/95 lg:flex ${
          isDesktopPanelCollapsed
            ? '-translate-x-full opacity-0'
            : 'translate-x-0 opacity-100'
        }`}
        style={{ zIndex: 10 }}
      >
        {selectedDestination ? (
          renderDestinationDetail()
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-gray-200/80 px-5 py-4 dark:border-gray-800/80 flex-shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400">
                  {panelCountLabel}
                </p>
                <p className="text-[0.7rem] text-gray-400 dark:text-gray-500">
                  {pinnedCountLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDesktopPanelCollapsed(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                aria-label="Hide list panel"
              >
                <ChevronLeft className="h-4 w-4" />
                Hide
              </button>
            </div>
            {renderList('desktop')}
          </>
        )}
      </div>

      {/* Show List Button (when collapsed) */}
      {isDesktopPanelCollapsed && destinations.length > 0 && (
        <button
          type="button"
          onClick={() => setIsDesktopPanelCollapsed(false)}
          className="absolute left-6 top-6 z-20 hidden items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2 text-xs font-semibold text-gray-700 shadow-lg transition-colors hover:bg-white dark:border-gray-800 dark:bg-gray-900/90 dark:text-gray-200 dark:hover:bg-gray-900 lg:flex"
        >
          <List className="h-4 w-4" />
          Show list
        </button>
      )}

      {/* Map View - Always visible, shows all pins immediately */}
      <div
        className={`absolute top-0 bottom-0 right-0 left-0 ${
          !isDesktopPanelCollapsed && destinations.length > 0
            ? 'lg:left-[360px]'
            : 'lg:left-0'
        }`}
      >
        <MapView
          destinations={destinationsWithCoords}
          onMarkerClick={destination => {
            onMarkerSelect?.(destination);
          }}
          center={mapCenter}
          zoom={mapZoom}
          selectedDestination={selectedDestination}
        />
      </div>

      {/* Mobile List Panel */}
      {isMobilePanelOpen && destinations.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 md:hidden">
          <div className="pointer-events-auto rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            {selectedDestination ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onCloseDetail?.()}
                      className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                      aria-label="Back to list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {selectedDestination.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobilePanelOpen(false)}
                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative h-[55vh] flex flex-col overflow-hidden">
                  {renderDestinationDetail()}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-400">
                      {panelCountLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMobilePanelOpen(false)}
                    className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    aria-label="Close list panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative h-[55vh] flex flex-col">
                  {renderList('mobile')}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile Show List Button */}
      {!isMobilePanelOpen && destinations.length > 0 && (
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(true)}
          className="md:hidden absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-5 py-3 text-xs font-semibold text-white shadow-xl dark:border-white dark:bg-white dark:text-gray-900"
        >
          <List className="h-4 w-4" />
          Show list ({destinations.length})
        </button>
      )}
    </div>
  );
}
