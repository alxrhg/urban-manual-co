'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { Destination } from '@/types/destination';
import TimelineLinkedMap from './TimelineLinkedMap';
import { useMapViewportSync } from '@/lib/hooks/useMapViewportSync';

interface TripMapHeaderProps {
  days: TripDay[];
  selectedDayNumber: number;
  tripDestination?: string;
  onMarkerClick?: (item: EnrichedItineraryItem) => void;
  onAddPlace?: (place: Partial<Destination>, dayNumber: number) => void;
  className?: string;
}

// Map collapse states for mobile
type MapCollapseState = 'collapsed' | 'default' | 'expanded';

const MAP_HEIGHTS: Record<MapCollapseState, string> = {
  collapsed: '80px',
  default: '200px',
  expanded: '50vh',
};

/**
 * TripMapHeader - A map header that shows above trip content
 *
 * Features:
 * - Static by default, tap to enable interactive mode
 * - Collapsible on mobile
 * - Shows markers for selected day
 * - Flight paths and route visualization
 */
export default function TripMapHeader({
  days,
  selectedDayNumber,
  tripDestination,
  onMarkerClick,
  onAddPlace,
  className = '',
}: TripMapHeaderProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [mapCollapseState, setMapCollapseState] = useState<MapCollapseState>('default');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for viewport sync
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Motion value for drag gesture
  const dragY = useMotionValue(0);
  const mapOpacity = useTransform(dragY, [-100, 0, 100], [1, 1, 0.7]);

  // Viewport sync hook
  const {
    activeItemId,
    viewport,
    dayMarkers,
    handleMarkerClick: syncMarkerClick,
    setActiveItem,
    flyToItem,
  } = useMapViewportSync({
    days,
    selectedDayNumber,
    containerRef,
    itemRefs,
    enabled: true,
  });

  // Check viewport size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle marker click
  const handleMarkerClick = useCallback((item: EnrichedItineraryItem) => {
    syncMarkerClick(item.id);
    setActiveItem(item.id);
    flyToItem(item.id);
    onMarkerClick?.(item);
  }, [syncMarkerClick, setActiveItem, flyToItem, onMarkerClick]);

  // Handle map drag to expand/collapse (mobile)
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;

    if (info.offset.y < -threshold) {
      // Dragged up → expand
      if (mapCollapseState === 'collapsed') {
        setMapCollapseState('default');
      } else if (mapCollapseState === 'default') {
        setMapCollapseState('expanded');
      }
    } else if (info.offset.y > threshold) {
      // Dragged down → collapse
      if (mapCollapseState === 'expanded') {
        setMapCollapseState('default');
      } else if (mapCollapseState === 'default') {
        setMapCollapseState('collapsed');
      }
    }

    dragY.set(0);
  }, [mapCollapseState, dragY]);

  // Toggle map collapse
  const toggleMapCollapse = useCallback(() => {
    setMapCollapseState((prev) => {
      if (prev === 'collapsed') return 'default';
      if (prev === 'default') return 'expanded';
      return 'default';
    });
  }, []);

  // Don't render until we know the viewport
  if (isMobile === null) {
    return (
      <div className={`h-[200px] bg-gray-100 dark:bg-gray-900 animate-pulse rounded-xl ${className}`} />
    );
  }

  // Desktop: fixed height, no collapse
  if (!isMobile) {
    return (
      <div className={`relative h-[220px] bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden ${className}`}>
        <TimelineLinkedMap
          days={days}
          selectedDayNumber={selectedDayNumber}
          activeItemId={activeItemId}
          viewport={viewport}
          tripDestination={tripDestination}
          onMarkerClick={handleMarkerClick}
          onAddPlace={onAddPlace}
          showSearch={false}
          showDayFilter={false}
          startInteractive={false}
        />
      </div>
    );
  }

  // Mobile: collapsible
  return (
    <>
      <motion.div
        className={`relative bg-gray-100 dark:bg-gray-900 overflow-hidden -mx-4 sm:-mx-6 ${className}`}
        animate={{ height: MAP_HEIGHTS[mapCollapseState] }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ opacity: mapOpacity }}
      >
        <TimelineLinkedMap
          days={days}
          selectedDayNumber={selectedDayNumber}
          activeItemId={activeItemId}
          viewport={viewport}
          tripDestination={tripDestination}
          onMarkerClick={handleMarkerClick}
          onAddPlace={onAddPlace}
          showSearch={mapCollapseState === 'expanded'}
          showDayFilter={false}
          isCompact={mapCollapseState === 'collapsed'}
          startInteractive={false}
        />

        {/* Collapse Handle */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 flex justify-center pb-1 cursor-grab active:cursor-grabbing"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          style={{ y: dragY }}
        >
          <button
            onClick={toggleMapCollapse}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 dark:border-gray-700"
          >
            {mapCollapseState === 'expanded' ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
            <span className="text-xs text-gray-500">
              {dayMarkers.length} stops
            </span>
          </button>
        </motion.div>

        {/* Expand to fullscreen button */}
        {mapCollapseState === 'expanded' && (
          <button
            onClick={() => setIsFullscreen(true)}
            className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <Maximize2 className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </motion.div>

      {/* Fullscreen Map Overlay */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white dark:bg-gray-950"
          >
            <TimelineLinkedMap
              days={days}
              selectedDayNumber={selectedDayNumber}
              activeItemId={activeItemId}
              viewport={viewport}
              tripDestination={tripDestination}
              onMarkerClick={handleMarkerClick}
              onAddPlace={onAddPlace}
              showSearch
              showDayFilter
              isFullscreen
              startInteractive={true}
            />
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 p-2 bg-white/90 dark:bg-gray-900/90 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
            >
              <Minimize2 className="w-5 h-5 text-gray-600" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
