'use client';

import { useMemo } from 'react';
import { cityCountryMap } from '@/data/cityCountryMap';

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

// Simple world map SVG with major countries
// Using a simplified world map outline
const WorldMapSVG = ({ visitedCountries }: { visitedCountries: Set<string> }) => {
  // Major countries with approximate SVG paths (simplified representation)
  // This is a basic outline - for production you'd want a full world map SVG
  
  const countryPaths: Record<string, string> = {
    'United States': 'M 150,120 L 150,100 L 100,100 L 100,120 Z',
    'Japan': 'M 280,130 L 290,130 L 290,140 L 280,140 Z',
    'France': 'M 220,110 L 230,110 L 230,120 L 220,120 Z',
    'United Kingdom': 'M 210,100 L 220,100 L 220,110 L 210,110 Z',
    'Italy': 'M 225,115 L 235,115 L 235,125 L 225,125 Z',
    'Spain': 'M 210,115 L 220,115 L 220,125 L 210,125 Z',
    'Germany': 'M 225,105 L 235,105 L 235,115 L 225,115 Z',
    'Canada': 'M 120,80 L 170,80 L 170,120 L 120,120 Z',
    'Australia': 'M 290,180 L 340,180 L 340,220 L 290,220 Z',
    'Mexico': 'M 100,130 L 140,130 L 140,150 L 100,150 Z',
    'Brazil': 'M 180,150 L 220,150 L 220,180 L 180,180 Z',
    'China': 'M 260,110 L 300,110 L 300,140 L 260,140 Z',
    'India': 'M 250,130 L 270,130 L 270,150 L 250,150 Z',
    'South Korea': 'M 280,125 L 290,125 L 290,135 L 280,135 Z',
    'Thailand': 'M 260,145 L 275,145 L 275,155 L 260,155 Z',
    'Singapore': 'M 270,158 L 275,158 L 275,163 L 270,163 Z',
    'Malaysia': 'M 260,150 L 275,150 L 275,160 L 260,160 Z',
    'Indonesia': 'M 260,158 L 285,158 L 285,175 L 260,175 Z',
    'Philippines': 'M 280,145 L 290,145 L 290,155 L 280,155 Z',
    'Vietnam': 'M 265,140 L 275,140 L 275,150 L 265,150 Z',
    'Turkey': 'M 235,115 L 250,115 L 250,125 L 235,125 Z',
    'Greece': 'M 230,115 L 238,115 L 238,120 L 230,120 Z',
    'Portugal': 'M 205,112 L 213,112 L 213,118 L 205,118 Z',
    'Netherlands': 'M 220,105 L 227,105 L 227,110 L 220,110 Z',
    'Belgium': 'M 218,107 L 225,107 L 225,112 L 218,112 Z',
    'Switzerland': 'M 223,108 L 230,108 L 230,113 L 223,113 Z',
    'Austria': 'M 225,108 L 233,108 L 233,115 L 225,115 Z',
    'Sweden': 'M 225,70 L 240,70 L 240,100 L 225,100 Z',
    'Norway': 'M 215,75 L 230,75 L 230,100 L 215,100 Z',
    'Denmark': 'M 222,102 L 228,102 L 228,107 L 222,107 Z',
    'Poland': 'M 230,100 L 242,100 L 242,110 L 230,110 Z',
    'Czech Republic': 'M 225,105 L 233,105 L 233,110 L 225,110 Z',
    'Ireland': 'M 205,98 L 213,98 L 213,105 L 205,105 Z',
    'Iceland': 'M 195,75 L 210,75 L 210,85 L 195,85 Z',
    'New Zealand': 'M 315,185 L 330,185 L 330,200 L 315,200 Z',
    'South Africa': 'M 235,175 L 250,175 L 250,190 L 235,190 Z',
    'Argentina': 'M 170,170 L 190,170 L 190,200 L 170,200 Z',
    'Chile': 'M 165,170 L 175,170 L 175,200 L 165,200 Z',
    'Peru': 'M 160,150 L 175,150 L 175,170 L 160,170 Z',
    'Colombia': 'M 155,140 L 170,140 L 170,155 L 155,155 Z',
    'Egypt': 'M 235,125 L 250,125 L 250,140 L 235,140 Z',
    'Morocco': 'M 205,120 L 220,120 L 220,135 L 205,135 Z',
    'UAE': 'M 245,135 L 252,135 L 252,142 L 245,142 Z',
    'Qatar': 'M 248,133 L 252,133 L 252,137 L 248,137 Z',
    'Saudi Arabia': 'M 240,125 L 260,125 L 260,145 L 240,145 Z',
    'Israel': 'M 238,120 L 245,120 L 245,125 L 238,125 Z',
    'Jordan': 'M 237,120 L 244,120 L 244,125 L 237,125 Z',
    'Lebanon': 'M 238,118 L 242,118 L 242,122 L 238,122 Z',
    'Russia': 'M 230,50 L 320,50 L 320,120 L 230,120 Z',
    'Taiwan': 'M 278,138 L 285,138 L 285,145 L 278,145 Z',
    'Hong Kong': 'M 275,136 L 279,136 L 279,140 L 275,140 Z',
  };

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox="0 0 400 250"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect width="400" height="250" fill="#f3f4f6" className="dark:fill-gray-800" />
        
        {/* Countries */}
        {Object.entries(countryPaths).map(([country, path]) => {
          const isVisited = visitedCountries.has(country);
          return (
            <path
              key={country}
              d={path}
              fill={isVisited ? '#6b7280' : 'transparent'}
              stroke="#9ca3af"
              strokeWidth="0.5"
              className="hover:opacity-80 transition-opacity cursor-pointer"
              title={country}
            />
          );
        })}
        
        {/* Ocean/lake areas - simplified representation */}
      </svg>
      
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
  );
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
      <div className="w-full h-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                const isVisited = Array.from(visitedCountries).some((country) => {
                  const countryISO = countryNameToISO[country];
                  return countryISO === iso3 || countryISO === iso;
                });

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

