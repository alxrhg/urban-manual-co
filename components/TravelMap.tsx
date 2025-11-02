'use client';

import { useMemo } from 'react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

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

// Map country names to ISO country codes for react-simple-maps
const countryNameToISO: Record<string, string> = {
  'United States': 'USA',
  'USA': 'USA',
  'Japan': 'JPN',
  'France': 'FRA',
  'United Kingdom': 'GBR',
  'UK': 'GBR',
  'Italy': 'ITA',
  'Spain': 'ESP',
  'Germany': 'DEU',
  'Canada': 'CAN',
  'Australia': 'AUS',
  'Mexico': 'MEX',
  'Brazil': 'BRA',
  'China': 'CHN',
  'India': 'IND',
  'South Korea': 'KOR',
  'Thailand': 'THA',
  'Singapore': 'SGP',
  'Malaysia': 'MYS',
  'Indonesia': 'IDN',
  'Philippines': 'PHL',
  'Vietnam': 'VNM',
  'Turkey': 'TUR',
  'Greece': 'GRC',
  'Portugal': 'PRT',
  'Netherlands': 'NLD',
  'Belgium': 'BEL',
  'Switzerland': 'CHE',
  'Austria': 'AUT',
  'Sweden': 'SWE',
  'Norway': 'NOR',
  'Denmark': 'DNK',
  'Poland': 'POL',
  'Czech Republic': 'CZE',
  'Ireland': 'IRL',
  'Iceland': 'ISL',
  'New Zealand': 'NZL',
  'South Africa': 'ZAF',
  'Argentina': 'ARG',
  'Chile': 'CHL',
  'Peru': 'PER',
  'Colombia': 'COL',
  'Egypt': 'EGY',
  'Morocco': 'MAR',
  'UAE': 'ARE',
  'Qatar': 'QAT',
  'Saudi Arabia': 'SAU',
  'Israel': 'ISR',
  'Jordan': 'JOR',
  'Lebanon': 'LBN',
  'Russia': 'RUS',
  'Taiwan': 'TWN',
  'Hong Kong': 'HKG',
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

  // Get ISO codes for visited countries
  const visitedISOCodes = useMemo(() => {
    return new Set(
      Array.from(visitedCountries)
        .map(country => countryNameToISO[country])
        .filter(Boolean) as string[]
    );
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

      {/* Map */}
      <div className="w-full h-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <ComposableMap
          projectionConfig={{
            scale: 147,
            center: [0, 20],
          }}
          className="w-full h-full"
        >
          <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">
            {({ geographies }) =>
              geographies.map((geo) => {
                const iso = geo.properties.ISO_A2;
                const iso3 = geo.properties.ISO_A3;
                // Check if this country is visited by matching ISO codes
                const isVisited = visitedISOCodes.has(iso3) || visitedISOCodes.has(iso);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isVisited ? '#6b7280' : 'transparent'}
                    stroke="#9ca3af"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: isVisited ? '#4b5563' : '#e5e7eb' },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-700">
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
