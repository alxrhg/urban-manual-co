'use client';

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface WorldMapVisualizationProps {
  visitedCountries: Set<string>;
  visitedDestinations?: Array<{
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

type GeoLoadingState = 'loading' | 'loaded' | 'error';

// Map our country names to the names used in Natural Earth / world-atlas TopoJSON
const COUNTRY_NAME_MAP: Record<string, string[]> = {
  'USA': ['United States of America', 'United States', 'USA'],
  'United States': ['United States of America', 'United States', 'USA'],
  'UK': ['United Kingdom', 'Great Britain', 'England'],
  'United Kingdom': ['United Kingdom', 'Great Britain', 'England'],
  'South Korea': ['South Korea', 'Korea, Republic of', 'Republic of Korea'],
  'Korea': ['South Korea', 'Korea, Republic of', 'Republic of Korea'],
  'UAE': ['United Arab Emirates'],
  'United Arab Emirates': ['United Arab Emirates'],
  'Czech Republic': ['Czech Republic', 'Czechia'],
  'Russia': ['Russia', 'Russian Federation'],
};

// World atlas TopoJSON from jsdelivr (already allowed in CSP)
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export function WorldMapVisualization({
  visitedCountries,
  visitedDestinations = []
}: WorldMapVisualizationProps) {
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const [geoState, setGeoState] = useState<GeoLoadingState>('loading');

  const handleGeoError = () => {
    setGeoState('error');
  };

  const handleGeoLoad = () => {
    setGeoState('loaded');
  };

  // Normalize country names for matching
  const normalizedVisitedCountries = useMemo(() => {
    const normalized = new Set<string>();

    visitedCountries.forEach((country) => {
      if (!country) return;

      // Add the original
      normalized.add(country.toLowerCase().trim());

      // Add any aliases
      const aliases = COUNTRY_NAME_MAP[country];
      if (aliases) {
        aliases.forEach(alias => normalized.add(alias.toLowerCase().trim()));
      }
    });

    return normalized;
  }, [visitedCountries]);

  // Check if a geography name matches our visited countries
  const isCountryVisited = (geoName: string | undefined): boolean => {
    if (!geoName) return false;
    const nameLower = geoName.toLowerCase().trim();
    return normalizedVisitedCountries.has(nameLower);
  };

  // Show error state if geo data failed to load
  if (geoState === 'error') {
    return (
      <div className="relative w-full aspect-[2/1] flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
        Unable to load map data
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-[2/1]"
      onMouseLeave={() => setTooltip(null)}
    >
      {geoState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
          Loading map...
        </div>
      )}
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 100,
          center: [0, 20],
        }}
      >
        <Geographies
          geography={geoUrl}
          onError={handleGeoError}
          parseGeographies={(geos) => {
            if (geos && geos.length > 0) {
              handleGeoLoad();
            }
            return geos;
          }}
        >
          {({ geographies }) =>
            geographies
              .filter((geo) => {
                const name = (geo.properties?.ADMIN || geo.properties?.name || geo.properties?.NAME) as string | undefined;
                return name?.toLowerCase() !== 'antarctica';
              })
              .map((geo) => {
              // Try different property names used by various GeoJSON sources
              const name = (geo.properties?.ADMIN || geo.properties?.name || geo.properties?.NAME) as string | undefined;
              const isVisited = isCountryVisited(name);

              return (
                <g
                  key={geo.rsmKey}
                  onMouseEnter={(evt) => {
                    if (name) setTooltip({ name, x: evt.clientX, y: evt.clientY });
                  }}
                  onMouseMove={(evt) => {
                    if (name) setTooltip({ name, x: evt.clientX, y: evt.clientY });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <Geography
                    geography={geo}
                    fill={isVisited ? '#000' : '#ddd'}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: isVisited ? '#333' : '#ccc' },
                      pressed: { outline: 'none' },
                    }}
                  />
                </g>
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs bg-black text-white rounded pointer-events-none"
          style={{ left: tooltip.x + 10, top: tooltip.y - 25 }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
