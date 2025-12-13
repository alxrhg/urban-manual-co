'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  ChevronUp,
  ChevronDown,
  Calendar,
  MapPin,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import { useMapViewportSync } from '@/lib/hooks/useMapViewportSync';
import type { Destination } from '@/types/destination';
import TimelineLinkedMap from './TimelineLinkedMap';
import { ItineraryScrollList } from './ItineraryScrollList';

interface TimelineLinkedMapLayoutProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onAddItem?: (dayNumber: number) => void;
  onAddPlace?: (place: Partial<Destination>, dayNumber: number) => void;
  onRemoveItem?: (itemId: string) => void;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  tripDestination?: string;
  startDate?: string | null;
  className?: string;
}

// Map collapse states for mobile
type MapCollapseState = 'collapsed' | 'default' | 'expanded';

const MAP_HEIGHTS: Record<MapCollapseState, string> = {
  collapsed: '80px',
  default: '33vh',
  expanded: '70vh',
};

/**
 * TimelineLinkedMapLayout - Responsive layout with synchronized map and itinerary
 *
 * Mobile: Map hero at top (collapsible), itinerary below
 * Desktop: Side-by-side split view
 *
 * Features:
 * - Scroll-linked map viewport updates
 * - Bi-directional sync (tap map → scroll to item, scroll → update map)
 * - Smooth camera transitions
 * - Day selector
 * - Collapsible map on mobile
 */
export default function TimelineLinkedMapLayout({
  days,
  selectedDayNumber,
  onSelectDay,
  onEditItem,
  onAddItem,
  onAddPlace,
  onRemoveItem,
  onReorderItems,
  tripDestination,
  startDate,
  className = '',
}: TimelineLinkedMapLayoutProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [mapCollapseState, setMapCollapseState] = useState<MapCollapseState>('default');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for scroll sync
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
    handleMarkerClick,
    handleItemIntersect,
    scrollToItem,
    setActiveItem,
    flyToItem,
    resetToDay,
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
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Get selected day data
  const selectedDay = useMemo(() => {
    return days.find((d) => d.dayNumber === selectedDayNumber);
  }, [days, selectedDayNumber]);

  // Format date for display
  const formatDateShort = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'EEE, MMM d');
    } catch {
      return null;
    }
  };

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

  // Handle item click
  const handleItemClick = useCallback((item: EnrichedItineraryItem) => {
    setActiveItem(item.id);
    flyToItem(item.id);
    onEditItem?.(item);
  }, [setActiveItem, flyToItem, onEditItem]);

  // Handle day change
  const handleDayChange = useCallback((dayNumber: number) => {
    onSelectDay(dayNumber);
    resetToDay(dayNumber);
  }, [onSelectDay, resetToDay]);

  // Register item ref for intersection observer
  const registerItemRef = useCallback((itemId: string, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(itemId, element);
    } else {
      itemRefs.current.delete(itemId);
    }
  }, []);

  // Don't render until we know the viewport
  if (isMobile === null) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-800 dark:border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className={`flex flex-col h-[100dvh] bg-white dark:bg-gray-950 ${className}`}>
        {/* Map Hero (collapsible) */}
        <motion.div
          className="relative flex-shrink-0 bg-gray-100 dark:bg-gray-900 overflow-hidden"
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
            showSearch={mapCollapseState !== 'collapsed'}
            showDayFilter={false}
            isCompact={mapCollapseState === 'collapsed'}
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

        {/* Day Selector */}
        <DaySelector
          days={days}
          selectedDayNumber={selectedDayNumber}
          onSelectDay={handleDayChange}
          startDate={startDate}
        />

        {/* Itinerary List */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          <ItineraryScrollList
            day={selectedDay}
            activeItemId={activeItemId}
            onItemClick={handleItemClick}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            registerItemRef={registerItemRef}
            onItemIntersect={handleItemIntersect}
          />
        </div>

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
      </div>
    );
  }

  // Desktop Layout - Side by side
  return (
    <div className={`flex h-[calc(100vh-64px)] bg-white dark:bg-gray-950 ${className}`}>
      {/* Left: Itinerary Panel */}
      <div className="w-[420px] flex-shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Day Selector */}
        <DaySelector
          days={days}
          selectedDayNumber={selectedDayNumber}
          onSelectDay={handleDayChange}
          startDate={startDate}
          variant="desktop"
        />

        {/* Itinerary List */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto"
        >
          <ItineraryScrollList
            day={selectedDay}
            activeItemId={activeItemId}
            onItemClick={handleItemClick}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            registerItemRef={registerItemRef}
            onItemIntersect={handleItemIntersect}
          />
        </div>
      </div>

      {/* Right: Map */}
      <div className="flex-1 relative">
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
        />
      </div>
    </div>
  );
}

// Day Selector Component
interface DaySelectorProps {
  days: TripDay[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  startDate?: string | null;
  variant?: 'mobile' | 'desktop';
}

function DaySelector({
  days,
  selectedDayNumber,
  onSelectDay,
  startDate,
  variant = 'mobile',
}: DaySelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected day
  useEffect(() => {
    if (scrollRef.current) {
      const selectedButton = scrollRef.current.querySelector(`[data-day="${selectedDayNumber}"]`);
      if (selectedButton) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDayNumber]);

  const formatDayDate = (day: TripDay) => {
    if (!day.date) return null;
    try {
      return format(parseISO(day.date), 'MMM d');
    } catch {
      return null;
    }
  };

  if (variant === 'desktop') {
    return (
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <div
          ref={scrollRef}
          className="flex items-center gap-1 p-3 overflow-x-auto scrollbar-hide"
        >
          {days.map((day) => {
            const isSelected = day.dayNumber === selectedDayNumber;
            const dateStr = formatDayDate(day);

            return (
              <button
                key={day.dayNumber}
                data-day={day.dayNumber}
                onClick={() => onSelectDay(day.dayNumber)}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-2 rounded-xl transition-colors ${
                  isSelected
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xs font-medium">Day {day.dayNumber}</span>
                {dateStr && (
                  <span className={`text-[10px] ${isSelected ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>
                    {dateStr}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile variant
  return (
    <div className="flex-shrink-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-hide"
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {days.map((day) => {
          const isSelected = day.dayNumber === selectedDayNumber;
          const dateStr = formatDayDate(day);

          return (
            <button
              key={day.dayNumber}
              data-day={day.dayNumber}
              onClick={() => onSelectDay(day.dayNumber)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {dateStr ? `${dateStr}` : `Day ${day.dayNumber}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
