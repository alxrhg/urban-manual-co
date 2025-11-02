'use client';

import { useMemo, useEffect, useRef } from 'react';
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
  const mapContainerRef = useRef<HTMLDivElement>(null);

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

  // Get ISO-2 codes for visited countries
  const visitedISOCodes = useMemo(() => {
    return new Set(
      Array.from(visitedCountries)
        .map(country => countryNameToISO2[country])
        .filter(Boolean) as string[]
    );
  }, [visitedCountries]);

  // Load and highlight countries in the map
  useEffect(() => {
    if (!mapContainerRef.current || visitedISOCodes.size === 0) return;

    // Load world map SVG from a reliable CDN
    const loadMap = async () => {
      try {
        // Using a free world map SVG
        const response = await fetch('https://cdn.jsdelivr.net/npm/simplemaps@3.0.5/dist/svg/world.svg');
        if (!response.ok) throw new Error('Failed to load map');
        const svgText = await response.text();
        
        // Create a container for the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgElement = svgDoc.querySelector('svg');
        
        if (!svgElement) return;

        // Update viewBox and styling
        svgElement.setAttribute('viewBox', '0 0 1000 500');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';

        // Highlight visited countries
        const paths = svgElement.querySelectorAll('path, polygon, circle');
        paths.forEach((path) => {
          const id = path.getAttribute('id')?.toUpperCase();
          const dataCode = path.getAttribute('data-code')?.toUpperCase();
          const className = path.getAttribute('class') || '';
          
          const countryCode = id || dataCode || className.match(/\b([A-Z]{2})\b/)?.[1];
          
          if (countryCode && visitedISOCodes.has(countryCode)) {
            path.setAttribute('fill', '#6b7280'); // Grey for visited
          } else {
            path.setAttribute('fill', 'transparent'); // Transparent for not visited
          }
          path.setAttribute('stroke', '#9ca3af'); // Border
          path.setAttribute('stroke-width', '0.5');
        });

        // Clear container and add SVG
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
          mapContainerRef.current.appendChild(svgElement);
        }
      } catch (error) {
        console.error('Error loading world map:', error);
        // Fallback: Show a simple representation
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = `
            <div class="w-full h-full flex items-center justify-center">
              <div class="text-center">
                <p class="text-gray-600 dark:text-gray-400 mb-4">World Map</p>
                <p class="text-sm text-gray-500 dark:text-gray-500">
                  ${visitedCountries.size} countries visited
                </p>
              </div>
            </div>
          `;
        }
      }
    };

    loadMap();
  }, [visitedISOCodes, visitedCountries.size]);

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

      {/* Map - World map SVG with country borders */}
      <div className="w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <div ref={mapContainerRef} className="w-full h-full" />
        
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
