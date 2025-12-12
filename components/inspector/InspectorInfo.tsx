'use client';

import { Clock, MapPin, ChevronDown } from 'lucide-react';
import { Destination } from '@/types/destination';

/**
 * InspectorInfo - Unified info section for destination detail views
 *
 * Displays opening hours, address, and location information.
 * Used in both:
 * - Homepage floating drawer (DestinationDrawer)
 * - Trip Studio pinned right panel
 *
 * Handles timezone-aware open/closed status display.
 */

// City timezone mapping (fallback if timezone_id not available)
const CITY_TIMEZONES: Record<string, string> = {
  tokyo: 'Asia/Tokyo',
  'new-york': 'America/New_York',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  'los-angeles': 'America/Los_Angeles',
  singapore: 'Asia/Singapore',
  'hong-kong': 'Asia/Hong_Kong',
  sydney: 'Australia/Sydney',
  dubai: 'Asia/Dubai',
  bangkok: 'Asia/Bangkok',
};

export interface InspectorInfoProps {
  destination: Destination;
  /** Enriched data from Google Places API */
  enrichedData?: {
    formatted_address?: string;
    vicinity?: string;
    opening_hours?: {
      weekday_text?: string[];
    };
    current_opening_hours?: {
      weekday_text?: string[];
    };
    timezone_id?: string;
    utc_offset?: number;
    [key: string]: unknown;
  } | null;
  /** Parent destination if this is a nested venue */
  parentDestination?: Destination | null;
  /** Whether to show a compact version */
  compact?: boolean;
  /** Additional className for the container */
  className?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface OpenStatus {
  isOpen: boolean;
  currentDay?: string;
  todayHours?: string;
}

function parseTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

function getOpenStatus(
  openingHours: { weekday_text?: string[] } | undefined | null,
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): OpenStatus {
  if (!openingHours?.weekday_text) {
    return { isOpen: false };
  }

  try {
    let now: Date;

    if (timezoneId) {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: timezoneId }));
    } else if (CITY_TIMEZONES[city]) {
      now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[city] }));
    } else if (utcOffset !== null && utcOffset !== undefined) {
      const utcNow = new Date();
      now = new Date(utcNow.getTime() + utcOffset * 60 * 1000);
    } else {
      now = new Date();
    }

    const dayOfWeek = now.getDay();
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayText = openingHours.weekday_text[googleDayIndex];
    const dayName = todayText?.split(':')?.[0];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText) {
      return { isOpen: false, currentDay: dayName, todayHours: hoursText };
    }

    if (hoursText.toLowerCase().includes('closed')) {
      return { isOpen: false, currentDay: dayName, todayHours: 'Closed' };
    }

    if (
      hoursText.toLowerCase().includes('24 hours') ||
      hoursText.toLowerCase().includes('open 24 hours')
    ) {
      return { isOpen: true, currentDay: dayName, todayHours: 'Open 24 hours' };
    }

    const timeRanges = hoursText.split(',').map((range: string) => range.trim());
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        const closeTime = parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return { isOpen: true, currentDay: dayName, todayHours: hoursText };
        }
      }
    }

    return { isOpen: false, currentDay: dayName, todayHours: hoursText };
  } catch (error) {
    console.error('Error parsing opening hours:', error);
    return { isOpen: false };
  }
}

export function InspectorInfo({
  destination,
  enrichedData,
  parentDestination,
  compact = false,
  className = '',
}: InspectorInfoProps) {
  // Get opening hours from various sources
  const hours =
    enrichedData?.current_opening_hours ||
    enrichedData?.opening_hours ||
    (destination as { opening_hours_json?: { weekday_text?: string[] } }).opening_hours_json;
  const hasOpeningHours =
    hours?.weekday_text && Array.isArray(hours.weekday_text) && hours.weekday_text.length > 0;

  const openStatus = hasOpeningHours
    ? getOpenStatus(hours, destination.city, enrichedData?.timezone_id, enrichedData?.utc_offset)
    : null;

  // Determine current time for highlighting today
  let now: Date;
  if (enrichedData?.timezone_id) {
    now = new Date(new Date().toLocaleString('en-US', { timeZone: enrichedData.timezone_id }));
  } else if (CITY_TIMEZONES[destination.city]) {
    now = new Date(new Date().toLocaleString('en-US', { timeZone: CITY_TIMEZONES[destination.city] }));
  } else if (enrichedData?.utc_offset !== null && enrichedData?.utc_offset !== undefined) {
    const utcNow = new Date();
    now = new Date(utcNow.getTime() + enrichedData.utc_offset * 60 * 1000);
  } else {
    now = new Date();
  }

  const hasAddress =
    enrichedData?.formatted_address ||
    enrichedData?.vicinity ||
    destination.neighborhood ||
    destination.city ||
    destination.country;

  if (!hasOpeningHours && !hasAddress) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Opening Hours */}
      {hasOpeningHours && openStatus && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {openStatus.todayHours && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2.5 h-6 rounded-lg text-xs font-medium ${
                      openStatus.isOpen
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {openStatus.isOpen ? 'Open now' : 'Closed'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {openStatus.todayHours}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expandable hours list */}
          {hours?.weekday_text && !compact && (
            <details className="group">
              <summary className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                View all hours
              </summary>
              <div className="mt-3 space-y-2 pl-5">
                {hours.weekday_text.map((day: string, index: number) => {
                  const [dayName, hoursText] = day.split(': ');
                  const dayOfWeek = now.getDay();
                  const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  const isToday = index === googleDayIndex;

                  return (
                    <div
                      key={index}
                      className={`flex justify-between items-center text-sm ${
                        isToday
                          ? 'font-medium text-black dark:text-white'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <span className={isToday ? 'text-black dark:text-white' : ''}>{dayName}</span>
                      <span
                        className={
                          isToday ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                        }
                      >
                        {hoursText}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Address & Location */}
      {hasAddress && (
        <div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-black dark:text-white mb-2">Location</div>

              {/* Neighborhood, City, Country */}
              {((!parentDestination && destination.neighborhood) ||
                destination.city ||
                destination.country) && (
                <div className="space-y-1 mb-2">
                  {!parentDestination && destination.neighborhood && (
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {destination.neighborhood}
                    </div>
                  )}
                  {(destination.city || destination.country) && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {destination.city && capitalizeCity(destination.city)}
                      {destination.city && destination.country && ', '}
                      {destination.country}
                    </div>
                  )}
                </div>
              )}

              {/* Full Address */}
              {enrichedData?.formatted_address && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {enrichedData.formatted_address}
                </div>
              )}
              {enrichedData?.vicinity && enrichedData.vicinity !== enrichedData?.formatted_address && (
                <div className="text-xs text-gray-500 dark:text-gray-500">{enrichedData.vicinity}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InspectorInfo;
