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
          severity: 'high', // High severity when we have confirmed data
          message: `${item.title} is closed on ${dayName}s`,
          suggestion: hoursText
            ? `Opening hours show: "${hoursText}". Consider rescheduling to another day.`
            : `This venue is closed on ${dayName}s. Consider rescheduling to another day.`,
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
        severity: 'medium', // Medium severity for heuristic-based warnings
        message: `${item.title} may be closed on ${dayName}`,
        suggestion: `Many ${category}s close on ${dayName}. Verify opening hours before visiting.`,
        blockId: item.id,
      });
    }
  });

  return warnings;
}
