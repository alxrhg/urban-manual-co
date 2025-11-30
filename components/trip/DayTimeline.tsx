'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import {
  Plus,
  Sparkles,
  Loader2,
  Moon,
  MapPin,
  Coffee,
  Utensils,
  Martini,
  Landmark,
  Train,
  Camera,
  Plane,
  GripVertical,
} from 'lucide-react';
import TransitConnector, { TransitMode } from './TransitConnector';
import DayIntelligence from './DayIntelligence';
import { NeighborhoodTags } from './NeighborhoodBreakdown';
import { getAirportCoordinates } from '@/lib/utils/airports';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  calculateDuration,
  estimateDuration,
  formatMinutesToTime,
  formatTimeDisplay,
  parseTimeToMinutes,
} from '@/lib/utils/time-calculations';

interface DayTimelineProps {
  day: TripDay;
  nightlyHotel?: EnrichedItineraryItem | null; // Hotel spanning this night (from another day)
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
}

/**
 * DayTimeline - Timeline view for a single day's itinerary
 * Features: Time blocks, transit connectors, drag-and-drop reordering
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
}: DayTimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [livePositions, setLivePositions] = useState<
    Record<string, { start: number; duration: number }>
  >({});
  const [localEdits, setLocalEdits] = useState<
    Record<string, { time?: string; duration?: number }>
  >({});
  const [dragState, setDragState] = useState<
    | null
    | {
        itemId: string;
        mode: 'move' | 'resize-start' | 'resize-end';
        startY: number;
        initialStart: number;
        initialDuration: number;
      }
  >(null);

  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d');
    } catch {
      return null;
    }
  };

  const formattedDate = formatDayDate(day.date);

  const updateLocalEdit = useCallback((id: string, updates: { time?: string; duration?: number }) => {
    setLocalEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  }, []);

  useEffect(() => {
    setLivePositions({});
    setLocalEdits({});
  }, [day.dayNumber]);

  // Helper to get coordinates for transit connectors
  const getFromLocation = (item: EnrichedItineraryItem) => {
    const itemType = item.parsedNotes?.type;

    if (itemType === 'flight') {
      const arrivalAirport = item.parsedNotes?.to;
      if (arrivalAirport) {
        const coords = getAirportCoordinates(arrivalAirport);
        if (coords) return coords;
      }
      const lat = item.parsedNotes?.latitude;
      const lng = item.parsedNotes?.longitude;
      if (lat && lng) return { latitude: lat, longitude: lng };
      return undefined;
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
      const lat = item.parsedNotes?.latitude;
      const lng = item.parsedNotes?.longitude;
      if (lat && lng) return { latitude: lat, longitude: lng };
      return undefined;
    }

    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lng = item.destination?.longitude ?? item.parsedNotes?.longitude;
    if (lat && lng) return { latitude: lat, longitude: lng };
    return undefined;
  };

  // Separate hotels from regular activities
  const { regularItems, hotelItem, isExternalHotel } = useMemo(() => {
    // Filter hotels: only include if check-in date matches this day's date
    const hotels = day.items.filter(item => {
      if (item.parsedNotes?.type !== 'hotel') return false;

      // If hotel has a check-in date, verify it matches this day
      const checkInDate = item.parsedNotes?.checkInDate;
      if (checkInDate && day.date) {
        const checkIn = new Date(checkInDate);
        const dayDate = new Date(day.date);
        checkIn.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        return checkIn.getTime() === dayDate.getTime();
      }
      return true; // No check-in date set, show on assigned day
    });

    const regular = day.items.filter(item => item.parsedNotes?.type !== 'hotel');

    // Use nightlyHotel (from nightlyHotelByDay map) if provided, else use matching hotel
    const effectiveHotel = nightlyHotel || hotels[0] || null;
    const isExternal = !!nightlyHotel && !hotels.length;

    return {
      regularItems: regular,
      hotelItem: effectiveHotel,
      isExternalHotel: isExternal, // True if hotel is from a different day (multi-night)
    };
  }, [day.items, day.date, nightlyHotel]);

  const parseItemStartMinutes = useCallback(
    (item: EnrichedItineraryItem, index: number): number => {
      const override = localEdits[item.id]?.time;
      const baseTime = override || item.time || item.parsedNotes?.departureTime;
      if (baseTime) return parseTimeToMinutes(baseTime);

      // Fallback spacing for items without time
      return 6 * 60 + index * 75;
    },
    [localEdits]
  );

  const parseItemDuration = useCallback(
    (item: EnrichedItineraryItem): number => {
      const overrideDuration = localEdits[item.id]?.duration;
      if (overrideDuration) return overrideDuration;

      if (item.parsedNotes?.duration) return item.parsedNotes.duration;
      if (item.parsedNotes?.departureTime && item.parsedNotes?.arrivalTime) {
        return calculateDuration(item.parsedNotes.departureTime, item.parsedNotes.arrivalTime);
      }

      const category = item.parsedNotes?.category || item.parsedNotes?.type || item.destination?.category;
      return estimateDuration(category);
    },
    [localEdits]
  );

  const positionedItems = useMemo(() => {
    const itemsWithTimes = regularItems.map((item, index) => {
      const start = livePositions[item.id]?.start ?? parseItemStartMinutes(item, index);
      const duration = Math.max(livePositions[item.id]?.duration ?? parseItemDuration(item), 30);
      return {
        item,
        start,
        duration,
        end: start + duration,
      };
    });

    const sorted = [...itemsWithTimes].sort((a, b) => a.start - b.start);
    const lanes: number[] = [];

    return sorted.map((entry) => {
      let laneIndex = lanes.findIndex((end) => entry.start >= end);
      if (laneIndex === -1) {
        laneIndex = lanes.length;
        lanes.push(entry.end);
      } else {
        lanes[laneIndex] = entry.end;
      }

      return { ...entry, laneIndex, laneCount: lanes.length };
    });
  }, [livePositions, parseItemDuration, parseItemStartMinutes, regularItems]);

  const earliestMinute = Math.min(360, positionedItems.reduce((min, item) => Math.min(min, item.start), Infinity));
  const latestMinute = Math.max(
    1320,
    positionedItems.reduce((max, item) => Math.max(max, item.end + 45), 0)
  );

  const startHour = Math.max(6, Math.floor(earliestMinute / 60));
  const endHour = Math.min(24, Math.ceil(latestMinute / 60));
  const pixelsPerMinute = 1.05;
  const gridMinutes = 30;
  const timelineHeight = (endHour * 60 - startHour * 60) * pixelsPerMinute;

  const minutesToPixels = useCallback(
    (minutes: number) => (minutes - startHour * 60) * pixelsPerMinute,
    [startHour, pixelsPerMinute]
  );

  const snapToGrid = (minutes: number) => Math.round(minutes / gridMinutes) * gridMinutes;

  const handleDragStart = (
    itemId: string,
    mode: 'move' | 'resize-start' | 'resize-end',
    start: number,
    duration: number,
    clientY: number
  ) => {
    if (!isEditMode) return;
    setDragState({ itemId, mode, initialStart: start, initialDuration: duration, startY: clientY });
  };

  const finalizePosition = useCallback(
    (itemId: string, start: number, duration: number) => {
      const snappedStart = Math.max(startHour * 60, snapToGrid(start));
      const snappedDuration = Math.max(15, snapToGrid(duration));
      const newTime = formatMinutesToTime(snappedStart % (24 * 60));

      setLivePositions((prev) => ({
        ...prev,
        [itemId]: { start: snappedStart, duration: snappedDuration },
      }));
      updateLocalEdit(itemId, { time: newTime, duration: snappedDuration });
      onTimeChange?.(itemId, newTime);
      onDurationChange?.(itemId, snappedDuration);

      if (onReorderItems) {
        const updatedItems = day.items.map((item) =>
          item.id === itemId
            ? { ...item, time: newTime, parsedNotes: { ...item.parsedNotes, duration: snappedDuration } }
            : item
        );
        const sorted = [...updatedItems].sort(
          (a, b) => parseTimeToMinutes(a.time || '00:00') - parseTimeToMinutes(b.time || '00:00')
        );
        const orderChanged = sorted.some((item, idx) => item.id !== updatedItems[idx]?.id);
        if (orderChanged) {
          onReorderItems(day.dayNumber, sorted as EnrichedItineraryItem[]);
        }
      }
    },
    [day.dayNumber, day.items, onDurationChange, onReorderItems, onTimeChange, startHour, updateLocalEdit]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event: PointerEvent) => {
      const base = positionedItems.find((p) => p.item.id === dragState.itemId);
      if (!base || !timelineRef.current) return;

      const deltaMinutes = (event.clientY - dragState.startY) / pixelsPerMinute;
      if (dragState.mode === 'move') {
        const nextStart = Math.max(startHour * 60, dragState.initialStart + deltaMinutes);
        setLivePositions((prev) => ({
          ...prev,
          [dragState.itemId]: {
            start: nextStart,
            duration: base.duration,
          },
        }));
      }

      if (dragState.mode === 'resize-end') {
        const nextDuration = Math.max(15, dragState.initialDuration + deltaMinutes);
        setLivePositions((prev) => ({
          ...prev,
          [dragState.itemId]: {
            start: base.start,
            duration: nextDuration,
          },
        }));
      }

      if (dragState.mode === 'resize-start') {
        const nextStart = dragState.initialStart + deltaMinutes;
        const nextDuration = Math.max(15, dragState.initialDuration - deltaMinutes);
        setLivePositions((prev) => ({
          ...prev,
          [dragState.itemId]: {
            start: Math.max(startHour * 60, nextStart),
            duration: nextDuration,
          },
        }));
      }
    };

    const handleUp = () => {
      const pending = livePositions[dragState.itemId];
      const base = positionedItems.find((p) => p.item.id === dragState.itemId);
      const finalStart = pending?.start ?? base?.start ?? startHour * 60;
      const finalDuration = pending?.duration ?? base?.duration ?? 60;
      finalizePosition(dragState.itemId, finalStart, finalDuration);
      setDragState(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, finalizePosition, livePositions, positionedItems, pixelsPerMinute, startHour]);

  // Render hotel section at the bottom
  const renderHotelSection = () => {
    if (!hotelItem) return null;

    const checkInDate = hotelItem.parsedNotes?.checkInDate;
    const checkOutDate = hotelItem.parsedNotes?.checkOutDate;

    // Calculate night number (which night of the stay is this?)
    let nightLabel = 'Tonight\'s Stay';
    let nightsInfo = '';

    if (checkInDate && checkOutDate && day.date) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const dayDate = new Date(day.date);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      dayDate.setHours(0, 0, 0, 0);

      const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const currentNight = Math.ceil((dayDate.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (totalNights > 1) {
        nightsInfo = `Night ${currentNight} of ${totalNights}`;
      } else {
        nightsInfo = '1 night';
      }

      // Format dates for display
      const formatDate = (d: Date) => format(d, 'EEE, MMM d');
      nightLabel = isExternalHotel
        ? `Continuing stay (${formatDate(checkIn)} → ${formatDate(checkOut)})`
        : 'Tonight\'s Stay';
    }

    return (
      <div className="mt-4 pt-4 border-t border-stone-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wide">
              {nightLabel}
            </span>
          </div>
          {nightsInfo && (
            <span className="text-[10px] text-stone-400 dark:text-gray-500 bg-stone-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {nightsInfo}
            </span>
          )}
        </div>
        <div className="p-3 bg-gradient-to-r from-stone-50 to-white dark:from-gray-900 dark:to-gray-800 border border-stone-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <Moon className="w-4 h-4 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-900 dark:text-white">{hotelItem.title || 'Hotel'}</p>
              <p className="text-xs text-stone-500 dark:text-gray-400">{hotelItem.parsedNotes?.address || hotelItem.destination?.formatted_address}</p>
            </div>
            <span className="text-xs text-stone-500 dark:text-gray-400">{hotelItem.parsedNotes?.checkInTime || 'Check-in'}</span>
          </div>
        </div>
      </div>
    );
  };

  const getCategoryStyles = (item: EnrichedItineraryItem) => {
    const type = item.parsedNotes?.type || item.destination?.category || 'default';

    if (type === 'breakfast' || type === 'restaurant' || type === 'bar') {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-100',
        text: 'text-orange-900',
        iconColor: 'text-orange-500',
      };
    }

    if (type === 'museum' || type === 'gallery') {
      return {
        bg: 'bg-indigo-50',
        border: 'border-indigo-100',
        text: 'text-indigo-900',
        iconColor: 'text-indigo-500',
      };
    }

    if (type === 'flight' || type === 'train') {
      return {
        bg: 'bg-sky-50',
        border: 'border-sky-100',
        text: 'text-sky-900',
        iconColor: 'text-sky-500',
      };
    }

    return {
      bg: 'bg-white',
      border: 'border-stone-200 dark:border-gray-800',
      text: 'text-stone-900 dark:text-white',
      iconColor: 'text-stone-500',
    };
  };

  const getIconForItem = (item: EnrichedItineraryItem) => {
    const type = item.parsedNotes?.type || item.destination?.category;
    if (type === 'breakfast' || type === 'cafe') return <Coffee className="w-4 h-4" />;
    if (type === 'restaurant') return <Utensils className="w-4 h-4" />;
    if (type === 'bar') return <Martini className="w-4 h-4" />;
    if (type === 'museum' || type === 'gallery') return <Landmark className="w-4 h-4" />;
    if (type === 'flight') return <Plane className="w-4 h-4" />;
    if (type === 'train') return <Train className="w-4 h-4" />;
    if (type === 'activity') return <Camera className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  const renderTimeGrid = () => {
    const labels = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      const top = minutesToPixels(hour * 60);
      const label = `${hour.toString().padStart(2, '0')}:00`;
      labels.push(
        <div key={hour} className="absolute left-0 right-0" style={{ top }}>
          <div className="flex items-center gap-3">
            <div className="w-12 text-[11px] text-right text-stone-400 tabular-nums">{label}</div>
            <div className="flex-1 h-px bg-gradient-to-r from-stone-200/80 via-stone-100 to-transparent dark:from-gray-800 dark:via-gray-800" />
          </div>
        </div>
      );
    }
    return labels;
  };

  const renderCurrentTime = () => {
    if (!day.date || !isToday(new Date(day.date))) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    if (currentMinutes < startHour * 60 || currentMinutes > endHour * 60) return null;

    const top = minutesToPixels(currentMinutes);
    return (
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 text-[11px] text-right text-red-500 tabular-nums">
            {formatTimeDisplay(formatMinutesToTime(currentMinutes))}
          </div>
          <div className="flex-1 h-px bg-red-500" />
        </div>
      </div>
    );
  };

  const renderBlocks = () => {
    return positionedItems.map(({ item, start, duration, laneIndex }, index) => {
      const styleSet = getCategoryStyles(item);
      const top = minutesToPixels(start);
      const height = Math.max(duration * pixelsPerMinute, 44);
      const laneOffset = laneIndex * 14;
      const widthStyle = `calc(100% - ${laneOffset}px)`;
      const startLabel = formatTimeDisplay(formatMinutesToTime(start));
      const endLabel = formatTimeDisplay(formatMinutesToTime(start + duration));
      const travelMode = (item.parsedNotes?.travelModeToNext as TransitMode) || 'walking';
      const nextItem = positionedItems[index + 1];
      const connectorTop = minutesToPixels(start + duration) + 6;
      const connectorHeight = nextItem ? Math.max(minutesToPixels(nextItem.start) - connectorTop - 12, 18) : 0;
      const fromLocation = getFromLocation(item);
      const toLocation = nextItem ? getToLocation(nextItem.item) : undefined;

      return (
        <div key={item.id} className="relative">
          <div
            className={`absolute left-0 right-0 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ top, height, marginLeft: laneOffset, width: widthStyle }}
            onPointerDown={(event) => handleDragStart(item.id, 'move', start, duration, event.clientY)}
          >
            <div
              className={`h-full border ${styleSet.border} ${styleSet.bg} ${styleSet.text} rounded-2xl shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] relative overflow-hidden transition-transform duration-150 ${
                isEditMode ? 'hover:scale-[1.01]' : ''
              } ${item.id === activeItemId ? 'ring-2 ring-stone-300 dark:ring-gray-600' : ''}`}
              onClick={() => onEditItem?.(item)}
            >
              <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/40 mix-blend-overlay pointer-events-none" />
              {isEditMode && (
                <div className="absolute inset-x-3 top-2 flex items-center justify-between text-[10px] text-stone-400">
                  <span className="flex items-center gap-1 uppercase tracking-wide font-semibold">
                    <GripVertical className="w-3 h-3" />
                    Drag / resize
                  </span>
                  <span className="tabular-nums">{formatTimeDisplay(formatMinutesToTime(duration))}</span>
                </div>
              )}
              <div className="flex items-start gap-3 px-4 py-3 relative z-10">
                <div className={`w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center ${styleSet.iconColor} shadow-sm`}>
                  {getIconForItem(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 uppercase tracking-[0.08em]">
                    <span>{startLabel}</span>
                    <span className="text-stone-300">•</span>
                    <span>{endLabel}</span>
                  </div>
                  <p className="text-sm font-semibold leading-tight text-stone-900 dark:text-white mt-0.5 line-clamp-1">
                    {item.title || 'Untitled stop'}
                  </p>
                  {item.destination?.neighborhood && (
                    <p className="text-xs text-stone-500 dark:text-gray-400 line-clamp-1">{item.destination.neighborhood}</p>
                  )}
                </div>
              </div>

              {isEditMode && (
                <>
                  <div
                    className="absolute inset-x-3 top-0 h-2 cursor-n-resize"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handleDragStart(item.id, 'resize-start', start, duration, event.clientY);
                    }}
                  />
                  <div
                    className="absolute inset-x-3 bottom-0 h-2 cursor-s-resize"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handleDragStart(item.id, 'resize-end', start, duration, event.clientY);
                    }}
                  />
                </>
              )}
            </div>
          </div>

          {nextItem && (
            <div
              className="absolute left-[52px] right-0"
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

  return (
    <div className="border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Day Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-100 dark:border-gray-800/50 bg-stone-50/50 dark:bg-gray-900/50">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
          <span className="text-lg font-light text-stone-900 dark:text-white">
            Day {day.dayNumber}
          </span>
          {formattedDate && (
            <span className="text-xs text-stone-500 dark:text-gray-400">
              {formattedDate}
            </span>
          )}
          {/* Neighborhood Tags */}
          <NeighborhoodTags items={regularItems} />
        </div>
        <span className="text-xs text-stone-400 dark:text-gray-500">
          {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      {/* Day Intelligence Bar */}
      {day.items.length > 0 && (
        <div className="px-4 py-2 border-b border-stone-100 dark:border-gray-800/50 bg-stone-50/30 dark:bg-gray-900/30">
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
            <p className="text-sm text-stone-400 dark:text-gray-500 mb-4">
              No stops planned for this day
            </p>
            {/* Quick Add Suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'cafe')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Breakfast
              </button>
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'museum')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Museum
              </button>
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'restaurant')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Lunch
              </button>
              <button
                onClick={() => onAddItem?.(day.dayNumber, 'bar')}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-gray-400 bg-stone-100 dark:bg-gray-800 rounded-full hover:bg-stone-200 dark:hover:bg-gray-700 transition-colors"
              >
                + Drinks
              </button>
            </div>
            <button
              onClick={() => onAddItem?.(day.dayNumber)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
              Browse all places
            </button>
            {onAutoFillDay && (
              <div className="mt-4">
                <button
                  onClick={() => onAutoFillDay(day.dayNumber)}
                  disabled={isAutoFilling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-stone-900 dark:bg-white dark:text-gray-900 rounded-full hover:opacity-80 disabled:opacity-50 transition-opacity"
                >
                  {isAutoFilling ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Auto-fill day
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="relative">
              <div
                ref={timelineRef}
                className="relative"
                style={{ height: `${timelineHeight}px` }}
              >
                {renderTimeGrid()}
                {renderCurrentTime()}
                <div className="absolute inset-0 left-12">
                  {renderBlocks()}
                </div>
              </div>
            </div>
            {renderHotelSection()}
          </>
        )}

        {/* Add Stop Button */}
        {day.items.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => onAddItem?.(day.dayNumber)}
              className="w-full flex items-center justify-center gap-2 py-3 text-xs font-medium text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white border border-dashed border-stone-200 dark:border-gray-800 rounded-xl hover:border-stone-300 dark:hover:border-gray-700 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add stop
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
