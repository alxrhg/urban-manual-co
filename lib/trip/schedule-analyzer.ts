/**
 * Schedule gap analyzer for trip itineraries
 * Finds free time slots in a day's schedule
 */

import type { ItineraryItem } from '@/types/trip';
import { parseItineraryNotes } from '@/types/trip';

/**
 * Card types for destinations and activities
 */
export type CardType =
  | 'restaurant'
  | 'hotel'
  | 'bar'
  | 'cafe'
  | 'attraction'
  | 'museum'
  | 'shop'
  | 'spa'
  | 'pool'
  | 'beach'
  | 'park'
  | 'nightlife'
  | 'activity'
  | 'event'
  | 'flight'
  | 'train'
  | 'breakfast';

/**
 * Day block time periods
 */
export type DayBlockType = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';

/**
 * Represents a gap in the schedule
 */
export interface ScheduleGap {
  type: DayBlockType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  previousItem?: ItineraryItem;
  nextItem?: ItineraryItem;
}

/**
 * Day block definitions with start and end times
 */
export const DAY_BLOCKS: Array<{ type: DayBlockType; start: string; end: string }> = [
  { type: 'morning', start: '08:00', end: '11:30' },
  { type: 'lunch', start: '11:30', end: '14:00' },
  { type: 'afternoon', start: '14:00', end: '17:30' },
  { type: 'dinner', start: '17:30', end: '21:00' },
  { type: 'evening', start: '21:00', end: '23:59' },
];

/**
 * Default durations for different item types (in minutes)
 */
const DEFAULT_DURATIONS: Record<string, number> = {
  restaurant: 90,
  hotel: 60,
  bar: 60,
  cafe: 45,
  attraction: 90,
  museum: 120,
  shop: 30,
  spa: 120,
  pool: 90,
  beach: 180,
  park: 60,
  nightlife: 120,
  activity: 60,
  event: 120,
  flight: 180,
  train: 60,
  breakfast: 45,
  default: 60,
};

/**
 * Converts time string (HH:MM) to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string (HH:MM)
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Gets the duration for an itinerary item
 */
function getItemDuration(item: ItineraryItem): number {
  const notes = parseItineraryNotes(item.notes);
  if (notes?.duration) {
    return notes.duration;
  }
  const category = notes?.category || notes?.type || 'default';
  return DEFAULT_DURATIONS[category] || DEFAULT_DURATIONS.default;
}

/**
 * Gets the end time for an itinerary item
 */
function getItemEndTime(item: ItineraryItem): string | null {
  if (!item.time) return null;
  const startMinutes = timeToMinutes(item.time);
  const duration = getItemDuration(item);
  return minutesToTime(startMinutes + duration);
}

/**
 * Determines which day block a time falls into
 */
function getBlockForTime(time: string): DayBlockType {
  const minutes = timeToMinutes(time);
  for (const block of DAY_BLOCKS) {
    const blockStart = timeToMinutes(block.start);
    const blockEnd = timeToMinutes(block.end);
    if (minutes >= blockStart && minutes < blockEnd) {
      return block.type;
    }
  }
  // Default to evening for late times
  return 'evening';
}

/**
 * Analyzes a day's schedule and finds all gaps longer than 60 minutes
 * @param items - Array of itinerary items for a single day
 * @returns Array of schedule gaps sorted by start time
 */
export function analyzeScheduleGaps(items: ItineraryItem[]): ScheduleGap[] {
  const gaps: ScheduleGap[] = [];
  const MIN_GAP_MINUTES = 60;

  // Filter items with valid times and sort by time
  const scheduledItems = items
    .filter((item) => item.time)
    .sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));

  // Day starts at 08:00 and ends at 23:59
  const dayStartMinutes = timeToMinutes('08:00');
  const dayEndMinutes = timeToMinutes('23:59');

  // Check gap at start of day (before first item)
  if (scheduledItems.length === 0) {
    // Entire day is free - return gaps for each block
    for (const block of DAY_BLOCKS) {
      const blockStart = timeToMinutes(block.start);
      const blockEnd = timeToMinutes(block.end);
      const duration = blockEnd - blockStart;
      if (duration >= MIN_GAP_MINUTES) {
        gaps.push({
          type: block.type,
          startTime: block.start,
          endTime: block.end,
          durationMinutes: duration,
        });
      }
    }
    return gaps;
  }

  // Check gap before first item
  const firstItemStart = timeToMinutes(scheduledItems[0].time!);
  if (firstItemStart > dayStartMinutes) {
    const gapDuration = firstItemStart - dayStartMinutes;
    if (gapDuration >= MIN_GAP_MINUTES) {
      const gapStartTime = minutesToTime(dayStartMinutes);
      gaps.push({
        type: getBlockForTime(gapStartTime),
        startTime: gapStartTime,
        endTime: scheduledItems[0].time!,
        durationMinutes: gapDuration,
        nextItem: scheduledItems[0],
      });
    }
  }

  // Check gaps between items
  for (let i = 0; i < scheduledItems.length - 1; i++) {
    const currentItem = scheduledItems[i];
    const nextItem = scheduledItems[i + 1];

    const currentEndTime = getItemEndTime(currentItem);
    if (!currentEndTime) continue;

    const currentEndMinutes = timeToMinutes(currentEndTime);
    const nextStartMinutes = timeToMinutes(nextItem.time!);

    const gapDuration = nextStartMinutes - currentEndMinutes;
    if (gapDuration >= MIN_GAP_MINUTES) {
      gaps.push({
        type: getBlockForTime(currentEndTime),
        startTime: currentEndTime,
        endTime: nextItem.time!,
        durationMinutes: gapDuration,
        previousItem: currentItem,
        nextItem: nextItem,
      });
    }
  }

  // Check gap after last item
  const lastItem = scheduledItems[scheduledItems.length - 1];
  const lastItemEnd = getItemEndTime(lastItem);
  if (lastItemEnd) {
    const lastItemEndMinutes = timeToMinutes(lastItemEnd);
    if (lastItemEndMinutes < dayEndMinutes) {
      const gapDuration = dayEndMinutes - lastItemEndMinutes;
      if (gapDuration >= MIN_GAP_MINUTES) {
        gaps.push({
          type: getBlockForTime(lastItemEnd),
          startTime: lastItemEnd,
          endTime: '23:59',
          durationMinutes: gapDuration,
          previousItem: lastItem,
        });
      }
    }
  }

  return gaps;
}

/**
 * Checks if a specific time slot is free in the schedule
 * @param items - Array of itinerary items for a single day
 * @param time - Start time to check (HH:MM format)
 * @param durationMinutes - Duration needed in minutes
 * @returns True if the slot is completely free
 */
export function isTimeSlotFree(
  items: ItineraryItem[],
  time: string,
  durationMinutes: number
): boolean {
  const slotStart = timeToMinutes(time);
  const slotEnd = slotStart + durationMinutes;

  // Filter items with valid times
  const scheduledItems = items.filter((item) => item.time);

  for (const item of scheduledItems) {
    const itemStart = timeToMinutes(item.time!);
    const itemEnd = itemStart + getItemDuration(item);

    // Check for overlap
    // Overlap exists if: slotStart < itemEnd AND slotEnd > itemStart
    if (slotStart < itemEnd && slotEnd > itemStart) {
      return false;
    }
  }

  return true;
}

/**
 * Finds the next available time slot in the schedule
 * @param items - Array of itinerary items for a single day
 * @param afterTime - Optional time to start searching from (defaults to 08:00)
 * @returns Object with the next available time and its day block type
 */
export function findNextAvailableSlot(
  items: ItineraryItem[],
  afterTime?: string
): { time: string; type: DayBlockType } {
  const searchStart = afterTime ? timeToMinutes(afterTime) : timeToMinutes('08:00');
  const dayEnd = timeToMinutes('23:59');
  const DEFAULT_SLOT_DURATION = 60; // Look for 60-minute slots

  // Filter and sort items by time
  const scheduledItems = items
    .filter((item) => item.time)
    .sort((a, b) => timeToMinutes(a.time!) - timeToMinutes(b.time!));

  // If no items, return the search start time
  if (scheduledItems.length === 0) {
    const time = minutesToTime(searchStart);
    return { time, type: getBlockForTime(time) };
  }

  // Build list of busy periods
  const busyPeriods: Array<{ start: number; end: number }> = scheduledItems.map((item) => ({
    start: timeToMinutes(item.time!),
    end: timeToMinutes(item.time!) + getItemDuration(item),
  }));

  // Sort busy periods by start time
  busyPeriods.sort((a, b) => a.start - b.start);

  // Check if time before first busy period works
  if (busyPeriods[0].start >= searchStart + DEFAULT_SLOT_DURATION) {
    const time = minutesToTime(searchStart);
    return { time, type: getBlockForTime(time) };
  }

  // Check gaps between busy periods
  for (let i = 0; i < busyPeriods.length - 1; i++) {
    const gapStart = Math.max(busyPeriods[i].end, searchStart);
    const gapEnd = busyPeriods[i + 1].start;

    if (gapEnd - gapStart >= DEFAULT_SLOT_DURATION) {
      const time = minutesToTime(gapStart);
      return { time, type: getBlockForTime(time) };
    }
  }

  // Check after last busy period
  const lastEnd = busyPeriods[busyPeriods.length - 1].end;
  const checkTime = Math.max(lastEnd, searchStart);
  if (dayEnd - checkTime >= DEFAULT_SLOT_DURATION) {
    const time = minutesToTime(checkTime);
    return { time, type: getBlockForTime(time) };
  }

  // Fallback: return search start time (may overlap)
  const time = minutesToTime(searchStart);
  return { time, type: getBlockForTime(time) };
}

/**
 * Gets a suggested time for a given category and optional subtype
 * @param category - The type of place/activity
 * @param subtype - Optional subtype (e.g., 'lunch' or 'dinner' for restaurant)
 * @returns Suggested time in HH:MM format
 */
export function getSuggestedTime(category: CardType, subtype?: string): string {
  // Handle restaurant with meal types
  if (category === 'restaurant') {
    if (subtype === 'lunch') return '12:30';
    if (subtype === 'dinner') return '19:30';
    if (subtype === 'breakfast') return '08:30';
    // Default restaurant time (dinner)
    return '19:30';
  }

  // Specific category suggestions
  const suggestions: Record<CardType, string> = {
    breakfast: '08:00',
    cafe: '10:00',
    restaurant: '19:30',
    bar: '21:00',
    nightlife: '22:00',
    hotel: '15:00', // Check-in time
    attraction: '10:00',
    museum: '10:30',
    shop: '14:00',
    spa: '11:00',
    pool: '15:00',
    beach: '11:00',
    park: '09:00',
    activity: '10:00',
    event: '19:00',
    flight: '10:00',
    train: '10:00',
  };

  return suggestions[category] || '10:00';
}
