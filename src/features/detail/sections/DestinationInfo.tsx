'use client';

import { useState } from 'react';
import { Clock, MapPin, Phone, Globe, ChevronDown } from 'lucide-react';
import type { Destination } from '@/types/destination';

interface DestinationInfoProps {
  destination: Destination;
  enrichedData?: {
    opening_hours?: {
      weekday_text?: string[];
    };
    formatted_address?: string;
    vicinity?: string;
    international_phone_number?: string;
    website?: string;
    timezone_id?: string;
    utc_offset?: number;
  } | null;
}

// City timezone mapping
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
};

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  openingHours: { weekday_text?: string[] } | undefined,
  city: string,
  timezoneId?: string | null,
  utcOffset?: number | null
): { isOpen: boolean; todayHours?: string } {
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
      now = new Date(utcNow.getTime() + (utcOffset * 60 * 1000));
    } else {
      now = new Date();
    }

    const dayOfWeek = now.getDay();
    const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const todayText = openingHours.weekday_text[googleDayIndex];
    const hoursText = todayText?.substring(todayText.indexOf(':') + 1).trim();

    if (!hoursText) return { isOpen: false, todayHours: hoursText };
    if (hoursText.toLowerCase().includes('closed')) return { isOpen: false, todayHours: 'Closed' };
    if (hoursText.toLowerCase().includes('24 hours')) return { isOpen: true, todayHours: 'Open 24 hours' };

    const timeRanges = hoursText.split(',').map((range: string) => range.trim());
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const range of timeRanges) {
      const times = range.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi);
      if (times && times.length >= 2) {
        const openTime = parseTime(times[0]);
        const closeTime = parseTime(times[1]);

        if (currentTime >= openTime && currentTime < closeTime) {
          return { isOpen: true, todayHours: hoursText };
        }
      }
    }

    return { isOpen: false, todayHours: hoursText };
  } catch {
    return { isOpen: false };
  }
}

function extractDomain(url: string): string {
  try {
    let cleanUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    cleanUrl = cleanUrl.split('/')[0].split('?')[0];
    return cleanUrl;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

export function DestinationInfo({ destination, enrichedData }: DestinationInfoProps) {
  const [showAllHours, setShowAllHours] = useState(false);

  const hours = enrichedData?.opening_hours;
  const openStatus = hours ? getOpenStatus(
    hours,
    destination.city,
    enrichedData?.timezone_id,
    enrichedData?.utc_offset
  ) : null;

  const address = enrichedData?.formatted_address || enrichedData?.vicinity;
  const phone = enrichedData?.international_phone_number || destination.phone_number;
  const website = enrichedData?.website || destination.website;

  const hasInfo = hours?.weekday_text || address || phone || website || destination.neighborhood;

  if (!hasInfo) return null;

  return (
    <div className="space-y-4">
      {/* Opening Hours */}
      {hours?.weekday_text && hours.weekday_text.length > 0 && openStatus && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                openStatus.isOpen
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}>
                {openStatus.isOpen ? 'Open' : 'Closed'}
              </span>
              {openStatus.todayHours && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {openStatus.todayHours}
                </span>
              )}
            </div>
          </div>

          {hours.weekday_text.length > 0 && (
            <button
              onClick={() => setShowAllHours(!showAllHours)}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ml-6"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAllHours ? 'rotate-180' : ''}`} />
              {showAllHours ? 'Hide hours' : 'See all hours'}
            </button>
          )}

          {showAllHours && (
            <div className="ml-6 space-y-1.5 pt-2">
              {hours.weekday_text.map((day, index) => {
                const [dayName, hoursText] = day.split(': ');
                const now = new Date();
                const dayOfWeek = now.getDay();
                const googleDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const isToday = index === googleDayIndex;

                return (
                  <div
                    key={index}
                    className={`flex justify-between text-sm ${
                      isToday
                        ? 'font-medium text-black dark:text-white'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span>{dayName}</span>
                    <span>{hoursText}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Address */}
      {(address || destination.neighborhood) && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {destination.neighborhood && (
              <span className="font-medium text-gray-900 dark:text-white">
                {destination.neighborhood}
              </span>
            )}
            {destination.neighborhood && address && <span className="mx-1">&middot;</span>}
            {address || (destination.city && capitalizeCity(destination.city))}
          </div>
        </div>
      )}

      {/* Phone */}
      {phone && (
        <a
          href={`tel:${phone.replace(/\s/g, '')}`}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Phone className="h-4 w-4 text-gray-400" />
          {phone}
        </a>
      )}

      {/* Website */}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Globe className="h-4 w-4 text-gray-400" />
          {extractDomain(website)}
        </a>
      )}
    </div>
  );
}
