'use client';

import { useMemo } from 'react';

interface WorldMapVisualizationProps {
  visitedCountries: Set<string>;
}

// Simple mapping of country names to display format
const COUNTRY_DISPLAY: Record<string, string> = {
  'USA': 'United States',
  'UK': 'United Kingdom',
  'UAE': 'United Arab Emirates',
  'Japan': 'Japan',
  'France': 'France',
  'Singapore': 'Singapore',
  'Thailand': 'Thailand',
  'Australia': 'Australia',
  'Italy': 'Italy',
  'Spain': 'Spain',
  'Germany': 'Germany',
  'Netherlands': 'Netherlands',
  'Switzerland': 'Switzerland',
  'Mexico': 'Mexico',
  'Canada': 'Canada',
  'Brazil': 'Brazil',
  'Argentina': 'Argentina',
  'China': 'China',
  'South Korea': 'South Korea',
  'Hong Kong': 'Hong Kong',
  'Taiwan': 'Taiwan',
  'India': 'India',
  'Indonesia': 'Indonesia',
  'Malaysia': 'Malaysia',
  'Vietnam': 'Vietnam',
  'Philippines': 'Philippines',
  'Egypt': 'Egypt',
  'Morocco': 'Morocco',
  'South Africa': 'South Africa',
  'New Zealand': 'New Zealand',
  'Turkey': 'Turkey',
  'Greece': 'Greece',
  'Portugal': 'Portugal',
  'Belgium': 'Belgium',
  'Austria': 'Austria',
  'Sweden': 'Sweden',
  'Norway': 'Norway',
  'Denmark': 'Denmark',
  'Finland': 'Finland',
  'Poland': 'Poland',
  'Czech Republic': 'Czech Republic',
  'Hungary': 'Hungary',
  'Russia': 'Russia',
  'Peru': 'Peru',
  'Chile': 'Chile',
  'Colombia': 'Colombia',
};

// Simplified world map with country paths (simplified SVG paths)
const COUNTRY_PATHS: Record<string, string> = {
  'USA': 'M 120,160 L 120,110 L 200,110 L 200,160 L 180,160 L 180,180 L 120,180 Z',
  'Canada': 'M 120,60 L 200,60 L 200,105 L 120,105 Z',
  'Mexico': 'M 120,185 L 180,185 L 170,220 L 130,220 Z',
  'Brazil': 'M 250,240 L 280,240 L 290,290 L 270,300 L 250,290 Z',
  'Argentina': 'M 250,310 L 270,310 L 265,360 L 255,360 Z',
  'UK': 'M 380,90 L 395,90 L 395,105 L 380,105 Z',
  'France': 'M 395,110 L 415,110 L 415,135 L 395,135 Z',
  'Spain': 'M 380,140 L 410,140 L 410,160 L 380,160 Z',
  'Italy': 'M 420,130 L 435,130 L 430,160 L 425,160 Z',
  'Germany': 'M 415,95 L 435,95 L 435,115 L 415,115 Z',
  'Netherlands': 'M 410,85 L 425,85 L 425,92 L 410,92 Z',
  'Switzerland': 'M 415,120 L 430,120 L 430,128 L 415,128 Z',
  'Greece': 'M 440,140 L 455,140 L 455,155 L 440,155 Z',
  'Turkey': 'M 460,125 L 490,125 L 490,145 L 460,145 Z',
  'Russia': 'M 440,50 L 600,50 L 600,110 L 440,110 Z',
  'UAE': 'M 500,160 L 520,160 L 520,170 L 500,170 Z',
  'Egypt': 'M 450,165 L 470,165 L 470,185 L 450,185 Z',
  'South Africa': 'M 450,300 L 475,300 L 475,330 L 450,330 Z',
  'India': 'M 540,170 L 570,170 L 565,215 L 545,215 Z',
  'China': 'M 580,115 L 640,115 L 640,170 L 580,170 Z',
  'Japan': 'M 660,120 L 680,120 L 680,160 L 660,160 Z',
  'South Korea': 'M 650,140 L 665,140 L 665,155 L 650,155 Z',
  'Thailand': 'M 590,195 L 605,195 L 605,225 L 590,225 Z',
  'Vietnam': 'M 605,190 L 620,190 L 620,225 L 605,225 Z',
  'Singapore': 'M 600,235 L 608,235 L 608,240 L 600,240 Z',
  'Malaysia': 'M 595,225 L 615,225 L 615,240 L 595,240 Z',
  'Indonesia': 'M 595,245 L 640,245 L 640,265 L 595,265 Z',
  'Philippines': 'M 625,195 L 640,195 L 640,220 L 625,220 Z',
  'Australia': 'M 615,280 L 680,280 L 680,345 L 615,345 Z',
  'New Zealand': 'M 690,330 L 705,330 L 705,360 L 690,360 Z',
};

export function WorldMapVisualization({ visitedCountries }: WorldMapVisualizationProps) {
  // Group countries by continent for a clean list view
  const continentGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      'North America': [],
      'South America': [],
      'Europe': [],
      'Africa': [],
      'Asia': [],
      'Oceania': [],
    };

    const continentMap: Record<string, string> = {
      'USA': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'Brazil': 'South America',
      'Argentina': 'South America',
      'Peru': 'South America',
      'Chile': 'South America',
      'Colombia': 'South America',
      'UK': 'Europe',
      'France': 'Europe',
      'Spain': 'Europe',
      'Italy': 'Europe',
      'Germany': 'Europe',
      'Netherlands': 'Europe',
      'Switzerland': 'Europe',
      'Greece': 'Europe',
      'Turkey': 'Europe',
      'Portugal': 'Europe',
      'Belgium': 'Europe',
      'Austria': 'Europe',
      'Sweden': 'Europe',
      'Norway': 'Europe',
      'Denmark': 'Europe',
      'Finland': 'Europe',
      'Poland': 'Europe',
      'Czech Republic': 'Europe',
      'Hungary': 'Europe',
      'Russia': 'Europe',
      'Egypt': 'Africa',
      'Morocco': 'Africa',
      'South Africa': 'Africa',
      'India': 'Asia',
      'China': 'Asia',
      'Japan': 'Asia',
      'South Korea': 'Asia',
      'Hong Kong': 'Asia',
      'Taiwan': 'Asia',
      'Thailand': 'Asia',
      'Vietnam': 'Asia',
      'Singapore': 'Asia',
      'Malaysia': 'Asia',
      'Indonesia': 'Asia',
      'Philippines': 'Asia',
      'UAE': 'Asia',
      'Australia': 'Oceania',
      'New Zealand': 'Oceania',
    };

    visitedCountries.forEach(country => {
      const continent = continentMap[country];
      if (continent && COUNTRY_DISPLAY[country]) {
        groups[continent].push(COUNTRY_DISPLAY[country]);
      }
    });

    // Filter out empty continents
    Object.keys(groups).forEach(continent => {
      if (groups[continent].length === 0) {
        delete groups[continent];
      }
    });

    return groups;
  }, [visitedCountries]);

  return (
    <div className="space-y-6">
      {/* Simplified SVG World Map */}
      <div className="w-full aspect-[2/1] bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background */}
          <rect width="800" height="400" fill="currentColor" className="text-gray-100 dark:text-gray-900" />

          {/* Country paths */}
          {Object.entries(COUNTRY_PATHS).map(([country, path]) => {
            const isVisited = visitedCountries.has(country);
            return (
              <path
                key={country}
                d={path}
                fill="currentColor"
                className={
                  isVisited
                    ? 'text-black dark:text-white transition-colors'
                    : 'text-gray-200 dark:text-gray-800 transition-colors'
                }
                stroke="#e5e7eb"
                strokeWidth="0.5"
              >
                <title>{COUNTRY_DISPLAY[country] || country}</title>
              </path>
            );
          })}
        </svg>
      </div>

      {/* Visited Countries List by Continent */}
      {Object.keys(continentGroups).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(continentGroups).map(([continent, countries]) => (
            <div key={continent}>
              <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
                {continent}
              </h3>
              <div className="space-y-1">
                {countries.map(country => (
                  <div
                    key={country}
                    className="text-xs text-gray-700 dark:text-gray-300"
                  >
                    • {country}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
