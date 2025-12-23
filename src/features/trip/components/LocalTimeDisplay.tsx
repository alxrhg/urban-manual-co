'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock, Globe } from 'lucide-react';

interface LocalTimeDisplayProps {
  city: string;
  latitude?: number;
  longitude?: number;
  className?: string;
  compact?: boolean;
}

// Timezone mappings for common cities (fallback when coordinates not available)
const CITY_TIMEZONES: Record<string, string> = {
  'new york': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'chicago': 'America/Chicago',
  'miami': 'America/New_York',
  'san francisco': 'America/Los_Angeles',
  'seattle': 'America/Los_Angeles',
  'boston': 'America/New_York',
  'denver': 'America/Denver',
  'london': 'Europe/London',
  'paris': 'Europe/Paris',
  'rome': 'Europe/Rome',
  'berlin': 'Europe/Berlin',
  'amsterdam': 'Europe/Amsterdam',
  'barcelona': 'Europe/Madrid',
  'madrid': 'Europe/Madrid',
  'lisbon': 'Europe/Lisbon',
  'tokyo': 'Asia/Tokyo',
  'seoul': 'Asia/Seoul',
  'singapore': 'Asia/Singapore',
  'hong kong': 'Asia/Hong_Kong',
  'shanghai': 'Asia/Shanghai',
  'beijing': 'Asia/Shanghai',
  'bangkok': 'Asia/Bangkok',
  'dubai': 'Asia/Dubai',
  'sydney': 'Australia/Sydney',
  'melbourne': 'Australia/Melbourne',
  'auckland': 'Pacific/Auckland',
  'mexico city': 'America/Mexico_City',
  'toronto': 'America/Toronto',
  'vancouver': 'America/Vancouver',
  'montreal': 'America/Montreal',
  'cape town': 'Africa/Johannesburg',
  'johannesburg': 'Africa/Johannesburg',
  'cairo': 'Africa/Cairo',
  'mumbai': 'Asia/Kolkata',
  'delhi': 'Asia/Kolkata',
  'moscow': 'Europe/Moscow',
  'istanbul': 'Europe/Istanbul',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  'sao paulo': 'America/Sao_Paulo',
  'rio de janeiro': 'America/Sao_Paulo',
};

/**
 * LocalTimeDisplay - Shows the destination's current local time
 * Uses city name to determine timezone and displays current time
 */
export default function LocalTimeDisplay({
  city,
  className = '',
  compact = false,
}: LocalTimeDisplayProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');
  const [abbreviation, setAbbreviation] = useState<string>('');

  // Get timezone from city name
  const detectedTimezone = useMemo(() => {
    if (!city) return null;
    const normalizedCity = city.toLowerCase().trim();

    // Check exact match first
    if (CITY_TIMEZONES[normalizedCity]) {
      return CITY_TIMEZONES[normalizedCity];
    }

    // Check partial match
    for (const [cityKey, tz] of Object.entries(CITY_TIMEZONES)) {
      if (normalizedCity.includes(cityKey) || cityKey.includes(normalizedCity)) {
        return tz;
      }
    }

    return null;
  }, [city]);

  // Update time every minute
  useEffect(() => {
    if (!detectedTimezone) return;

    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: detectedTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        const timeZoneFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: detectedTimezone,
          timeZoneName: 'short',
        });

        const parts = timeZoneFormatter.formatToParts(now);
        const tzAbbr = parts.find(p => p.type === 'timeZoneName')?.value || '';

        setCurrentTime(formatter.format(now));
        setAbbreviation(tzAbbr);
        setTimezone(detectedTimezone);
      } catch (error) {
        console.error('Error formatting time:', error);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [detectedTimezone]);

  if (!city || !detectedTimezone || !currentTime) {
    return null;
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 text-[12px] text-[var(--editorial-text-secondary)] ${className}`}>
        <Clock className="w-3 h-3" />
        <span>{currentTime}</span>
        <span className="text-[var(--editorial-text-tertiary)]">{abbreviation}</span>
      </div>
    );
  }

  // Plain text display - no container, no icons
  return (
    <span
      className={`text-[12px] text-[var(--editorial-text-secondary)] ${className}`}
      style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
    >
      {city} · {currentTime} {abbreviation}
    </span>
  );
}
