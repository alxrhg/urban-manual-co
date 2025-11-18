'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Destination } from '@/types/destination';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight, List, MapPin, X } from 'lucide-react';
import { getDestinationImageUrl } from '@/lib/destination-images';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

interface HomeMapSplitViewProps {
  destinations: Destination[];
  selectedDestination?: Destination | null;
  onMarkerSelect?: (destination: Destination) => void;
  onListItemSelect?: (destination: Destination) => void;
}

const DEFAULT_CENTER = { lat: 23.5, lng: 121.0 };

const formatCountLabel = (count: number) =>
  `${count} ${count === 1 ? 'place' : 'places'}`;

export default function HomeMapSplitView({
  destinations,
  selectedDestination,
  onMarkerSelect,
  onListItemSelect,
}: HomeMapSplitViewProps) {
  const [isDesktopPanelCollapsed, setIsDesktopPanelCollapsed] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const destinationsWithCoords = useMemo(
    () =>
      destinations.filter(
        destination =>
          typeof destination.latitude === 'number' &&
          typeof destination.longitude === 'number'
      ),
    [destinations]
  );

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

  const panelCountLabel = formatCountLabel(destinations.length);
  const pinnedCountLabel =
    destinationsWithCoords.length === destinations.length
      ? 'All mapped'
      : `${destinationsWithCoords.length} ${
          destinationsWithCoords.length === 1 ? 'pin' : 'pins'
        }`;

  if (!destinations.length) {
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

  const renderList = (variant: 'desktop' | 'mobile') => (
    <div className="space-y-3">
      {destinations.map(destination => {
        const isSelected = selectedDestination?.slug === destination.slug;
        const displayImage = getDestinationImageUrl(destination);
        return (
          <button
            key={destination.slug}
            onClick={() => {
              onListItemSelect?.(destination);
              if (variant === 'mobile') {
                setIsMobilePanelOpen(false);
              }
            }}
            className={`w-full flex items-center gap-3 rounded-2xl border text-left transition-all duration-200 ${
              variant === 'desktop' ? 'p-4' : 'p-4 min-h-[76px]'
            } ${
              isSelected
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                : 'bg-white/95 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/70'
            }`}
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt={destination.name}
                  fill
                  sizes="56px"
                  className="object-cover"
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
        );
      })}
    </div>
  );

  return (
    <div
      className="relative h-full w-full"
      role="region"
      aria-label="Homepage map view with destination list"
    >
      <div
        className={`pointer-events-auto absolute left-0 top-0 hidden h-full w-[360px] flex-col overflow-hidden rounded-r-3xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-md transition-transform duration-300 dark:border-gray-800/80 dark:bg-gray-950/95 lg:flex ${
          isDesktopPanelCollapsed
            ? '-translate-x-full opacity-0'
            : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200/80 px-5 py-4 dark:border-gray-800/80">
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
        <div className="flex-1 overflow-y-auto px-5 py-4">{renderList('desktop')}</div>
      </div>

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
        />
      </div>

      {isMobilePanelOpen && destinations.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 md:hidden">
          <div className="pointer-events-auto rounded-t-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
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
            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              {renderList('mobile')}
            </div>
          </div>
        </div>
      )}

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
