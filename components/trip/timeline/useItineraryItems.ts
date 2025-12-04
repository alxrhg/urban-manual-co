'use client';

import { useMemo } from 'react';
import { parseTimeToMinutes, estimateDuration } from '@/lib/utils/time-calculations';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';
import { TIMELINE_CONFIG } from './config';

export interface ItineraryItemWithPosition extends EnrichedItineraryItem {
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
}

export interface TimeGap {
  startTime: number; // minutes since midnight
  endTime: number;
  durationMinutes: number;
  previousItem?: ItineraryItemWithPosition;
  nextItem?: ItineraryItemWithPosition;
}

interface UseItineraryItemsOptions {
  tripId: string;
  day: TripDay;
  dayStartHour?: number;
  dayEndHour?: number;
}

interface UseItineraryItemsResult {
  items: ItineraryItemWithPosition[];
  gaps: TimeGap[];
  startHour: number;
  endHour: number;
  totalDuration: number;
}

/**
 * Hook for managing itinerary items with time positions and gap detection
 * Used by ItineraryTimeline for rendering items with proper positioning
 */
export function useItineraryItems({
  tripId,
  day,
  dayStartHour = 8,
  dayEndHour = 22,
}: UseItineraryItemsOptions): UseItineraryItemsResult {
  const items = useMemo(() => {
    // Filter out hotels and items without times for timeline display
    const timelineItems = day.items.filter((item) => {
      const type = item.parsedNotes?.type;
      // Keep hotels separate (they show at the end)
      if (type === 'hotel') return false;
      return true;
    });

    // Convert items to positioned items with calculated times
    const positioned: ItineraryItemWithPosition[] = timelineItems.map((item, index) => {
      // Get start time
      let startMinutes: number;
      if (item.time) {
        startMinutes = parseTimeToMinutes(item.time);
      } else if (item.parsedNotes?.departureTime) {
        startMinutes = parseTimeToMinutes(item.parsedNotes.departureTime);
      } else {
        // Fallback: space items out starting from dayStartHour
        startMinutes = dayStartHour * 60 + index * 90;
      }

      // Get duration
      let durationMinutes: number;
      if (item.parsedNotes?.duration) {
        durationMinutes = item.parsedNotes.duration;
      } else if (item.parsedNotes?.departureTime && item.parsedNotes?.arrivalTime) {
        const depMinutes = parseTimeToMinutes(item.parsedNotes.departureTime);
        const arrMinutes = parseTimeToMinutes(item.parsedNotes.arrivalTime);
        durationMinutes = arrMinutes > depMinutes ? arrMinutes - depMinutes : 60;
      } else {
        // Estimate based on category
        const category = item.parsedNotes?.category || item.destination?.category;
        durationMinutes = estimateDuration(category);
      }

      // Ensure minimum duration
      durationMinutes = Math.max(durationMinutes, 30);

      return {
        ...item,
        startMinutes,
        durationMinutes,
        endMinutes: startMinutes + durationMinutes,
      };
    });

    // Sort by start time
    return positioned.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [day.items, dayStartHour]);

  // Calculate gaps between items
  const gaps = useMemo(() => {
    const detectedGaps: TimeGap[] = [];
    const minGapMinutes = 30; // Minimum gap to show as droppable

    // Add gap before first item if there's space
    if (items.length > 0) {
      const firstItem = items[0];
      const dayStart = dayStartHour * 60;
      if (firstItem.startMinutes - dayStart >= minGapMinutes) {
        detectedGaps.push({
          startTime: dayStart,
          endTime: firstItem.startMinutes,
          durationMinutes: firstItem.startMinutes - dayStart,
          nextItem: firstItem,
        });
      }
    }

    // Add gaps between items
    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      const next = items[i + 1];

      // Account for travel time if specified
      const travelTime = current.parsedNotes?.travelTimeToNext || 15;
      const gapStart = current.endMinutes + travelTime;

      if (next.startMinutes - gapStart >= minGapMinutes) {
        detectedGaps.push({
          startTime: gapStart,
          endTime: next.startMinutes,
          durationMinutes: next.startMinutes - gapStart,
          previousItem: current,
          nextItem: next,
        });
      }
    }

    // Add gap after last item if there's space before day end
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      const dayEnd = dayEndHour * 60;
      const gapStart = lastItem.endMinutes + 15; // 15 min buffer
      if (dayEnd - gapStart >= minGapMinutes) {
        detectedGaps.push({
          startTime: gapStart,
          endTime: dayEnd,
          durationMinutes: dayEnd - gapStart,
          previousItem: lastItem,
        });
      }
    }

    // If no items, add one big gap for the whole day
    if (items.length === 0) {
      detectedGaps.push({
        startTime: dayStartHour * 60,
        endTime: dayEndHour * 60,
        durationMinutes: (dayEndHour - dayStartHour) * 60,
      });
    }

    return detectedGaps;
  }, [items, dayStartHour, dayEndHour]);

  // Calculate actual start/end hours based on items
  const { startHour, endHour } = useMemo(() => {
    if (items.length === 0) {
      return { startHour: dayStartHour, endHour: dayEndHour };
    }

    const earliest = Math.min(...items.map((i) => i.startMinutes));
    const latest = Math.max(...items.map((i) => i.endMinutes));

    return {
      startHour: Math.max(6, Math.floor(earliest / 60) - 1),
      endHour: Math.min(24, Math.ceil(latest / 60) + 1),
    };
  }, [items, dayStartHour, dayEndHour]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return items.reduce((total, item) => total + item.durationMinutes, 0);
  }, [items]);

  return {
    items,
    gaps,
    startHour,
    endHour,
    totalDuration,
  };
}
