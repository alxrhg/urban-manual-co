/**
 * Time Calculation Utilities for Trip Editor
 * Helpers for date/time calculations and recalculations
 */

/**
 * Calculate number of days between two dates
 */
export function calculateTripDays(start: string | null, end: string | null): number {
  if (!start) return 1;
  if (!end) return 1;

  const startDate = parseDateString(start);
  const endDate = parseDateString(end);

  if (!startDate || !endDate) return 1;

  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Parse a date string (YYYY-MM-DD) to Date object
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

/**
 * Add days to a date string and return new date string
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  if (!date) return dateStr;

  date.setDate(date.getDate() + days);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  if (!time) return 0;

  const [hours, mins] = time.split(':').map(Number);
  return (hours || 0) * 60 + (mins || 0);
}

/**
 * Format minutes since midnight to HH:MM
 */
export function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);

  if (endMins < startMins) {
    // Handles overnight
    return (24 * 60 - startMins) + endMins;
  }

  return endMins - startMins;
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Estimate activity duration based on category
 */
export function estimateDuration(category?: string): number {
  const durations: Record<string, number> = {
    restaurant: 90,
    cafe: 45,
    bar: 60,
    museum: 120,
    gallery: 60,
    park: 60,
    beach: 180,
    landmark: 45,
    shopping: 90,
    spa: 120,
    hotel: 30, // Check-in time
    default: 60,
  };

  if (!category) return durations.default;

  const lowerCategory = category.toLowerCase();

  for (const [key, duration] of Object.entries(durations)) {
    if (lowerCategory.includes(key)) {
      return duration;
    }
  }

  return durations.default;
}

interface TimelineItem {
  id: string;
  time?: string | null;
  durationMinutes?: number;
  category?: string;
}

/**
 * Recalculate times for a day's items based on order and estimated durations
 * Respects locked times (items with existing times)
 */
export function recalculateDayTimes(
  items: TimelineItem[],
  startTime: string = '09:00',
  bufferMinutes: number = 15
): { id: string; time: string; endTime: string }[] {
  let currentMinutes = parseTimeToMinutes(startTime);
  const results: { id: string; time: string; endTime: string }[] = [];

  for (const item of items) {
    // If item has a set time, use it and adjust current position
    if (item.time) {
      currentMinutes = parseTimeToMinutes(item.time);
    }

    const duration = item.durationMinutes || estimateDuration(item.category);
    const endMinutes = currentMinutes + duration;

    results.push({
      id: item.id,
      time: formatMinutesToTime(currentMinutes),
      endTime: formatMinutesToTime(endMinutes),
    });

    // Move current time forward
    currentMinutes = endMinutes + bufferMinutes;
  }

  return results;
}

/**
 * Get time of day label (Morning, Afternoon, Evening)
 */
export function getTimeOfDay(time: string): 'morning' | 'afternoon' | 'evening' {
  const minutes = parseTimeToMinutes(time);

  if (minutes < 12 * 60) return 'morning';
  if (minutes < 17 * 60) return 'afternoon';
  return 'evening';
}

/**
 * Format time for display (12-hour format)
 */
export function formatTimeDisplay(time: string): string {
  if (!time) return '';

  const [hours, mins] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;

  if (mins === 0) {
    return `${displayHours} ${period}`;
  }

  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if two time ranges overlap
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);

  return s1 < e2 && s2 < e1;
}

/**
 * Calculate which day number a given date falls on relative to trip start date
 * Returns the day number (1-indexed) or null if outside trip range
 */
export function calculateDayNumberFromDate(
  tripStartDate: string | null,
  tripEndDate: string | null,
  targetDate: string | null
): number | null {
  if (!tripStartDate || !targetDate) return null;

  const start = parseDateString(tripStartDate);
  const target = parseDateString(targetDate);

  if (!start || !target) return null;

  // Calculate difference in days
  const diffMs = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Day number is 1-indexed
  const dayNumber = diffDays + 1;

  // Check if within trip bounds
  if (dayNumber < 1) return null;

  if (tripEndDate) {
    const totalDays = calculateTripDays(tripStartDate, tripEndDate);
    if (dayNumber > totalDays) return null;
  }

  return dayNumber;
}
