'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { X, Search, MoreHorizontal, Sliders } from 'lucide-react';
import type { Trip } from '@/types/trip';
import { parseDateString } from '@/lib/utils';

// Country code to flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Taiwan': '🇹🇼',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'Singapore': '🇸🇬',
  'China': '🇨🇳',
  'Hong Kong': '🇭🇰',
  'Indonesia': '🇮🇩',
  'Malaysia': '🇲🇾',
  'Philippines': '🇵🇭',
  'India': '🇮🇳',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'Germany': '🇩🇪',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'Netherlands': '🇳🇱',
  'Portugal': '🇵🇹',
  'Greece': '🇬🇷',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Belgium': '🇧🇪',
  'USA': '🇺🇸',
  'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Mexico': '🇲🇽',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Australia': '🇦🇺',
  'New Zealand': '🇳🇿',
  'UAE': '🇦🇪',
  'Turkey': '🇹🇷',
  'Morocco': '🇲🇦',
  'Egypt': '🇪🇬',
  'South Africa': '🇿🇦',
  'Iceland': '🇮🇸',
  'Norway': '🇳🇴',
  'Sweden': '🇸🇪',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Ireland': '🇮🇪',
  'Czech Republic': '🇨🇿',
  'Poland': '🇵🇱',
  'Hungary': '🇭🇺',
  'Croatia': '🇭🇷',
};

interface TripOverviewHeaderProps {
  trip: Trip;
  countries?: string[];
  coverImage?: string | null;
  onClose?: () => void;
  onSearch?: () => void;
  onMore?: () => void;
  onCustomize?: () => void;
  onTitleChange?: (title: string) => void;
  showFlags?: boolean;
}

export default function TripOverviewHeader({
  trip,
  countries = [],
  coverImage,
  onClose,
  onSearch,
  onMore,
  onCustomize,
  onTitleChange,
  showFlags = true,
}: TripOverviewHeaderProps) {
  // Calculate days until trip and trip duration
  const tripInfo = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const startDate = trip.start_date ? parseDateString(trip.start_date) : null;
    const endDate = trip.end_date ? parseDateString(trip.end_date) : null;

    let daysUntil: number | null = null;
    let tripDuration: number | null = null;
    let status: 'upcoming' | 'ongoing' | 'completed' | 'planning' = 'planning';

    if (startDate) {
      startDate.setHours(0, 0, 0, 0);
      daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil > 0) {
        status = 'upcoming';
      } else if (endDate) {
        endDate.setHours(0, 0, 0, 0);
        if (now <= endDate) {
          status = 'ongoing';
          daysUntil = 0;
        } else {
          status = 'completed';
        }
      } else if (daysUntil <= 0) {
        status = 'ongoing';
        daysUntil = 0;
      }
    }

    if (startDate && endDate) {
      endDate.setHours(0, 0, 0, 0);
      tripDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    return { daysUntil, tripDuration, status, startDate, endDate };
  }, [trip.start_date, trip.end_date]);

  // Format date range
  const dateRangeText = useMemo(() => {
    if (!tripInfo.startDate) return null;

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (tripInfo.endDate) {
      return `${formatDate(tripInfo.startDate)} → ${formatDate(tripInfo.endDate)}`;
    }
    return formatDate(tripInfo.startDate);
  }, [tripInfo.startDate, tripInfo.endDate]);

  // Get status text
  const statusText = useMemo(() => {
    if (tripInfo.daysUntil === null) return null;

    if (tripInfo.status === 'ongoing') {
      return 'Happening now';
    } else if (tripInfo.status === 'completed') {
      return 'Trip completed';
    } else if (tripInfo.daysUntil === 0) {
      return 'Starts today';
    } else if (tripInfo.daysUntil === 1) {
      return 'Starts tomorrow';
    } else {
      return `Starts in ${tripInfo.daysUntil} days`;
    }
  }, [tripInfo.daysUntil, tripInfo.status]);

  // Get unique country flags
  const countryFlags = useMemo(() => {
    const flags: string[] = [];
    countries.forEach(country => {
      const flag = COUNTRY_FLAGS[country];
      if (flag && !flags.includes(flag)) {
        flags.push(flag);
      }
    });
    return flags.slice(0, 5); // Max 5 flags
  }, [countries]);

  return (
    <div className="relative overflow-hidden">
      {/* Background Image with Blur */}
      {coverImage && (
        <div className="absolute inset-0">
          <Image
            src={coverImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-gray-900/95 backdrop-blur-sm" />
        </div>
      )}

      {/* Content */}
      <div className={`relative z-10 ${coverImage ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
        {/* Top Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {onMore && (
              <button
                onClick={onMore}
                className="p-2.5 rounded-full bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/70 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            )}
            {onSearch && (
              <button
                onClick={onSearch}
                className="p-2.5 rounded-full bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/70 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Trip Info */}
        <div className="px-4 pb-6 pt-4 text-center">
          {/* Country Flags */}
          {showFlags && countryFlags.length > 0 && (
            <div className="flex justify-center mb-4">
              <div className="flex -space-x-2">
                {countryFlags.map((flag, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 rounded-full bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-xl border-2 border-gray-900/50"
                    style={{ zIndex: countryFlags.length - index }}
                  >
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trip Title */}
          <input
            type="text"
            value={trip.title}
            onChange={(e) => onTitleChange?.(e.target.value)}
            className={`text-3xl md:text-4xl font-semibold bg-transparent border-none outline-none w-full text-center focus:outline-none placeholder-gray-400 ${
              coverImage ? 'text-white' : 'text-gray-900 dark:text-white'
            }`}
            placeholder="Trip Name"
          />

          {/* Trip Details */}
          <div className={`mt-2 text-sm ${coverImage ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
            {statusText && (
              <span className="font-medium">{statusText}</span>
            )}
            {statusText && tripInfo.tripDuration && (
              <span className="mx-1.5">·</span>
            )}
            {tripInfo.tripDuration && (
              <span>{tripInfo.tripDuration}-day trip</span>
            )}
          </div>

          {/* Date Range */}
          {dateRangeText && (
            <div className={`mt-1 text-sm ${coverImage ? 'text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
              {dateRangeText}
            </div>
          )}
        </div>

        {/* Customize Button */}
        {onCustomize && (
          <div className="flex justify-center pb-6">
            <button
              onClick={onCustomize}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 backdrop-blur-sm hover:bg-gray-700/70 transition-colors text-sm font-medium"
            >
              <Sliders className="w-4 h-4" />
              Customize
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
