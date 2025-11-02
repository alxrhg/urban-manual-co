'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  // Load world map and highlight countries
  useEffect(() => {
    if (!svgRef.current || visitedISOCodes.size === 0) return;

    // Try to load world map SVG from multiple sources
    const loadMap = async () => {
      // Try using a reliable world map SVG source
      const mapSources = [
        'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
        // Fallback: We'll embed a simplified version
      ];

      try {
        // For now, use an embedded simple world map
        // In production, you might want to use a proper TopoJSON or GeoJSON file
        setMapLoaded(true);
      } catch (error) {
        console.error('Error loading map:', error);
        setMapLoaded(true); // Still show the map structure
      }
    };

    loadMap();
  }, [visitedISOCodes]);

  // Apply styling to visited countries
  useEffect(() => {
    if (!svgRef.current || !mapLoaded) return;

    const paths = svgRef.current.querySelectorAll('path');
    paths.forEach((path) => {
      const id = path.getAttribute('id')?.toUpperCase();
      const dataCode = path.getAttribute('data-iso')?.toUpperCase();
      const className = path.getAttribute('class') || '';
      
      // Try to extract country code from various attributes
      let countryCode = id || dataCode;
      if (!countryCode) {
        // Try to extract from class name or title
        const match = className.match(/\b([A-Z]{2})\b/) || path.getAttribute('title')?.match(/\b([A-Z]{2})\b/);
        countryCode = match?.[1];
      }
      
      if (countryCode && visitedISOCodes.has(countryCode)) {
        path.setAttribute('fill', '#6b7280'); // Grey for visited
      } else {
        path.setAttribute('fill', 'transparent'); // Transparent for not visited
      }
      path.setAttribute('stroke', '#9ca3af'); // Border color
      path.setAttribute('stroke-width', '0.5');
    });
  }, [mapLoaded, visitedISOCodes]);

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

      {/* Map - Embedded SVG world map with country borders */}
      <div className="w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative">
        <svg
          ref={svgRef}
          viewBox="0 0 1000 500"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <style>{`
              .country-path {
                fill: transparent;
                stroke: #9ca3af;
                stroke-width: 0.5;
                transition: fill 0.2s;
              }
              .country-path.visited {
                fill: #6b7280;
              }
              .country-path:hover {
                opacity: 0.8;
              }
            `}</style>
          </defs>
          
          {/* Background */}
          <rect width="1000" height="500" fill="#f3f4f6" className="dark:fill-gray-800" />
          
          {/* World Map - Simplified major countries */}
          {/* Using approximate coordinates for major countries */}
          <g id="world-countries">
            {/* North America */}
            <path
              id="US"
              className={`country-path ${visitedISOCodes.has('US') ? 'visited' : ''}`}
              d="M 150 150 L 350 150 L 350 280 L 150 280 Z"
            />
            <path
              id="CA"
              className={`country-path ${visitedISOCodes.has('CA') ? 'visited' : ''}`}
              d="M 150 80 L 350 80 L 350 150 L 150 150 Z"
            />
            <path
              id="MX"
              className={`country-path ${visitedISOCodes.has('MX') ? 'visited' : ''}`}
              d="M 150 280 L 250 280 L 250 340 L 150 340 Z"
            />
            
            {/* South America */}
            <path
              id="BR"
              className={`country-path ${visitedISOCodes.has('BR') ? 'visited' : ''}`}
              d="M 250 300 L 350 300 L 350 420 L 250 420 Z"
            />
            <path
              id="AR"
              className={`country-path ${visitedISOCodes.has('AR') ? 'visited' : ''}`}
              d="M 300 350 L 330 350 L 330 450 L 300 450 Z"
            />
            
            {/* Europe */}
            <path
              id="FR"
              className={`country-path ${visitedISOCodes.has('FR') ? 'visited' : ''}`}
              d="M 450 160 L 500 160 L 500 200 L 450 200 Z"
            />
            <path
              id="GB"
              className={`country-path ${visitedISOCodes.has('GB') ? 'visited' : ''}`}
              d="M 430 140 L 460 140 L 460 160 L 430 160 Z"
            />
            <path
              id="IT"
              className={`country-path ${visitedISOCodes.has('IT') ? 'visited' : ''}`}
              d="M 510 180 L 530 180 L 530 220 L 510 220 Z"
            />
            <path
              id="ES"
              className={`country-path ${visitedISOCodes.has('ES') ? 'visited' : ''}`}
              d="M 430 180 L 450 180 L 450 210 L 430 210 Z"
            />
            <path
              id="DE"
              className={`country-path ${visitedISOCodes.has('DE') ? 'visited' : ''}`}
              d="M 490 140 L 530 140 L 530 170 L 490 170 Z"
            />
            
            {/* Asia */}
            <path
              id="CN"
              className={`country-path ${visitedISOCodes.has('CN') ? 'visited' : ''}`}
              d="M 650 140 L 850 140 L 850 240 L 650 240 Z"
            />
            <path
              id="IN"
              className={`country-path ${visitedISOCodes.has('IN') ? 'visited' : ''}`}
              d="M 680 220 L 750 220 L 750 280 L 680 280 Z"
            />
            <path
              id="JP"
              className={`country-path ${visitedISOCodes.has('JP') ? 'visited' : ''}`}
              d="M 850 160 L 880 160 L 880 190 L 850 190 Z"
            />
            <path
              id="RU"
              className={`country-path ${visitedISOCodes.has('RU') ? 'visited' : ''}`}
              d="M 550 40 L 750 40 L 750 200 L 550 200 Z"
            />
            
            {/* Middle East */}
            <path
              id="AE"
              className={`country-path ${visitedISOCodes.has('AE') ? 'visited' : ''}`}
              d="M 600 240 L 620 240 L 620 250 L 600 250 Z"
            />
            <path
              id="SA"
              className={`country-path ${visitedISOCodes.has('SA') ? 'visited' : ''}`}
              d="M 580 220 L 640 220 L 640 260 L 580 260 Z"
            />
            <path
              id="TR"
              className={`country-path ${visitedISOCodes.has('TR') ? 'visited' : ''}`}
              d="M 570 170 L 600 170 L 600 190 L 570 190 Z"
            />
            
            {/* Southeast Asia */}
            <path
              id="TH"
              className={`country-path ${visitedISOCodes.has('TH') ? 'visited' : ''}`}
              d="M 720 240 L 770 240 L 770 260 L 720 260 Z"
            />
            <path
              id="SG"
              className={`country-path ${visitedISOCodes.has('SG') ? 'visited' : ''}`}
              d="M 760 270 L 770 270 L 770 275 L 760 275 Z"
            />
            <path
              id="MY"
              className={`country-path ${visitedISOCodes.has('MY') ? 'visited' : ''}`}
              d="M 750 260 L 780 260 L 780 280 L 750 280 Z"
            />
            <path
              id="ID"
              className={`country-path ${visitedISOCodes.has('ID') ? 'visited' : ''}`}
              d="M 760 280 L 850 280 L 850 330 L 760 330 Z"
            />
            <path
              id="PH"
              className={`country-path ${visitedISOCodes.has('PH') ? 'visited' : ''}`}
              d="M 800 250 L 840 250 L 840 270 L 800 270 Z"
            />
            <path
              id="VN"
              className={`country-path ${visitedISOCodes.has('VN') ? 'visited' : ''}`}
              d="M 770 240 L 800 240 L 800 260 L 770 260 Z"
            />
            
            {/* Oceania */}
            <path
              id="AU"
              className={`country-path ${visitedISOCodes.has('AU') ? 'visited' : ''}`}
              d="M 820 320 L 920 320 L 920 410 L 820 410 Z"
            />
            <path
              id="NZ"
              className={`country-path ${visitedISOCodes.has('NZ') ? 'visited' : ''}`}
              d="M 900 380 L 930 380 L 930 400 L 900 400 Z"
            />
            
            {/* Africa */}
            <path
              id="ZA"
              className={`country-path ${visitedISOCodes.has('ZA') ? 'visited' : ''}`}
              d="M 580 340 L 630 340 L 630 380 L 580 380 Z"
            />
            <path
              id="EG"
              className={`country-path ${visitedISOCodes.has('EG') ? 'visited' : ''}`}
              d="M 570 220 L 600 220 L 600 240 L 570 240 Z"
            />
            <path
              id="MA"
              className={`country-path ${visitedISOCodes.has('MA') ? 'visited' : ''}`}
              d="M 430 220 L 460 220 L 460 240 L 430 240 Z"
            />
            
            {/* Additional European countries */}
            <path
              id="NL"
              className={`country-path ${visitedISOCodes.has('NL') ? 'visited' : ''}`}
              d="M 480 150 L 495 150 L 495 160 L 480 160 Z"
            />
            <path
              id="BE"
              className={`country-path ${visitedISOCodes.has('BE') ? 'visited' : ''}`}
              d="M 480 155 L 490 155 L 490 165 L 480 165 Z"
            />
            <path
              id="CH"
              className={`country-path ${visitedISOCodes.has('CH') ? 'visited' : ''}`}
              d="M 500 170 L 510 170 L 510 180 L 500 180 Z"
            />
            <path
              id="AT"
              className={`country-path ${visitedISOCodes.has('AT') ? 'visited' : ''}`}
              d="M 510 165 L 525 165 L 525 175 L 510 175 Z"
            />
            <path
              id="SE"
              className={`country-path ${visitedISOCodes.has('SE') ? 'visited' : ''}`}
              d="M 520 80 L 550 80 L 550 130 L 520 130 Z"
            />
            <path
              id="NO"
              className={`country-path ${visitedISOCodes.has('NO') ? 'visited' : ''}`}
              d="M 500 70 L 530 70 L 530 120 L 500 120 Z"
            />
            <path
              id="DK"
              className={`country-path ${visitedISOCodes.has('DK') ? 'visited' : ''}`}
              d="M 495 140 L 505 140 L 505 150 L 495 150 Z"
            />
            <path
              id="PL"
              className={`country-path ${visitedISOCodes.has('PL') ? 'visited' : ''}`}
              d="M 540 140 L 565 140 L 565 160 L 540 160 Z"
            />
            <path
              id="CZ"
              className={`country-path ${visitedISOCodes.has('CZ') ? 'visited' : ''}`}
              d="M 510 155 L 525 155 L 525 165 L 510 165 Z"
            />
            <path
              id="IE"
              className={`country-path ${visitedISOCodes.has('IE') ? 'visited' : ''}`}
              d="M 410 140 L 430 140 L 430 155 L 410 155 Z"
            />
            <path
              id="IS"
              className={`country-path ${visitedISOCodes.has('IS') ? 'visited' : ''}`}
              d="M 370 60 L 400 60 L 400 80 L 370 80 Z"
            />
            <path
              id="GR"
              className={`country-path ${visitedISOCodes.has('GR') ? 'visited' : ''}`}
              d="M 535 190 L 550 190 L 550 205 L 535 205 Z"
            />
            <path
              id="PT"
              className={`country-path ${visitedISOCodes.has('PT') ? 'visited' : ''}`}
              d="M 420 185 L 435 185 L 435 195 L 420 195 Z"
            />
            
            {/* Additional Asian countries */}
            <path
              id="KR"
              className={`country-path ${visitedISOCodes.has('KR') ? 'visited' : ''}`}
              d="M 840 160 L 850 160 L 850 170 L 840 170 Z"
            />
            <path
              id="TW"
              className={`country-path ${visitedISOCodes.has('TW') ? 'visited' : ''}`}
              d="M 830 230 L 845 230 L 845 240 L 830 240 Z"
            />
            <path
              id="HK"
              className={`country-path ${visitedISOCodes.has('HK') ? 'visited' : ''}`}
              d="M 825 225 L 835 225 L 835 230 L 825 230 Z"
            />
            
            {/* Additional Middle East */}
            <path
              id="IL"
              className={`country-path ${visitedISOCodes.has('IL') ? 'visited' : ''}`}
              d="M 585 215 L 595 215 L 595 220 L 585 220 Z"
            />
            <path
              id="JO"
              className={`country-path ${visitedISOCodes.has('JO') ? 'visited' : ''}`}
              d="M 585 218 L 595 218 L 595 223 L 585 223 Z"
            />
            <path
              id="LB"
              className={`country-path ${visitedISOCodes.has('LB') ? 'visited' : ''}`}
              d="M 587 210 L 593 210 L 593 215 L 587 215 Z"
            />
            <path
              id="QA"
              className={`country-path ${visitedISOCodes.has('QA') ? 'visited' : ''}`}
              d="M 605 235 L 615 235 L 615 240 L 605 240 Z"
            />
            
            {/* South America */}
            <path
              id="CL"
              className={`country-path ${visitedISOCodes.has('CL') ? 'visited' : ''}`}
              d="M 290 350 L 305 350 L 305 430 L 290 430 Z"
            />
            <path
              id="PE"
              className={`country-path ${visitedISOCodes.has('PE') ? 'visited' : ''}`}
              d="M 270 310 L 290 310 L 290 350 L 270 350 Z"
            />
            <path
              id="CO"
              className={`country-path ${visitedISOCodes.has('CO') ? 'visited' : ''}`}
              d="M 250 280 L 275 280 L 275 310 L 250 310 Z"
            />
          </g>
        </svg>
        
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
