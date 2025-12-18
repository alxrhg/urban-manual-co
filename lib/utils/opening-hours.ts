/**
 * Utility functions for checking if destinations are open now
 * Uses timezone_id, utc_offset, or city mapping for accurate timezone handling
 */

import { CITY_TIMEZONES } from '@/lib/constants';

/**
 * Get current time in destination's timezone
 */
function getCurrentTimeInTimezone(
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): Date {
  // Best: Use timezone_id from Google Places API (handles DST automatically)
  if (timezoneId) {
    try {
      const utcNow = new Date();
      const localString = utcNow.toLocaleString('en-US', { timeZone: timezoneId });
      return new Date(localString);
    } catch (error) {
      console.warn(`Invalid timezone_id: ${timezoneId}, falling back`, error);
    }
  }

  // Good: Use city timezone mapping
  const cityKey = city.toLowerCase().replace(/\s+/g, '-');
  if (CITY_TIMEZONES[cityKey]) {
    try {
      const utcNow = new Date();
      const localString = utcNow.toLocaleString('en-US', { timeZone: CITY_TIMEZONES[cityKey] });
      return new Date(localString);
    } catch (error) {
      console.warn(`Error using city timezone for ${cityKey}`, error);
    }
  }

  // Okay: Use UTC offset (static, doesn't handle DST)
  // We need getHours()/getDay() to return destination's local time
  // Calculate: UTC time + user's offset (to get "raw" time) + dest offset
  if (utcOffset !== null && utcOffset !== undefined) {
    const now = new Date();
    // now.getTimezoneOffset() returns minutes BEHIND UTC (positive for west of UTC)
    // utcOffset is minutes AHEAD of UTC (positive for east of UTC)
    const userOffsetMs = now.getTimezoneOffset() * 60000;
    const destOffsetMs = utcOffset * 60000;
    // This creates a Date where getHours()/getDay() returns destination's local values
    const destTimeMs = now.getTime() + userOffsetMs + destOffsetMs;
    return new Date(destTimeMs);
  }

  // Fallback: Use UTC (better than user's local time for consistency)
  const now = new Date();
  const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
  return new Date(utcString);
}

/**
 * Parse time string (e.g., "10:30 AM") to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match || !match[1] || !match[2] || !match[3]) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
}

/**
 * Check if destination is closed on a specific day of the week
 * @param openingHours - The opening_hours_json from destination
 * @param dayOfWeek - Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns Object with isClosed boolean and reason string
 */
export function isClosedOnDay(
  openingHours: unknown,
  dayOfWeek: number
): { isClosed: boolean; reason?: string } {
  // Handle both opening_hours (normalized) and opening_hours_json (from database)
  let hours = openingHours;

  // If it's a string, try to parse it
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      return { isClosed: false }; // Can't determine, assume open
    }
  }

  if (!hours || typeof hours !== 'object') {
    return { isClosed: false }; // No data, can't determine
  }

  const hoursObj = hours as Record<string, unknown>;

  if (!hoursObj.weekday_text || !Array.isArray(hoursObj.weekday_text)) {
    return { isClosed: false }; // No weekday data
  }

  try {
    // Google Places API weekday_text starts with Monday (index 0)
    // Convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayText = hoursObj.weekday_text[googleDayIndex] as string;

    if (!dayText) {
      return { isClosed: false };
    }

    // Extract hours part (after "Day: ")
    const hoursText = dayText.substring(dayText.indexOf(':') + 1).trim().toLowerCase();

    if (hoursText.includes('closed')) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return {
        isClosed: true,
        reason: `Closed on ${dayNames[dayOfWeek]}s`
      };
    }

    return { isClosed: false };
  } catch (error) {
    console.error('Error checking closure day:', error);
    return { isClosed: false };
  }
}

/**
 * Get opening hours text for a specific day
 * @param openingHours - The opening_hours_json from destination
 * @param dayOfWeek - Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns The hours text for that day (e.g., "10:00 AM – 5:00 PM" or "Closed")
 */
export function getHoursForDay(
  openingHours: unknown,
  dayOfWeek: number
): string | null {
  let hours = openingHours;

  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      return null;
    }
  }

  if (!hours || typeof hours !== 'object') {
    return null;
  }

  const hoursObj = hours as Record<string, unknown>;

  if (!hoursObj.weekday_text || !Array.isArray(hoursObj.weekday_text)) {
    return null;
  }

  try {
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayText = hoursObj.weekday_text[googleDayIndex] as string;

    if (!dayText) {
      return null;
    }

    return dayText.substring(dayText.indexOf(':') + 1).trim();
  } catch {
    return null;
  }
}

/**
 * Check if destination is open now based on opening hours and timezone
 */
export function isOpenNow(
  openingHours: any,
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): boolean {
  // Handle both opening_hours (normalized) and opening_hours_json (from database)
  let hours = openingHours;
  
  // If it's a string, try to parse it
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      return false;
    }
  }

  if (!hours || !hours.weekday_text || !Array.isArray(hours.weekday_text)) {
    return false;
  }

  try {
    // Get current time in destination's timezone
    const now = getCurrentTimeInTimezone(city, timezoneId, utcOffset);
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Google Places API weekday_text starts with Monday (index 0)
    // Convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayText = hours.weekday_text[googleDayIndex];

    if (!todayText) return false;

    const hoursText = todayText.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText || hoursText.toLowerCase().includes('closed')) {
      return false;
    }

    if (hoursText.toLowerCase().includes('24 hours') || hoursText.toLowerCase().includes('open 24 hours')) {
      return true;
    }

    // Parse time ranges (e.g., "10:00 AM – 9:00 PM" or "10:00 AM – 2:00 PM, 5:00 PM – 9:00 PM")
    const timeRanges = hoursText.split(',').map((range: string) => range.trim());
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        const closeTime = parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking if open now:', error);
    return false;
  }
}

