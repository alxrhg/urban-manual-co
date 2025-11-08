'use client';

import { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface WorldMapVisualizationProps {
  visitedCountries: Set<string>;
}

// Map country names to ISO 3166-1 alpha-3 codes (3-letter codes used by world-atlas)
const COUNTRY_TO_ISO: Record<string, string> = {
  // North America
  'USA': 'USA',
  'United States': 'USA',
  'United States of America': 'USA',
  'Canada': 'CAN',
  'Mexico': 'MEX',
  
  // South America
  'Brazil': 'BRA',
  'Argentina': 'ARG',
  'Chile': 'CHL',
  'Peru': 'PER',
  'Colombia': 'COL',
  'Ecuador': 'ECU',
  'Venezuela': 'VEN',
  'Uruguay': 'URY',
  'Paraguay': 'PRY',
  'Bolivia': 'BOL',
  
  // Europe
  'UK': 'GBR',
  'United Kingdom': 'GBR',
  'France': 'FRA',
  'Spain': 'ESP',
  'Portugal': 'PRT',
  'Italy': 'ITA',
  'Germany': 'DEU',
  'Netherlands': 'NLD',
  'Belgium': 'BEL',
  'Switzerland': 'CHE',
  'Austria': 'AUT',
  'Greece': 'GRC',
  'Turkey': 'TUR',
  'Poland': 'POL',
  'Czech Republic': 'CZE',
  'Hungary': 'HUN',
  'Romania': 'ROU',
  'Denmark': 'DNK',
  'Sweden': 'SWE',
  'Norway': 'NOR',
  'Finland': 'FIN',
  'Ireland': 'IRL',
  'Iceland': 'ISL',
  
  // Asia
  'Russia': 'RUS',
  'China': 'CHN',
  'Japan': 'JPN',
  'South Korea': 'KOR',
  'India': 'IND',
  'Thailand': 'THA',
  'Vietnam': 'VNM',
  'Malaysia': 'MYS',
  'Singapore': 'SGP',
  'Indonesia': 'IDN',
  'Philippines': 'PHL',
  'UAE': 'ARE',
  'United Arab Emirates': 'ARE',
  'Hong Kong': 'HKG',
  'Taiwan': 'TWN',
  'Saudi Arabia': 'SAU',
  'Israel': 'ISR',
  'Jordan': 'JOR',
  'Lebanon': 'LBN',
  
  // Oceania
  'Australia': 'AUS',
  'New Zealand': 'NZL',
  
  // Africa
  'Egypt': 'EGY',
  'Morocco': 'MAR',
  'South Africa': 'ZAF',
  'Kenya': 'KEN',
  'Tanzania': 'TZA',
  'Ghana': 'GHA',
  'Nigeria': 'NGA',
};

// Continent mapping for grouping
const CONTINENT_MAP: Record<string, string> = {
  // North America
  'USA': 'North America',
  'United States': 'North America',
  'United States of America': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',
  
  // South America
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Peru': 'South America',
  'Colombia': 'South America',
  'Ecuador': 'South America',
  'Venezuela': 'South America',
  'Uruguay': 'South America',
  'Paraguay': 'South America',
  'Bolivia': 'South America',
  
  // Europe
  'UK': 'Europe',
  'United Kingdom': 'Europe',
  'France': 'Europe',
  'Spain': 'Europe',
  'Portugal': 'Europe',
  'Italy': 'Europe',
  'Germany': 'Europe',
  'Netherlands': 'Europe',
  'Belgium': 'Europe',
  'Switzerland': 'Europe',
  'Austria': 'Europe',
  'Greece': 'Europe',
  'Turkey': 'Europe',
  'Poland': 'Europe',
  'Czech Republic': 'Europe',
  'Hungary': 'Europe',
  'Romania': 'Europe',
  'Denmark': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Finland': 'Europe',
  'Ireland': 'Europe',
  'Iceland': 'Europe',
  
  // Asia
  'Russia': 'Asia',
  'China': 'Asia',
  'Japan': 'Asia',
  'South Korea': 'Asia',
  'India': 'Asia',
  'Thailand': 'Asia',
  'Vietnam': 'Asia',
  'Malaysia': 'Asia',
  'Singapore': 'Asia',
  'Indonesia': 'Asia',
  'Philippines': 'Asia',
  'UAE': 'Asia',
  'United Arab Emirates': 'Asia',
  'Hong Kong': 'Asia',
  'Taiwan': 'Asia',
  'Saudi Arabia': 'Asia',
  'Israel': 'Asia',
  'Jordan': 'Asia',
  'Lebanon': 'Asia',
  
  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  
  // Africa
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'South Africa': 'Africa',
  'Kenya': 'Africa',
  'Tanzania': 'Africa',
  'Ghana': 'Africa',
  'Nigeria': 'Africa',
};

// World Atlas TopoJSON URL (110m resolution for good balance of detail and performance)
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function WorldMapVisualization({ visitedCountries }: WorldMapVisualizationProps) {
  // Convert country names to ISO codes
  const visitedISOCodes = useMemo(() => {
    const isoSet = new Set<string>();
    visitedCountries.forEach((country) => {
      const iso = COUNTRY_TO_ISO[country];
      if (iso) {
        isoSet.add(iso);
      }
    });
    return isoSet;
  }, [visitedCountries]);

  // Group countries by continent for a clean list view
  const continentGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      'North America': [],
      'South America': [],
      'Europe': [],
      'Asia': [],
      'Africa': [],
      'Oceania': [],
    };

    visitedCountries.forEach((country) => {
      const continent = CONTINENT_MAP[country];
      if (continent && groups[continent]) {
        groups[continent].push(country);
      }
    });

    // Sort countries within each continent
    Object.keys(groups).forEach(continent => {
      groups[continent].sort();
    });

    return groups;
  }, [visitedCountries]);

  // Filter out empty continents
  const nonEmptyContinents = Object.entries(continentGroups).filter(
    ([_, countries]) => countries.length > 0
  );

  return (
    <div className="space-y-6">
      {/* World Map with React Simple Maps */}
      <div className="w-full aspect-[2/1] bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 147,
            center: [0, 20],
          }}
          className="w-full h-full"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isoCode = geo.properties.ISO_A3 || geo.properties.ISO_A3_EH;
                const isVisited = isoCode && visitedISOCodes.has(isoCode);
                const countryName = geo.properties.NAME || geo.properties.NAME_LONG || 'Unknown';
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isVisited ? 'currentColor' : 'transparent'}
                    stroke="#e5e7eb"
                    strokeWidth={0.5}
                    className={
                      isVisited
                        ? 'text-black dark:text-white transition-colors duration-300'
                        : 'dark:stroke-gray-800 opacity-20'
                    }
                    style={{
                      default: {
                        outline: 'none',
                      },
                    }}
                  >
                    <title>{countryName}</title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Country List by Continent */}
      {nonEmptyContinents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nonEmptyContinents.map(([continent, countries]) => (
            <div key={continent}>
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                {continent}
              </h3>
              <ul className="space-y-1">
                {countries.map((country) => (
                  <li
                    key={country}
                    className="text-xs text-gray-700 dark:text-gray-300"
                  >
                    {country}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
