'use client';

import { useMemo } from 'react';
import { Plane, Building2, MapPin, Calendar, Globe, Flag } from 'lucide-react';
import type { Trip, ItineraryItemNotes } from '@/types/trip';

// Country to flag emoji mapping (ISO 3166-1 alpha-2 codes)
const countryFlags: Record<string, string> = {
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'Portugal': '🇵🇹',
  'Japan': '🇯🇵',
  'China': '🇨🇳',
  'South Korea': '🇰🇷',
  'Australia': '🇦🇺',
  'Canada': '🇨🇦',
  'Mexico': '🇲🇽',
  'Brazil': '🇧🇷',
  'Argentina': '🇦🇷',
  'Colombia': '🇨🇴',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Czech Republic': '🇨🇿',
  'Poland': '🇵🇱',
  'Sweden': '🇸🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Finland': '🇫🇮',
  'Iceland': '🇮🇸',
  'Ireland': '🇮🇪',
  'Greece': '🇬🇷',
  'Turkey': '🇹🇷',
  'Thailand': '🇹🇭',
  'Vietnam': '🇻🇳',
  'Indonesia': '🇮🇩',
  'Singapore': '🇸🇬',
  'Malaysia': '🇲🇾',
  'Philippines': '🇵🇭',
  'India': '🇮🇳',
  'UAE': '🇦🇪',
  'United Arab Emirates': '🇦🇪',
  'Saudi Arabia': '🇸🇦',
  'Israel': '🇮🇱',
  'Egypt': '🇪🇬',
  'Morocco': '🇲🇦',
  'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿',
  'Russia': '🇷🇺',
  'Croatia': '🇭🇷',
  'Hungary': '🇭🇺',
  'Romania': '🇷🇴',
  'Bulgaria': '🇧🇬',
  'Serbia': '🇷🇸',
  'Slovenia': '🇸🇮',
  'Slovakia': '🇸🇰',
  'Estonia': '🇪🇪',
  'Latvia': '🇱🇻',
  'Lithuania': '🇱🇹',
  'Taiwan': '🇹🇼',
  'Hong Kong': '🇭🇰',
  'Macao': '🇲🇴',
  'Costa Rica': '🇨🇷',
  'Panama': '🇵🇦',
  'Cuba': '🇨🇺',
  'Jamaica': '🇯🇲',
  'Bahamas': '🇧🇸',
  'Puerto Rico': '🇵🇷',
  'Dominican Republic': '🇩🇴',
};

function getCountryFlag(country: string): string {
  return countryFlags[country] || '🏳️';
}

interface TripWithItems extends Trip {
  items?: Array<{
    notes: string | null;
    parsedNotes?: ItineraryItemNotes;
  }>;
  item_count?: number;
  flight_count?: number;
  hotel_count?: number;
}

interface TravelStatsProps {
  trips: TripWithItems[];
  visitedCountries: Set<string>;
  visitedCities: Set<string>;
  totalDaysTraveled?: number;
}

/**
 * TravelStats - Tripsy-inspired travel statistics dashboard
 */
export function TravelStats({
  trips,
  visitedCountries,
  visitedCities,
  totalDaysTraveled,
}: TravelStatsProps) {
  // Calculate stats from trips
  const stats = useMemo(() => {
    let flightCount = 0;
    let hotelCount = 0;
    let activityCount = 0;
    let daysTraveled = totalDaysTraveled || 0;

    trips.forEach((trip) => {
      // Count flights and hotels from trip items
      if (trip.flight_count) flightCount += trip.flight_count;
      if (trip.hotel_count) hotelCount += trip.hotel_count;
      if (trip.item_count) activityCount += trip.item_count;

      // Calculate days from trip dates if not provided
      if (!totalDaysTraveled && trip.start_date && trip.end_date) {
        const start = new Date(trip.start_date);
        const end = new Date(trip.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (days > 0) daysTraveled += days;
      }
    });

    return {
      trips: trips.length,
      countries: visitedCountries.size,
      cities: visitedCities.size,
      flights: flightCount,
      hotels: hotelCount,
      activities: activityCount,
      daysTraveled,
    };
  }, [trips, visitedCountries.size, visitedCities.size, totalDaysTraveled]);

  // Get top countries by trip count (from trip destinations)
  const topCountries = useMemo(() => {
    const countryCount: Record<string, number> = {};

    // Count from visited countries
    visitedCountries.forEach((country) => {
      countryCount[country] = (countryCount[country] || 0) + 1;
    });

    return Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([country]) => country);
  }, [visitedCountries]);

  if (trips.length === 0 && visitedCountries.size === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-900 dark:to-black p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Travel Stats</h2>
          {stats.daysTraveled > 0 && (
            <p className="text-sm text-gray-400">{stats.daysTraveled} days traveling</p>
          )}
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-xs">
          <Calendar className="w-3 h-3" />
          All Time
        </div>
      </div>

      {/* Country flags row */}
      {topCountries.length > 0 && (
        <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
          {topCountries.map((country) => (
            <span
              key={country}
              className="text-2xl hover:scale-110 transition-transform cursor-default"
              title={country}
            >
              {getCountryFlag(country)}
            </span>
          ))}
        </div>
      )}

      {/* Stats grid - Primary metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-white tabular-nums">
            {stats.trips}
          </div>
          <div className="text-xs text-gray-400 mt-1">Trips</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white tabular-nums">
            {stats.countries}
          </div>
          <div className="text-xs text-gray-400 mt-1">Countries</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white tabular-nums">
            {stats.cities}
          </div>
          <div className="text-xs text-gray-400 mt-1">Cities</div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Plane className="w-4 h-4 text-blue-400" />
            <span className="text-xl font-semibold tabular-nums">{stats.flights}</span>
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Flights</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-xl font-semibold tabular-nums">{stats.hotels}</span>
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Hotels</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <MapPin className="w-4 h-4 text-orange-400" />
            <span className="text-xl font-semibold tabular-nums">{stats.activities}</span>
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Activities</div>
        </div>
      </div>

      {/* Total summary */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Total</span>
          <div className="flex items-baseline gap-3">
            <div>
              <span className="text-2xl font-bold text-orange-400 tabular-nums">{stats.trips}</span>
              <span className="text-xs text-gray-500 ml-1">trips</span>
            </div>
            {stats.daysTraveled > 0 && (
              <div>
                <span className="text-2xl font-bold text-white tabular-nums">{stats.daysTraveled}</span>
                <span className="text-xs text-gray-500 ml-1">days</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TravelStatsCompact - Smaller version for sidebar or card layouts
 */
export function TravelStatsCompact({
  trips,
  visitedCountries,
  visitedCities,
}: Omit<TravelStatsProps, 'totalDaysTraveled'>) {
  const topCountries = useMemo(() => {
    return Array.from(visitedCountries).slice(0, 6);
  }, [visitedCountries]);

  return (
    <div className="rounded-xl bg-gray-100 dark:bg-gray-800/50 p-4">
      {/* Country flags */}
      {topCountries.length > 0 && (
        <div className="flex items-center gap-0.5 mb-3">
          {topCountries.map((country) => (
            <span key={country} className="text-lg" title={country}>
              {getCountryFlag(country)}
            </span>
          ))}
          {visitedCountries.size > 6 && (
            <span className="text-xs text-gray-500 ml-1">
              +{visitedCountries.size - 6}
            </span>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">{trips.length}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">trips</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">{visitedCountries.size}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">countries</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-white">{visitedCities.size}</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">cities</span>
          </div>
        </div>
      </div>
    </div>
  );
}
