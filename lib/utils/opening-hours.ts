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

interface TimeInfo {
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  hours: number;
  minutes: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function toTimeInfo(date: Date, useUTC = false): TimeInfo {
  return {
    dayOfWeek: useUTC ? date.getUTCDay() : date.getDay(),
    hours: useUTC ? date.getUTCHours() : date.getHours(),
    minutes: useUTC ? date.getUTCMinutes() : date.getMinutes(),
  };
}

function getTimeInfoForZone(timeZone: string): TimeInfo | null {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      hour12: false,
    });

    const parts = formatter.formatToParts(new Date());
    const map = parts.reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

    const weekdayKey = map.weekday ? map.weekday.slice(0, 3).toLowerCase() : '';
    const dayOfWeek = WEEKDAY_MAP[weekdayKey as keyof typeof WEEKDAY_MAP];
    const hours = map.hour ? parseInt(map.hour, 10) : NaN;
    const minutes = map.minute ? parseInt(map.minute, 10) : NaN;

    if (
      typeof dayOfWeek === 'number' &&
      Number.isFinite(hours) &&
      Number.isFinite(minutes)
    ) {
      return { dayOfWeek, hours, minutes };
    }

    return null;
  } catch (error) {
    console.warn(`Error resolving timezone ${timeZone}`, error);
    return null;
  }
}

/**
 * Get current time information in destination's timezone
 */
function getCurrentTimeInTimezone(
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): TimeInfo {
  // Best: Use timezone_id from Google Places API (handles DST automatically)
  if (timezoneId) {
    const info = getTimeInfoForZone(timezoneId);
    if (info) {
      return info;
    }
  }

  // Good: Use city timezone mapping
  const cityKey = city.toLowerCase().replace(/\s+/g, '-');
  const mappedZone = CITY_TIMEZONES[cityKey];
  if (mappedZone) {
    const info = getTimeInfoForZone(mappedZone);
    if (info) {
      return info;
    }
  }

  // Okay: Use UTC offset (static, doesn't handle DST)
  if (utcOffset !== null && utcOffset !== undefined) {
    const utcNow = new Date();
    const offsetDate = new Date(utcNow.getTime() + utcOffset * 60 * 1000);
    return toTimeInfo(offsetDate, true);
  }

  // Fallback: UTC/local environment
  return toTimeInfo(new Date());
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
    const dayOfWeek = now.dayOfWeek; // 0 = Sunday, 1 = Monday, etc.

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
    const currentTime = now.hours * 60 + now.minutes;

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

