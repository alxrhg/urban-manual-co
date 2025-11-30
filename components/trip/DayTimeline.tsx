'use client';

import { useMemo, useRef, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  Sparkles,
  Loader2,
  Moon,
} from 'lucide-react';
import TransitConnector, { TransitMode } from './TransitConnector';
import DayIntelligence from './DayIntelligence';
import { NeighborhoodTags } from './NeighborhoodBreakdown';
import { getAirportCoordinates } from '@/lib/utils/airports';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

// Import new timeline components
import {
  TimeGrid,
  TimelineCard,
  CurrentTimeIndicator,
  useTimelinePositions,
  useDragResize,
  TIMELINE_CONFIG,
} from './timeline';

interface DayTimelineProps {
  day: TripDay;
  nightlyHotel?: EnrichedItineraryItem | null;
  onReorderItems?: (dayNumber: number, items: EnrichedItineraryItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onDurationChange?: (itemId: string, duration: number) => void;
  onTravelModeChange?: (itemId: string, mode: TransitMode) => void;
  onAddItem?: (dayNumber: number, category?: string) => void;
  onOptimizeDay?: (dayNumber: number) => void;
  onAutoFillDay?: (dayNumber: number) => void;
  activeItemId?: string | null;
  isOptimizing?: boolean;
  isAutoFilling?: boolean;
  isEditMode?: boolean;
  maxHeight?: number;
}

/**
 * DayTimeline - Timeline view for a single day's itinerary
 * Features: Time blocks, transit connectors, drag-and-drop reordering, scrollable
 */
export default function DayTimeline({
  day,
  nightlyHotel,
  onReorderItems,
  onRemoveItem: _onRemoveItem,
  onEditItem,
  onTimeChange,
  onDurationChange,
  onTravelModeChange,
  onAddItem,
  onOptimizeDay,
  onAutoFillDay,
  activeItemId,
  isOptimizing = false,
  isAutoFilling = false,
  isEditMode = false,
  maxHeight = TIMELINE_CONFIG.scrollableMaxHeight,
}: DayTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d');
    } catch {
      return null;
    }
  };

  const formattedDate = formatDayDate(day.date);

  // Separate hotels from regular activities
  const { regularItems, hotelItem, isExternalHotel } = useMemo(() => {
    const hotels = day.items.filter(item => {
      if (item.parsedNotes?.type !== 'hotel') return false;
      const checkInDate = item.parsedNotes?.checkInDate;
      if (checkInDate && day.date) {
        const checkIn = new Date(checkInDate);
        const dayDate = new Date(day.date);
        checkIn.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        return checkIn.getTime() === dayDate.getTime();
      }
      return true;
    });

    const regular = day.items.filter(item => item.parsedNotes?.type !== 'hotel');
    const effectiveHotel = nightlyHotel || hotels[0] || null;
    const isExternal = !!nightlyHotel && !hotels.length;

    return { regularItems: regular, hotelItem: effectiveHotel, isExternalHotel: isExternal };
  }, [day.items, day.date, nightlyHotel]);

  // Use the positioning hook
  const {
    positionedItems,
    startHour,
    endHour,
    timelineHeight,
    minutesToPixels,
  } = useTimelinePositions({
    items: regularItems,
  });

  // Use the drag/resize hook
  const {
    livePositions,
    handleDragStart,
    resetEdits,
  } = useDragResize({
    positionedItems,
    dayItems: day.items,
    dayNumber: day.dayNumber,
    startHour,
    pixelsPerMinute: TIMELINE_CONFIG.pixelsPerMinute,
    isEditMode,
    onTimeChange,
    onDurationChange,
    onReorderItems,
  });

  // Reset edits when day changes
  useEffect(() => {
    resetEdits();
  }, [day.dayNumber, resetEdits]);

  // Auto-scroll to current time
  const handleAutoScroll = useCallback((top: number) => {
    if (scrollContainerRef.current) {
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollTarget = Math.max(0, top - containerHeight / 3);
      scrollContainerRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  }, []);

  // Helper to get coordinates for transit connectors
  const getFromLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;
    if (itemType === 'flight') {
      const arrivalAirport = item.parsedNotes?.to;
      if (arrivalAirport) {
        const coords = getAirportCoordinates(arrivalAirport);
        if (coords) return coords;
      }
    }
    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) return { latitude: lat, longitude: lng };
    return undefined;
  };

  const getToLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;
    if (itemType === 'flight') {
      const departureAirport = item.parsedNotes?.from;
      if (departureAirport) {
        const coords = getAirportCoordinates(departureAirport);
        if (coords) return coords;
      }
    }
    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) return { latitude: lat, longitude: lng };
    return undefined;
  };

  // Render hotel section
  const renderHotelSection = () => {
    if (!hotelItem) return null;

    const checkInDate = hotelItem.parsedNotes?.checkInDate;
    const checkOutDate = hotelItem.parsedNotes?.checkOutDate;
    const checkInTime = hotelItem.parsedNotes?.checkInTime || '15:00';
    const checkOutTime = hotelItem.parsedNotes?.checkOutTime || '11:00';
    let nightsInfo = '';

    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      nightsInfo = totalNights > 1 ? `${totalNights} nights` : '1 night';
    }

    return (
      <div className="mt-4 pt-4 border-t border-gray-100/60 dark:border-gray-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Overnight
          </span>
          {nightsInfo && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {nightsInfo}
            </span>
          )}
        </div>
        <div
          className="p-3 rounded-xl cursor-pointer bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm ring-1 ring-gray-200/60 dark:ring-gray-700/40 shadow-sm shadow-gray-200/30 dark:shadow-gray-900/30"
          onClick={() => onEditItem?.(hotelItem)}
        >
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 rounded-t-xl" />

          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {hotelItem.title || 'Hotel'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                {hotelItem.parsedNotes?.address || hotelItem.destination?.formatted_address}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-100/50 dark:border-gray-700/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-tight">Check-in</span>
              <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums tracking-tight">{checkInTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-tight">Check-out</span>
              <span className="text-xs text-gray-600 dark:text-gray-300 tabular-nums tracking-tight">{checkOutTime}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render timeline blocks
  const renderBlocks = () => {
    return positionedItems.map(({ item, start, duration, laneIndex }, index) => {
      const top = minutesToPixels(start);
      const height = Math.max(duration * TIMELINE_CONFIG.pixelsPerMinute, TIMELINE_CONFIG.minCardHeight);
      const laneOffset = laneIndex * TIMELINE_CONFIG.laneOffset;
      const widthStyle = `calc(100% - ${laneOffset}px)`;

      // Get live position if dragging
      const livePos = livePositions[item.id];
      const actualStart = livePos?.start ?? start;
      const actualDuration = livePos?.duration ?? duration;
      const actualTop = minutesToPixels(actualStart);
      const actualHeight = Math.max(actualDuration * TIMELINE_CONFIG.pixelsPerMinute, TIMELINE_CONFIG.minCardHeight);

      const travelMode = (item.parsedNotes?.travelModeToNext as TransitMode) || 'walking';
      const nextItem = positionedItems[index + 1];
      const connectorTop = minutesToPixels(actualStart + actualDuration) + 6;
      const connectorHeight = nextItem
        ? Math.max(minutesToPixels(nextItem.start) - connectorTop - 12, 18)
        : 0;
      const fromLocation = getFromLocation(item);
      const toLocation = nextItem ? getToLocation(nextItem.item) : undefined;

      return (
        <div key={item.id} className="relative">
          <div
            className={`absolute left-0 right-0 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ top: actualTop, height: actualHeight, marginLeft: laneOffset, width: widthStyle }}
            onPointerDown={(event) => handleDragStart(item.id, 'move', actualStart, actualDuration, event.clientY)}
          >
            <TimelineCard
              item={item}
              start={actualStart}
              duration={actualDuration}
              height={actualHeight}
              laneOffset={laneOffset}
              isActive={item.id === activeItemId}
              isEditMode={isEditMode}
              onEdit={onEditItem}
              onDragStart={handleDragStart}
            />
          </div>

          {nextItem && (
            <div
              className="absolute left-0 right-0 flex justify-end pr-2"
              style={{ top: connectorTop, height: connectorHeight }}
            >
              <TransitConnector
                from={fromLocation}
                to={toLocation}
                mode={travelMode}
                itemId={item.id}
                onModeChange={onTravelModeChange}
                className="h-full"
              />
            </div>
          )}
        </div>
      );
    });
  };

  const isScrollable = timelineHeight > maxHeight;

  return (
    <div className="rounded-2xl overflow-hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm ring-1 ring-gray-200/60 dark:ring-gray-800/60 shadow-sm shadow-gray-200/30 dark:shadow-gray-900/30">
      {/* Day Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100/60 dark:border-gray-800/50">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
          <span className="text-lg font-normal text-gray-900 dark:text-white">
            Day {day.dayNumber}
          </span>
          {formattedDate && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formattedDate}
            </span>
          )}
          <NeighborhoodTags items={regularItems} />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      {/* Day Intelligence Bar */}
      {day.items.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100/60 dark:border-gray-800/50">
          <DayIntelligence
            dayNumber={day.dayNumber}
            date={day.date}
            items={day.items}
            onOptimizeDay={() => onOptimizeDay?.(day.dayNumber)}
            onAutoFill={() => onAutoFillDay?.(day.dayNumber)}
            isOptimizing={isOptimizing}
            isAutoFilling={isAutoFilling}
          />
        </div>
      )}

      {/* Day Content */}
      <div className="p-2 sm:p-4">
        {regularItems.length === 0 && !hotelItem ? (
          /* Empty State */
          <div className="py-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              No stops planned for this day
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {['cafe', 'museum', 'restaurant', 'bar'].map((category) => (
                <button
                  key={category}
                  onClick={() => onAddItem?.(day.dayNumber, category)}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  + {category === 'cafe' ? 'Breakfast' : category === 'museum' ? 'Museum' : category === 'restaurant' ? 'Lunch' : 'Drinks'}
                </button>
              ))}
            </div>
            <button
              onClick={() => onAddItem?.(day.dayNumber)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
              Browse all places
            </button>
            {onAutoFillDay && (
              <div className="mt-4">
                <button
                  onClick={() => onAutoFillDay(day.dayNumber)}
                  disabled={isAutoFilling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-black dark:bg-white dark:text-black rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {isAutoFilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Auto-fill day
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Scrollable Timeline Container */}
            <div
              ref={scrollContainerRef}
              className={`relative ${isScrollable ? 'overflow-y-auto' : ''}`}
              style={{ maxHeight: isScrollable ? maxHeight : undefined }}
            >
              <div
                ref={timelineRef}
                className="relative"
                style={{ height: `${timelineHeight}px` }}
              >
                {/* Time grid with hour lines */}
                <TimeGrid
                  startHour={startHour}
                  endHour={endHour}
                  minutesToPixels={minutesToPixels}
                />

                {/* Current time indicator */}
                <CurrentTimeIndicator
                  date={day.date}
                  startHour={startHour}
                  endHour={endHour}
                  minutesToPixels={minutesToPixels}
                  onAutoScroll={handleAutoScroll}
                />

                {/* Timeline cards */}
                <div className="absolute inset-0 left-14">
                  {renderBlocks()}
                </div>
              </div>
            </div>

            {/* Scroll indicator */}
            {isScrollable && (
              <div className="text-center py-2 text-[10px] text-gray-400 dark:text-gray-500">
                Scroll for more
              </div>
            )}

            {/* Add Stop Button */}
            {regularItems.length > 0 && (
              <div className="mt-3 ml-14">
                <button
                  onClick={() => onAddItem?.(day.dayNumber)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add stop
                </button>
              </div>
            )}

            {renderHotelSection()}
          </>
        )}
      </div>
    </div>
  );
}
