/**
 * Utility functions for checking if destinations are open now
 * Uses timezone_id, utc_offset, or city mapping for accurate timezone handling
 */

// City timezone mapping (fallback if timezone_id not available)
const CITY_TIMEZONES: Record<string, string> = {
  'tokyo': 'Asia/Tokyo',
  'new-york': 'America/New_York',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  'singapore': 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  'sydney': 'Australia/Sydney',
  'dubai': 'Asia/Dubai',
  'bangkok': 'Asia/Bangkok',
  'seoul': 'Asia/Seoul',
  'taipei': 'Asia/Taipei',
  'osaka': 'Asia/Tokyo', // Same timezone as Tokyo
  'kyoto': 'Asia/Tokyo',
  'berlin': 'Europe/Berlin',
  'rome': 'Europe/Rome',
  'madrid': 'Europe/Madrid',
  'amsterdam': 'Europe/Amsterdam',
  'vienna': 'Europe/Vienna',
  'prague': 'Europe/Prague',
  'stockholm': 'Europe/Stockholm',
  'copenhagen': 'Europe/Copenhagen',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'jakarta': 'Asia/Jakarta',
  'manila': 'Asia/Manila',
  'kuala-lumpur': 'Asia/Kuala_Lumpur',
  'ho-chi-minh': 'Asia/Ho_Chi_Minh',
  'hanoi': 'Asia/Ho_Chi_Minh',
};

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
  if (utcOffset !== null && utcOffset !== undefined) {
    const utcNow = new Date();
    return new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
  }

  // Fallback: UTC
  return new Date();
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
 * Parse opening hours data (handles both string JSON and object formats)
 */
function parseOpeningHours(openingHours: any): any {
  if (!openingHours) return null;

  if (typeof openingHours === 'string') {
    try {
      return JSON.parse(openingHours);
    } catch {
      return null;
    }
  }

  return openingHours;
}

/**
 * Get opening hours text for a specific day of the week
 * @param openingHours - Opening hours data from Google Places API
 * @param dayOfWeek - Day of week (0 = Sunday, 1 = Monday, etc.)
 * @returns Opening hours text for that day, or null if not available
 */
export function getHoursForDayOfWeek(
  openingHours: any,
  dayOfWeek: number
): string | null {
  const hours = parseOpeningHours(openingHours);

  if (!hours?.weekday_text || !Array.isArray(hours.weekday_text)) {
    return null;
  }

  // Google Places API weekday_text starts with Monday (index 0)
  // Convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
  const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const todayText = hours.weekday_text[googleDayIndex];

  if (!todayText) return null;

  // Extract just the hours part (after the day name and colon)
  const colonIndex = todayText.indexOf(':');
  if (colonIndex === -1) return todayText;

  return todayText.substring(colonIndex + 1).trim();
}

/**
 * Check if a destination is open on a specific date
 * @param openingHours - Opening hours data from Google Places API
 * @param date - Date to check
 * @returns Object with isOpen status and hours text
 */
export function isOpenOnDate(
  openingHours: any,
  date: Date
): { isOpen: boolean; hours: string | null } {
  const hoursText = getHoursForDayOfWeek(openingHours, date.getDay());

  if (!hoursText) {
    return { isOpen: false, hours: null };
  }

  const lowerHours = hoursText.toLowerCase();

  if (lowerHours.includes('closed')) {
    return { isOpen: false, hours: 'Closed' };
  }

  if (lowerHours.includes('24 hours') || lowerHours.includes('open 24 hours')) {
    return { isOpen: true, hours: '24 hours' };
  }

  // Has valid hours, consider it open
  return { isOpen: true, hours: hoursText };
}

/**
 * Get all dates in a range (inclusive)
 */
export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get trip date range from start and end date strings
 */
export function getTripDateRange(
  startDateStr: string | null,
  endDateStr: string | null
): Date[] {
  if (!startDateStr || !endDateStr) return [];

  // Parse YYYY-MM-DD format to avoid UTC interpretation
  const parseDateString = (dateStr: string): Date | null => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  const startDate = parseDateString(startDateStr);
  const endDate = parseDateString(endDateStr);

  if (!startDate || !endDate) return [];

  return getDateRange(startDate, endDate);
}

/**
 * Format date for display (short weekday and date)
 * @example formatDateShort(date) → "Mon, Jan 15"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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

