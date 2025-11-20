'use client';

import { useMemo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { cityCountryMap } from '@/data/cityCountryMap';

interface WorldMapVisualizationProps {
  visitedCountries: Set<string>;
  visitedDestinations?: Array<{
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

// Map country names to ISO 3166-1 alpha-2 codes (2-letter codes used by world-110m.json)
const COUNTRY_TO_ISO2: Record<string, string> = {
  // North America
  'USA': 'US',
  'United States': 'US',
  'United States of America': 'US',
  'Canada': 'CA',
  'Mexico': 'MX',
  
  // South America
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Peru': 'PE',
  'Colombia': 'CO',
  'Ecuador': 'EC',
  'Venezuela': 'VE',
  'Uruguay': 'UY',
  'Paraguay': 'PY',
  'Bolivia': 'BO',
  
  // Europe
  'UK': 'GB',
  'United Kingdom': 'GB',
  'France': 'FR',
  'Spain': 'ES',
  'Portugal': 'PT',
  'Italy': 'IT',
  'Germany': 'DE',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Greece': 'GR',
  'Turkey': 'TR',
  'Poland': 'PL',
  'Czech Republic': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Denmark': 'DK',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Finland': 'FI',
  'Ireland': 'IE',
  'Iceland': 'IS',
  
  // Asia
  'Russia': 'RU',
  'China': 'CN',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Korea': 'KR',
  'India': 'IN',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Malaysia': 'MY',
  'Singapore': 'SG',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'UAE': 'AE',
  'United Arab Emirates': 'AE',
  'Hong Kong': 'HK',
  'Taiwan': 'TW',
  'Saudi Arabia': 'SA',
  'Israel': 'IL',
  'Jordan': 'JO',
  'Lebanon': 'LB',
  
  // Oceania
  'Australia': 'AU',
  'New Zealand': 'NZ',
  
  // Africa
  'Egypt': 'EG',
  'Morocco': 'MA',
  'South Africa': 'ZA',
  'Kenya': 'KE',
  'Tanzania': 'TZ',
  'Ghana': 'GH',
  'Nigeria': 'NG',
};

// World Atlas TopoJSON URL (110m resolution)
// Using the correct file from world-atlas@2 package
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Simple mercator projection helper
function mercatorProjection(
  lng: number,
  lat: number,
  scale: number = 147,
  center: [number, number] = [0, 20],
  width: number = 800,
  height: number = 400
): [number, number] {
  // Mercator projection
  const x = (lng - center[0]) * scale + width / 2;
  const y = -(lat - center[1]) * scale + height / 2;
  return [x, y];
}

export function WorldMapVisualization({ 
  visitedCountries,
  visitedDestinations = []
}: WorldMapVisualizationProps) {
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Convert country names to ISO-2 codes
  const visitedISO2Codes = useMemo(() => {
    const isoSet = new Set<string>();
    const unmappedCountries: string[] = [];
    
    visitedCountries.forEach((country) => {
      if (!country) return;
      
      // Try exact match first
      let iso2 = COUNTRY_TO_ISO2[country];
      
      // If no exact match, try case-insensitive match
      if (!iso2) {
        const countryLower = country.toLowerCase().trim();
        for (const [key, value] of Object.entries(COUNTRY_TO_ISO2)) {
          if (key.toLowerCase() === countryLower) {
            iso2 = value;
            break;
          }
        }
      }
      
      if (iso2) {
        // Normalize to uppercase for consistent matching
        isoSet.add(iso2.toUpperCase());
      } else {
        // Log unmapped countries for debugging
        unmappedCountries.push(country);
      }
    });
    
    // Log all unmapped countries at once for easier debugging
    if (unmappedCountries.length > 0) {
      console.warn('[WorldMap] Unmapped countries (will not appear on map):', unmappedCountries);
      console.warn('[WorldMap] Available country mappings:', Object.keys(COUNTRY_TO_ISO2));
    }
    
    return isoSet;
  }, [visitedCountries]);

  // Extract unique city coordinates from visited destinations
  const cityMarkers = useMemo(() => {
    const cityMap = new Map<string, { lat: number; lng: number; city: string }>();
    
    visitedDestinations.forEach((dest) => {
      if (dest.latitude && dest.longitude && dest.city) {
        const cityKey = dest.city.toLowerCase();
        // Only add if we don't already have this city, or use the first occurrence
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            lat: dest.latitude,
            lng: dest.longitude,
            city: dest.city,
          });
        }
      }
    });

    return Array.from(cityMap.values());
  }, [visitedDestinations]);

  // Check if map data can be loaded
  useEffect(() => {
    fetch(geoUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      })
      .catch((error) => {
        console.error('[WorldMap] Error loading geography data:', error);
        setMapError('Failed to load map data. Please check your connection and refresh the page.');
      });
  }, []);

  // Handle map loading errors
  if (mapError) {
    return (
      <div className="w-full">
        <div className="w-full aspect-[2/1] max-w-full bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex items-center justify-center">
          <div className="text-center p-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Unable to load map</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{mapError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full aspect-[2/1] max-w-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden" style={{ height: 'auto' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 147,
            center: [0, 20],
          }}
          className="w-full h-full"
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) => {
              // Debug: Log visited ISO codes
              if (visitedCountries.size > 0) {
                console.log('[WorldMap] Visited countries:', Array.from(visitedCountries));
                console.log('[WorldMap] Visited ISO2 codes:', Array.from(visitedISO2Codes));
                console.log('[WorldMap] Total geographies:', geographies.length);
                
                // Sample a few geographies to check their ISO codes
                const sampleGeos = geographies.slice(0, 10).map(g => ({
                  name: g.properties.NAME || g.properties.NAME_LONG || 'Unknown',
                  iso_a2: g.properties.ISO_A2,
                  iso_a2_eh: g.properties.ISO_A2_EH,
                }));
                console.log('[WorldMap] Sample geography ISO codes:', sampleGeos);
              }
              console.log('[WorldMap] City markers:', cityMarkers.length);
              
              return geographies.map((geo) => {
                // world-110m.json uses ISO_A2 for 2-letter codes
                // Some territories use ISO_A2_EH (Western Sahara, etc.)
                // Also check ISO_A2_EH, ISO_A2_UK, and other variants
                const iso2CodeRaw = geo.properties.ISO_A2 || geo.properties.ISO_A2_EH || geo.properties.ISO_A2_UK;
                // Normalize to uppercase for consistent matching
                const iso2Code = iso2CodeRaw && typeof iso2CodeRaw === 'string' 
                  ? iso2CodeRaw.toUpperCase().trim() 
                  : null;
                // Also check if it's -99 (which means no ISO code assigned)
                const hasValidCode = iso2Code && iso2Code !== '-99' && iso2Code.length === 2;
                const isVisited = hasValidCode && visitedISO2Codes.has(iso2Code);
                const countryName = geo.properties.NAME || geo.properties.NAME_LONG || geo.properties.NAME_EN || 'Unknown';
                
                // Debug: Log matching for visited countries
                if (isVisited || (visitedISO2Codes.size > 0 && hasValidCode && visitedISO2Codes.has(iso2Code))) {
                  console.log('[WorldMap] Country match:', {
                    name: countryName,
                    iso2: iso2Code,
                    isVisited,
                    visitedCodes: Array.from(visitedISO2Codes)
                  });
                }
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isVisited ? '#000000' : '#E8E6E3'}
                    stroke={isVisited ? '#000000' : '#BDBAB5'}
                    strokeWidth={isVisited ? 1 : 0.5}
                    style={{
                      default: {
                        outline: 'none',
                        strokeOpacity: isVisited ? 0.8 : 0.6,
                        fillOpacity: isVisited ? 1 : 0.8,
                      },
                      hover: {
                        outline: 'none',
                        strokeOpacity: 0.8,
                        fillOpacity: isVisited ? 1 : 0.9,
                      },
                      pressed: {
                        outline: 'none',
                        strokeOpacity: 0.8,
                        fillOpacity: isVisited ? 1 : 0.9,
                      },
                    }}
                  >
                    <title>{countryName} {isVisited ? '(Visited)' : ''}</title>
                  </Geography>
                );
              });
            }}
          </Geographies>
          
          {/* City markers - using SVG circles with mercator projection */}
          <g>
            {cityMarkers.map((city, index) => {
              const isHovered = hoveredCity === city.city;
              const radius = isHovered ? 4 : 3;
              const opacity = isHovered ? 0.9 : 0.8;
              
              // Project coordinates using mercator projection
              const [x, y] = mercatorProjection(city.lng, city.lat, 147, [0, 20], 800, 400);
              
              return (
                <circle
                  key={`${city.city}-${index}`}
                  cx={x}
                  cy={y}
                  r={radius}
                  fill="#262626"
                  fillOpacity={opacity}
                  stroke="none"
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredCity(city.city)}
                  onMouseLeave={() => setHoveredCity(null)}
                >
                  <title>{city.city}</title>
                </circle>
              );
            })}
          </g>
        </ComposableMap>
      </div>
    </div>
  );
}
