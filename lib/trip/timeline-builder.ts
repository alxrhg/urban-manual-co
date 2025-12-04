/**
 * Timeline Builder Utility
 *
 * Builds a timeline of elements (items, travel connectors, gaps, insertion points)
 * from a list of itinerary items for a single day.
 */

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { TravelMode } from '@/types/trip';

// Timeline element types
export type TimelineElementType = 'item' | 'travel' | 'gap' | 'insertion';

interface BaseTimelineElement {
  type: TimelineElementType;
}

export interface ItemElement extends BaseTimelineElement {
  type: 'item';
  item: EnrichedItineraryItem;
}

export interface TravelElement extends BaseTimelineElement {
  type: 'travel';
  fromItem: EnrichedItineraryItem;
  toItem: EnrichedItineraryItem;
  travelTime: number; // minutes
  travelDistance: number; // km
  travelMode: TravelMode;
  suggestedTime: string; // Suggested time for inserting a new item
}

export interface GapElement extends BaseTimelineElement {
  type: 'gap';
  afterItemId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  suggestedTime: string;
  day: number;
}

export interface InsertionElement extends BaseTimelineElement {
  type: 'insertion';
  beforeItem: EnrichedItineraryItem | null;
  afterItem: EnrichedItineraryItem | null;
  suggestedTime: string;
}

export type TimelineElement = ItemElement | TravelElement | GapElement | InsertionElement;

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Get the end time of an item in minutes
 */
function getItemEndMinutes(item: EnrichedItineraryItem): number | null {
  const startMinutes = parseTimeToMinutes(item.time);
  if (startMinutes === null) return null;

  const duration = item.parsedNotes?.duration ?? 60; // Default 60 minutes
  return startMinutes + duration;
}

/**
 * Calculate suggested insertion time between two times
 */
function calculateSuggestedTime(
  afterEndMinutes: number | null,
  beforeStartMinutes: number | null
): string {
  // If we have both times, calculate midpoint
  if (afterEndMinutes !== null && beforeStartMinutes !== null) {
    const midpoint = Math.floor((afterEndMinutes + beforeStartMinutes) / 2);
    // Round to nearest 15 minutes
    const rounded = Math.round(midpoint / 15) * 15;
    return minutesToTimeString(rounded);
  }

  // If only after time, suggest 30 minutes after
  if (afterEndMinutes !== null) {
    return minutesToTimeString(afterEndMinutes + 30);
  }

  // If only before time, suggest 1 hour before
  if (beforeStartMinutes !== null) {
    return minutesToTimeString(Math.max(0, beforeStartMinutes - 60));
  }

  // Default to 10:00
  return '10:00';
}

/**
 * Gap threshold in minutes - gaps larger than this are shown as FreeTimeGap
 */
const GAP_THRESHOLD_MINUTES = 60;

/**
 * Build a timeline from itinerary items
 *
 * Logic:
 * 1. Sort items by time
 * 2. For each pair of adjacent items:
 *    - If gap > 60 minutes → insert 'gap' element
 *    - Else if item has travelTimeToNext → insert 'travel' element
 *    - Else → insert 'insertion' element
 * 3. Add 'insertion' at start of day (before first item)
 */
export function buildTimeline(
  items: EnrichedItineraryItem[],
  dayNumber: number
): TimelineElement[] {
  const timeline: TimelineElement[] = [];

  // Sort items by time, then by order_index
  const sortedItems = [...items].sort((a, b) => {
    const aTime = parseTimeToMinutes(a.time);
    const bTime = parseTimeToMinutes(b.time);

    // If both have times, sort by time
    if (aTime !== null && bTime !== null) {
      return aTime - bTime;
    }

    // Items with time come before items without
    if (aTime !== null) return -1;
    if (bTime !== null) return 1;

    // Fall back to order_index
    return a.order_index - b.order_index;
  });

  // Add initial insertion point (before first item)
  const firstItem = sortedItems[0];
  const firstStartMinutes = firstItem ? parseTimeToMinutes(firstItem.time) : null;

  timeline.push({
    type: 'insertion',
    beforeItem: firstItem ?? null,
    afterItem: null,
    suggestedTime: firstStartMinutes !== null
      ? minutesToTimeString(Math.max(0, firstStartMinutes - 60))
      : '09:00',
  });

  // Process each item
  sortedItems.forEach((item, index) => {
    // Add the item itself
    timeline.push({ type: 'item', item });

    const nextItem = sortedItems[index + 1];

    if (!nextItem) {
      // Last item - no connector needed (or could add end-of-day insertion)
      return;
    }

    const itemEndMinutes = getItemEndMinutes(item);
    const nextStartMinutes = parseTimeToMinutes(nextItem.time);

    // Calculate gap duration
    let gapMinutes = 0;
    if (itemEndMinutes !== null && nextStartMinutes !== null) {
      gapMinutes = nextStartMinutes - itemEndMinutes;
    }

    // Determine which connector to show
    const travelTime = item.parsedNotes?.travelTimeToNext;
    const travelDistance = item.parsedNotes?.travelDistanceToNext;
    const travelMode = (item.parsedNotes?.travelModeToNext as TravelMode) || 'walk';

    if (gapMinutes > GAP_THRESHOLD_MINUTES) {
      // Large gap - show FreeTimeGap
      timeline.push({
        type: 'gap',
        afterItemId: item.id,
        startTime: itemEndMinutes !== null ? minutesToTimeString(itemEndMinutes) : '',
        endTime: nextStartMinutes !== null ? minutesToTimeString(nextStartMinutes) : '',
        durationMinutes: gapMinutes,
        suggestedTime: calculateSuggestedTime(itemEndMinutes, nextStartMinutes),
        day: dayNumber,
      });
    } else if (travelTime || travelDistance) {
      // Has travel info - show TravelConnector
      timeline.push({
        type: 'travel',
        fromItem: item,
        toItem: nextItem,
        travelTime: travelTime ?? 0,
        travelDistance: travelDistance ?? 0,
        travelMode,
        suggestedTime: calculateSuggestedTime(itemEndMinutes, nextStartMinutes),
      });
    } else {
      // Small gap with no travel info - show InsertionPoint
      timeline.push({
        type: 'insertion',
        beforeItem: nextItem,
        afterItem: item,
        suggestedTime: calculateSuggestedTime(itemEndMinutes, nextStartMinutes),
      });
    }
  });

  return timeline;
}

/**
 * Get time-of-day emoji based on time
 */
export function getTimeOfDayEmoji(time: string): string {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return '☀️';

  const hours = Math.floor(minutes / 60);

  if (hours < 6) return '🌙'; // Night (before 6am)
  if (hours < 12) return '☀️'; // Morning
  if (hours < 17) return '☀️'; // Afternoon
  if (hours < 21) return '🌅'; // Evening (sunset)
  return '🌙'; // Night
}

/**
 * Format duration in a human-readable way
 */
export function formatGapDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}
