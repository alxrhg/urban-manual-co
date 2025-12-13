/**
 * Schedule Analyzer - Detects timing conflicts and provides time-aware warnings
 */

import type { PlannerWarning } from './types';
import { isClosedOnDay, getHoursForDay } from '@/lib/utils/opening-hours';

interface ScheduleItem {
  id: string;
  title: string;
  dayNumber: number;
  time?: string | null;
  duration?: number;
  category?: string;
  /** Opening hours data from Google Places API */
  openingHoursJson?: Record<string, unknown> | null;
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

    // Timing note: Scheduled after typical closing
    if (scheduledTime >= hours.close) {
      warnings.push({
        id: `closed-${item.id}`,
        type: 'timing',
        severity: 'medium', // Informational, not alarming
        message: `${item.title} typically closes by ${formatHour(hours.close)}`,
        suggestion: `Your ${formatHour(scheduledTime)} visit may be after hours. Consider an earlier time, or check if they have extended hours.`,
        blockId: item.id,
      });
    }
    // Timing note: Scheduled before typical opening
    else if (scheduledTime < hours.open) {
      warnings.push({
        id: `not-open-${item.id}`,
        type: 'timing',
        severity: 'low',
        message: `${item.title} typically opens around ${formatHour(hours.open)}`,
        suggestion: `Perfect if you're planning to arrive as it opens.`,
        blockId: item.id,
      });
    }
    // Timing note: Limited time before closing
    else if (endTime > hours.close) {
      const availableMinutes = Math.round((hours.close - scheduledTime) * 60);
      warnings.push({
        id: `closing-soon-${item.id}`,
        type: 'timing',
        severity: 'low',
        message: `About ${availableMinutes} min available at ${item.title}`,
        suggestion: `Arrives near closing (${formatHour(hours.close)}). Great for a focused visit.`,
        blockId: item.id,
      });
    }
    // Timing note: Near last entry time
    else if (scheduledTime >= lastEntry && lastEntry !== hours.close) {
      warnings.push({
        id: `last-entry-${item.id}`,
        type: 'timing',
        severity: 'low',
        message: `Last entry around ${formatHour(lastEntry)}`,
        suggestion: `Your timing is close to last entry—worth confirming beforehand.`,
        blockId: item.id,
      });
    }
  });

  return warnings;
}

/**
 * Detect timing considerations between scheduled items
 * Uses positive, premium language - suggestions not warnings
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

  // Check each day for timing considerations
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

      // Overlapping times - present as alternatives, not conflicts
      if (currentEnd > nextStart) {
        const overlapMinutes = Math.round((currentEnd - nextStart) * 60);
        warnings.push({
          id: `overlap-${current.id}-${next.id}`,
          type: 'timing',
          severity: 'medium', // Downgraded - overlaps are options, not errors
          message: `Overlapping options: ${current.title} and ${next.title}`,
          suggestion: `These experiences overlap by ${overlapMinutes} min. You could adjust times, or choose one as the focus.`,
          blockId: current.id,
        });
      }
      // Tight transitions - gentle suggestion
      else if (currentEnd > nextStart - 0.25) { // Less than 15 min gap
        warnings.push({
          id: `tight-${current.id}-${next.id}`,
          type: 'timing',
          severity: 'low',
          message: `Quick transition to ${next.title}`,
          suggestion: `Allow extra time if you'd like a leisurely pace between stops.`,
          blockId: current.id,
        });
      }
    }
  });

  return warnings;
}

/**
 * Check for closure days using actual opening hours data
 * Falls back to category-based heuristics if no opening hours available
 */
export function checkClosureDays(items: ScheduleItem[], tripStartDate?: string): PlannerWarning[] {
  const warnings: PlannerWarning[] = [];

  if (!tripStartDate) return warnings;

  // Fallback closure patterns (only used when no actual data available)
  const FALLBACK_CLOSURE_PATTERNS: Record<string, number[]> = {
    museum: [1], // Many museums close Monday
    gallery: [1], // Galleries often close Monday
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  items.forEach(item => {
    // Calculate the day of week for this item
    let dayOfWeek: number;
    let dayName: string;

    try {
      const startDate = new Date(tripStartDate);
      const itemDate = new Date(startDate);
      itemDate.setDate(startDate.getDate() + item.dayNumber - 1);
      dayOfWeek = itemDate.getDay();
      dayName = dayNames[dayOfWeek];
    } catch {
      // Invalid date, skip
      return;
    }

    // PRIORITY 1: Check actual opening hours data if available
    if (item.openingHoursJson) {
      const closureCheck = isClosedOnDay(item.openingHoursJson, dayOfWeek);

      if (closureCheck.isClosed) {
        const hoursText = getHoursForDay(item.openingHoursJson, dayOfWeek);
        warnings.push({
          id: `closure-day-${item.id}`,
          type: 'timing',
          severity: 'medium', // Informational - help them reschedule, don't alarm
          message: `${item.title} is closed ${dayName}s`,
          suggestion: hoursText
            ? `Their hours show "${hoursText}". Easy to move to another day.`
            : `This spot closes on ${dayName}s—worth shifting to another day.`,
          blockId: item.id,
        });
        return; // Already handled with actual data
      }
    }

    // PRIORITY 2: Fall back to category-based heuristics
    const category = (item.parsedNotes?.category || item.category || '').toLowerCase();

    let closureDays: number[] | undefined;
    for (const [key, days] of Object.entries(FALLBACK_CLOSURE_PATTERNS)) {
      if (category.includes(key)) {
        closureDays = days;
        break;
      }
    }

    if (!closureDays) return;

    if (closureDays.includes(dayOfWeek)) {
      warnings.push({
        id: `closure-day-${item.id}`,
        type: 'timing',
        severity: 'low', // Just a gentle heads-up
        message: `${dayName} closure possible`,
        suggestion: `Some ${category}s close on ${dayName}s. Worth a quick check.`,
        blockId: item.id,
      });
    }
  });

  return warnings;
}
