/**
 * Schedule Analyzer - Detects timing conflicts and provides time-aware warnings
 */

import type { PlannerWarning } from './types';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';

// =============================================================================
// Schedule Gap Detection Types
// =============================================================================

export type SlotType = 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';

export interface ScheduleGap {
  type: SlotType;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  duration: number; // minutes
  previousItem?: ItineraryItem;
  nextItem?: ItineraryItem;
  /** Suggested activity types for this slot */
  suggestedTypes?: string[];
}

export interface DaySlotStructure {
  type: SlotType;
  start: string;
  end: string;
  /** Typical activities for this slot */
  typicalActivities: string[];
}

/** Default day structure with typical time slots */
export const DEFAULT_DAY_STRUCTURE: DaySlotStructure[] = [
  { type: 'morning', start: '08:00', end: '11:00', typicalActivities: ['museum', 'gallery', 'landmark', 'cafe', 'market'] },
  { type: 'lunch', start: '11:30', end: '14:00', typicalActivities: ['restaurant', 'cafe', 'market', 'food-hall'] },
  { type: 'afternoon', start: '14:00', end: '17:00', typicalActivities: ['museum', 'gallery', 'attraction', 'shop', 'park'] },
  { type: 'dinner', start: '18:00', end: '21:00', typicalActivities: ['restaurant', 'bar', 'food-hall'] },
  { type: 'evening', start: '21:00', end: '23:00', typicalActivities: ['bar', 'concert', 'show', 'nightlife'] },
];

// =============================================================================
// Schedule Item Types (internal)
// =============================================================================

interface ScheduleItem {
  id: string;
  title: string;
  dayNumber: number;
  time?: string | null;
  duration?: number;
  category?: string;
  parsedNotes?: {
    type?: string;
    category?: string;
    departureTime?: string;
    arrivalTime?: string;
  };
}

// Typical operating hours by category
const OPERATING_HOURS: Record<string, { open: number; close: number; lastEntry?: number }> = {
  museum: { open: 10, close: 18, lastEntry: 17 },
  gallery: { open: 10, close: 18, lastEntry: 17 },
  landmark: { open: 9, close: 18 },
  attraction: { open: 9, close: 20 },
  restaurant: { open: 12, close: 23 },
  cafe: { open: 7, close: 19 },
  bar: { open: 17, close: 2 },
  shop: { open: 10, close: 20 },
  market: { open: 8, close: 14 },
  park: { open: 6, close: 22 },
};

// Typical duration by category (minutes)
const TYPICAL_DURATION: Record<string, number> = {
  museum: 120,
  gallery: 90,
  restaurant: 90,
  cafe: 45,
  bar: 60,
  landmark: 45,
  attraction: 90,
  shop: 30,
  market: 60,
};

function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours)) return null;
  return hours + (minutes || 0) / 60;
}

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/**
 * Analyze schedule for time-aware warnings
 */
export function analyzeScheduleForWarnings(items: ScheduleItem[]): PlannerWarning[] {
  const warnings: PlannerWarning[] = [];

  items.forEach((item) => {
    const category = (item.parsedNotes?.category || item.category || '').toLowerCase();
    const scheduledTime = parseTime(item.time);

    if (!scheduledTime) return;

    // Find operating hours for this category
    let hours: { open: number; close: number; lastEntry?: number } | undefined;
    for (const [key, value] of Object.entries(OPERATING_HOURS)) {
      if (category.includes(key)) {
        hours = value;
        break;
      }
    }

    if (!hours) return;

    const duration = item.duration || TYPICAL_DURATION[category] || 60;
    const endTime = scheduledTime + duration / 60;
    const lastEntry = hours.lastEntry || hours.close - 0.5;

    // Warning: Scheduled after closing
    if (scheduledTime >= hours.close) {
      warnings.push({
        id: `closed-${item.id}`,
        type: 'timing',
        severity: 'high',
        message: `${item.title} is likely closed at ${formatHour(scheduledTime)}`,
        suggestion: `Most ${category}s close by ${formatHour(hours.close)}. Consider visiting earlier.`,
        blockId: item.id,
      });
    }
    // Warning: Scheduled before opening
    else if (scheduledTime < hours.open) {
      warnings.push({
        id: `not-open-${item.id}`,
        type: 'timing',
        severity: 'medium',
        message: `${item.title} may not be open at ${formatHour(scheduledTime)}`,
        suggestion: `Most ${category}s open around ${formatHour(hours.open)}.`,
        blockId: item.id,
      });
    }
    // Warning: Won't have enough time before closing
    else if (endTime > hours.close) {
      const availableMinutes = Math.round((hours.close - scheduledTime) * 60);
      warnings.push({
        id: `closing-soon-${item.id}`,
        type: 'timing',
        severity: 'medium',
        message: `${item.title} closes in ~${availableMinutes} min after your arrival`,
        suggestion: `Visit earlier or plan for a shorter visit. Closes at ${formatHour(hours.close)}.`,
        blockId: item.id,
      });
    }
    // Warning: After last entry time
    else if (scheduledTime >= lastEntry && lastEntry !== hours.close) {
      warnings.push({
        id: `last-entry-${item.id}`,
        type: 'timing',
        severity: 'low',
        message: `Last entry at ${item.title} is typically ${formatHour(lastEntry)}`,
        suggestion: `Your ${formatHour(scheduledTime)} arrival may be past last entry.`,
        blockId: item.id,
      });
    }
  });

  return warnings;
}

/**
 * Detect overlapping bookings and conflicts
 */
export function detectConflicts(items: ScheduleItem[]): PlannerWarning[] {
  const warnings: PlannerWarning[] = [];

  // Group items by day
  const itemsByDay: Record<number, ScheduleItem[]> = {};
  items.forEach(item => {
    if (!itemsByDay[item.dayNumber]) {
      itemsByDay[item.dayNumber] = [];
    }
    itemsByDay[item.dayNumber].push(item);
  });

  // Check each day for conflicts
  Object.entries(itemsByDay).forEach(([dayNum, dayItems]) => {
    const sortedItems = dayItems
      .filter(item => item.time)
      .sort((a, b) => {
        const timeA = parseTime(a.time) || 0;
        const timeB = parseTime(b.time) || 0;
        return timeA - timeB;
      });

    for (let i = 0; i < sortedItems.length - 1; i++) {
      const current = sortedItems[i];
      const next = sortedItems[i + 1];

      const currentStart = parseTime(current.time);
      const nextStart = parseTime(next.time);

      if (currentStart === null || nextStart === null) continue;

      const category = (current.parsedNotes?.category || current.category || '').toLowerCase();
      const currentDuration = current.duration || TYPICAL_DURATION[category] || 60;
      const currentEnd = currentStart + currentDuration / 60;

      // Check for overlap
      if (currentEnd > nextStart) {
        const overlapMinutes = Math.round((currentEnd - nextStart) * 60);
        warnings.push({
          id: `overlap-${current.id}-${next.id}`,
          type: 'timing',
          severity: 'high',
          message: `${current.title} and ${next.title} overlap by ~${overlapMinutes} min`,
          suggestion: `Adjust times or reduce duration at ${current.title}.`,
          blockId: current.id,
        });
      }
      // Check for very tight schedule
      else if (currentEnd > nextStart - 0.25) { // Less than 15 min gap
        warnings.push({
          id: `tight-${current.id}-${next.id}`,
          type: 'timing',
          severity: 'low',
          message: `Very tight transition from ${current.title} to ${next.title}`,
          suggestion: `Consider adding buffer time for travel.`,
          blockId: current.id,
        });
      }
    }
  });

  return warnings;
}

/**
 * Check for common closure days
 */
export function checkClosureDays(items: ScheduleItem[], tripStartDate?: string): PlannerWarning[] {
  const warnings: PlannerWarning[] = [];

  if (!tripStartDate) return warnings;

  // Common closure patterns
  const CLOSURE_PATTERNS: Record<string, number[]> = {
    museum: [1], // Many museums close Monday
    gallery: [1], // Galleries often close Monday
  };

  items.forEach(item => {
    const category = (item.parsedNotes?.category || item.category || '').toLowerCase();

    let closureDays: number[] | undefined;
    for (const [key, days] of Object.entries(CLOSURE_PATTERNS)) {
      if (category.includes(key)) {
        closureDays = days;
        break;
      }
    }

    if (!closureDays) return;

    // Calculate the day of week for this item
    try {
      const startDate = new Date(tripStartDate);
      const itemDate = new Date(startDate);
      itemDate.setDate(startDate.getDate() + item.dayNumber - 1);
      const dayOfWeek = itemDate.getDay();

      if (closureDays.includes(dayOfWeek)) {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
        warnings.push({
          id: `closure-day-${item.id}`,
          type: 'timing',
          severity: 'medium',
          message: `${item.title} may be closed on ${dayName}`,
          suggestion: `Many ${category}s close on ${dayName}. Verify opening hours.`,
          blockId: item.id,
        });
      }
    } catch {
      // Invalid date, skip
    }
  });

  return warnings;
}

// =============================================================================
// Smart Slot Detection Functions
// =============================================================================

/**
 * Parse time string to minutes since midnight for comparison
 */
function parseTimeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours)) return null;
  return hours * 60 + (minutes || 0);
}

/**
 * Format minutes since midnight back to HH:MM
 */
function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Calculate duration in minutes between two time strings
 */
function calculateDuration(startTime: string, endTime: string): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (startMinutes === null || endMinutes === null) return 0;
  return endMinutes - startMinutes;
}

/**
 * Check if a time falls within a given range
 */
function isTimeInRange(time: string | null | undefined, rangeStart: string, rangeEnd: string): boolean {
  const timeMinutes = parseTimeToMinutes(time);
  const startMinutes = parseTimeToMinutes(rangeStart);
  const endMinutes = parseTimeToMinutes(rangeEnd);

  if (timeMinutes === null || startMinutes === null || endMinutes === null) return false;

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Check if two time ranges overlap
 */
function doRangesOverlap(
  range1Start: string,
  range1End: string,
  range2Start: string,
  range2End: string
): boolean {
  const r1Start = parseTimeToMinutes(range1Start);
  const r1End = parseTimeToMinutes(range1End);
  const r2Start = parseTimeToMinutes(range2Start);
  const r2End = parseTimeToMinutes(range2End);

  if (r1Start === null || r1End === null || r2Start === null || r2End === null) return false;

  return r1Start < r2End && r1End > r2Start;
}

/**
 * Get the end time of an itinerary item based on start time and duration
 */
function getItemEndTime(item: ItineraryItem): string | null {
  if (!item.time) return null;

  // Try to get duration from parsed notes
  let duration = TYPICAL_DURATION['activity'] || 60; // default 60 min

  if (item.notes) {
    try {
      const parsed = JSON.parse(item.notes) as ItineraryItemNotes;
      if (parsed.duration) {
        duration = parsed.duration;
      } else if (parsed.category) {
        duration = TYPICAL_DURATION[parsed.category.toLowerCase()] || 60;
      } else if (parsed.endTime) {
        return parsed.endTime;
      }
    } catch {
      // Use default duration
    }
  }

  const startMinutes = parseTimeToMinutes(item.time);
  if (startMinutes === null) return null;

  return formatMinutesToTime(startMinutes + duration);
}

interface ScheduleGapOptions {
  /** Custom day structure (defaults to DEFAULT_DAY_STRUCTURE) */
  dayStructure?: DaySlotStructure[];
  /** Minimum gap duration to report (in minutes, default 30) */
  minGapDuration?: number;
  /** Include partial gaps where some time is free but not the entire slot */
  includePartialGaps?: boolean;
}

/**
 * Analyze an itinerary day for unscheduled time slots (gaps)
 *
 * @param items - Itinerary items for a single day (must be pre-filtered by day)
 * @param options - Configuration options
 * @returns Array of schedule gaps with timing and context
 *
 * @example
 * const dayItems = items.filter(i => i.day === 1);
 * const gaps = analyzeScheduleGaps(dayItems);
 * // Returns gaps like: { type: 'lunch', startTime: '11:30', endTime: '14:00', ... }
 */
export function analyzeScheduleGaps(
  items: ItineraryItem[],
  options: ScheduleGapOptions = {}
): ScheduleGap[] {
  const {
    dayStructure = DEFAULT_DAY_STRUCTURE,
    minGapDuration = 30,
    includePartialGaps = true,
  } = options;

  const gaps: ScheduleGap[] = [];

  // Sort items by time
  const sortedItems = [...items]
    .filter(item => item.time)
    .sort((a, b) => {
      const timeA = parseTimeToMinutes(a.time) || 0;
      const timeB = parseTimeToMinutes(b.time) || 0;
      return timeA - timeB;
    });

  // Analyze each time slot in the day structure
  for (const slot of dayStructure) {
    // Find items that overlap with this slot
    const itemsInSlot = sortedItems.filter(item => {
      const itemStart = item.time;
      const itemEnd = getItemEndTime(item);

      if (!itemStart || !itemEnd) {
        // If no end time, just check if start time is in range
        return isTimeInRange(itemStart, slot.start, slot.end);
      }

      // Check if item overlaps with slot
      return doRangesOverlap(itemStart, itemEnd, slot.start, slot.end);
    });

    if (itemsInSlot.length === 0) {
      // Entire slot is empty
      const duration = calculateDuration(slot.start, slot.end);

      if (duration >= minGapDuration) {
        // Find surrounding items for context
        const slotStartMinutes = parseTimeToMinutes(slot.start) || 0;
        const slotEndMinutes = parseTimeToMinutes(slot.end) || 0;

        const previousItem = sortedItems
          .filter(item => {
            const endTime = getItemEndTime(item);
            const endMinutes = parseTimeToMinutes(endTime);
            return endMinutes !== null && endMinutes <= slotStartMinutes;
          })
          .pop();

        const nextItem = sortedItems.find(item => {
          const startMinutes = parseTimeToMinutes(item.time);
          return startMinutes !== null && startMinutes >= slotEndMinutes;
        });

        gaps.push({
          type: slot.type,
          startTime: slot.start,
          endTime: slot.end,
          duration,
          previousItem,
          nextItem,
          suggestedTypes: slot.typicalActivities,
        });
      }
    } else if (includePartialGaps) {
      // Check for partial gaps within the slot
      const slotStartMinutes = parseTimeToMinutes(slot.start) || 0;
      const slotEndMinutes = parseTimeToMinutes(slot.end) || 0;

      // Find the earliest item start and latest item end within this slot
      let earliestItemStart = slotEndMinutes;
      let latestItemEnd = slotStartMinutes;

      for (const item of itemsInSlot) {
        const itemStartMinutes = parseTimeToMinutes(item.time) || slotEndMinutes;
        const itemEndTime = getItemEndTime(item);
        const itemEndMinutes = parseTimeToMinutes(itemEndTime) || itemStartMinutes + 60;

        if (itemStartMinutes < earliestItemStart) {
          earliestItemStart = itemStartMinutes;
        }
        if (itemEndMinutes > latestItemEnd) {
          latestItemEnd = itemEndMinutes;
        }
      }

      // Check for gap at the beginning of the slot
      if (earliestItemStart > slotStartMinutes) {
        const gapDuration = earliestItemStart - slotStartMinutes;
        if (gapDuration >= minGapDuration) {
          const previousItem = sortedItems
            .filter(item => {
              const endTime = getItemEndTime(item);
              const endMinutes = parseTimeToMinutes(endTime);
              return endMinutes !== null && endMinutes <= slotStartMinutes;
            })
            .pop();

          gaps.push({
            type: slot.type,
            startTime: slot.start,
            endTime: formatMinutesToTime(earliestItemStart),
            duration: gapDuration,
            previousItem,
            nextItem: itemsInSlot[0],
            suggestedTypes: slot.typicalActivities,
          });
        }
      }

      // Check for gap at the end of the slot
      if (latestItemEnd < slotEndMinutes) {
        const gapDuration = slotEndMinutes - latestItemEnd;
        if (gapDuration >= minGapDuration) {
          const nextItem = sortedItems.find(item => {
            const startMinutes = parseTimeToMinutes(item.time);
            return startMinutes !== null && startMinutes >= slotEndMinutes;
          });

          gaps.push({
            type: slot.type,
            startTime: formatMinutesToTime(latestItemEnd),
            endTime: slot.end,
            duration: gapDuration,
            previousItem: itemsInSlot[itemsInSlot.length - 1],
            nextItem,
            suggestedTypes: slot.typicalActivities,
          });
        }
      }
    }
  }

  return gaps;
}

/**
 * Analyze all days in a trip for schedule gaps
 *
 * @param items - All itinerary items for the trip
 * @param options - Configuration options
 * @returns Map of day number to gaps for that day
 */
export function analyzeScheduleGapsByDay(
  items: ItineraryItem[],
  options: ScheduleGapOptions = {}
): Map<number, ScheduleGap[]> {
  const gapsByDay = new Map<number, ScheduleGap[]>();

  // Group items by day
  const itemsByDay: Record<number, ItineraryItem[]> = {};
  items.forEach(item => {
    if (!itemsByDay[item.day]) {
      itemsByDay[item.day] = [];
    }
    itemsByDay[item.day].push(item);
  });

  // Analyze each day
  for (const [dayNum, dayItems] of Object.entries(itemsByDay)) {
    const gaps = analyzeScheduleGaps(dayItems, options);
    gapsByDay.set(Number(dayNum), gaps);
  }

  return gapsByDay;
}

/**
 * Get a summary of available slots across all days
 * Useful for quick UI display or smart suggestions
 */
export function getAvailableSlotSummary(
  items: ItineraryItem[],
  options: ScheduleGapOptions = {}
): {
  totalGaps: number;
  gapsByType: Record<SlotType, number>;
  mostOpenDay: number | null;
  leastOpenDay: number | null;
} {
  const gapsByDay = analyzeScheduleGapsByDay(items, options);

  let totalGaps = 0;
  const gapsByType: Record<SlotType, number> = {
    morning: 0,
    lunch: 0,
    afternoon: 0,
    dinner: 0,
    evening: 0,
  };

  let mostOpenDay: number | null = null;
  let leastOpenDay: number | null = null;
  let maxGaps = -1;
  let minGaps = Infinity;

  for (const [dayNum, gaps] of gapsByDay) {
    totalGaps += gaps.length;

    for (const gap of gaps) {
      gapsByType[gap.type]++;
    }

    if (gaps.length > maxGaps) {
      maxGaps = gaps.length;
      mostOpenDay = dayNum;
    }
    if (gaps.length < minGaps) {
      minGaps = gaps.length;
      leastOpenDay = dayNum;
    }
  }

  return {
    totalGaps,
    gapsByType,
    mostOpenDay,
    leastOpenDay,
  };
}
