'use client';

import { useMemo } from 'react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { MapProvider, World } from '@yanikemmenegger/react-world-map';

interface TravelMapProps {
  visitedPlaces: Array<{
    destination?: {
      city?: string;
    };
  }>;
  savedPlaces?: Array<{
    destination?: {
      city?: string;
    };
  }>;
}

// Map country names to ISO 3166-1 alpha-2 country codes (2-letter codes)
const countryNameToISO2: Record<string, string> = {
  'United States': 'US',
  'USA': 'US',
  'Japan': 'JP',
  'France': 'FR',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Italy': 'IT',
  'Spain': 'ES',
  'Germany': 'DE',
  'Canada': 'CA',
  'Australia': 'AU',
  'Mexico': 'MX',
  'Brazil': 'BR',
  'China': 'CN',
  'India': 'IN',
  'South Korea': 'KR',
  'Thailand': 'TH',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  'Turkey': 'TR',
  'Greece': 'GR',
  'Portugal': 'PT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Ireland': 'IE',
  'Iceland': 'IS',
  'New Zealand': 'NZ',
  'South Africa': 'ZA',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Peru': 'PE',
  'Colombia': 'CO',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'UAE': 'AE',
  'Qatar': 'QA',
  'Saudi Arabia': 'SA',
  'Israel': 'IL',
  'Jordan': 'JO',
  'Lebanon': 'LB',
  'Russia': 'RU',
  'Taiwan': 'TW',
  'Hong Kong': 'HK',
};

export default function TravelMap({ visitedPlaces, savedPlaces = [] }: TravelMapProps) {
  const visitedCountries = useMemo(() => {
    const countrySet = new Set<string>();
    
    // Get countries from visited places
    visitedPlaces.forEach(place => {
      const city = place.destination?.city;
      if (city) {
        const country = cityCountryMap[city as keyof typeof cityCountryMap];
        if (country && country !== 'Other') {
          countrySet.add(country);
        }
      }
    });
    
    // Optionally add countries from saved places
    savedPlaces.forEach(place => {
      const city = place.destination?.city;
      if (city) {
        const country = cityCountryMap[city as keyof typeof cityCountryMap];
        if (country && country !== 'Other') {
          countrySet.add(country);
        }
      }
    });
    
    return countrySet;
  }, [visitedPlaces, savedPlaces]);

  // Get ISO-2 codes for visited countries and create fill color mapping
  const initialFillColors = useMemo(() => {
    const fillColors: Record<string, string> = {};
    
    Array.from(visitedCountries).forEach(country => {
      const isoCode = countryNameToISO2[country];
      if (isoCode) {
        fillColors[isoCode] = '#6b7280'; // Grey for visited countries
      }
    });
    
    return fillColors;
  }, [visitedCountries]);

  if (visitedCountries.size === 0) {
    return (
      <div className="w-full h-64 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-2 block">🗺️</span>
          <span className="text-gray-600 dark:text-gray-400 text-sm">
            No countries visited yet
          </span>
          <span className="text-gray-500 dark:text-gray-500 text-xs block mt-1">
            Mark places as visited to see your travel map
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Countries Visited</h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {visitedCountries.size} {visitedCountries.size === 1 ? 'country' : 'countries'}
          </span>
        </div>
        <div className="text-2xl font-bold">{visitedCountries.size}</div>
      </div>

      {/* Map - World map with country borders */}
      <div className="w-full h-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <MapProvider
          initialFillColors={initialFillColors}
          defaultFillColor="transparent"
        >
          <World />
        </MapProvider>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Visited</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border border-gray-400 rounded bg-transparent"></div>
              <span className="text-gray-700 dark:text-gray-300">Not visited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Country list */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Array.from(visitedCountries).sort().map((country) => {
          return (
            <div
              key={country}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
            >
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                {country}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
