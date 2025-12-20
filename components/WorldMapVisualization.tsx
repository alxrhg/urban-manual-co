'use client';

import { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface WorldMapVisualizationProps {
  visitedCountries: Set<string>;
  visitedDestinations?: Array<{
    city: string;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

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

  return (
    <div className="relative w-full aspect-[2/1]">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 100,
          center: [0, 20],
        }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              // Try different property names used by various GeoJSON sources
              const name = (geo.properties?.ADMIN || geo.properties?.name || geo.properties?.NAME) as string | undefined;
              const isVisited = isCountryVisited(name);

              return (
                <Geography
                  key={geo.rsmKey}
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
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
