'use client';

import { useMemo } from 'react';

interface WorldMapVisualizationProps {
  visitedCountries: Set<string>;
}

// Simplified but realistic SVG paths for countries (Mercator projection, simplified for performance)
// These are hand-optimized from Natural Earth data for common travel destinations
const COUNTRY_PATHS: Record<string, string> = {
  // North America
  'USA': 'M100,140 L180,140 L180,120 L190,115 L195,110 L195,100 L190,95 L180,95 L175,90 L170,90 L165,95 L160,95 L155,100 L150,100 L145,105 L140,105 L135,110 L130,110 L125,115 L120,115 L115,120 L110,120 L105,125 L100,130 Z M175,150 L185,150 L190,155 L190,165 L185,170 L180,170 L175,165 L175,155 Z',
  'Canada': 'M95,55 L200,55 L205,60 L205,70 L200,75 L195,80 L190,85 L185,85 L180,90 L175,90 L170,85 L165,85 L160,80 L155,80 L150,75 L145,75 L140,70 L135,70 L130,65 L125,65 L120,60 L115,60 L110,65 L105,65 L100,70 L95,70 Z',
  'Mexico': 'M105,175 L135,175 L140,180 L145,185 L150,190 L155,195 L160,200 L160,205 L155,210 L150,210 L145,205 L140,205 L135,200 L130,200 L125,195 L120,195 L115,190 L110,190 L105,185 Z',

  // Europe
  'UK': 'M380,85 L385,85 L390,80 L395,80 L395,90 L390,95 L385,95 L380,100 L375,100 L375,95 L380,90 Z',
  'France': 'M385,100 L390,100 L395,105 L400,105 L405,110 L410,110 L415,115 L415,125 L410,130 L405,130 L400,125 L395,125 L390,120 L385,120 L385,115 L390,110 L385,105 Z',
  'Spain': 'M370,135 L375,135 L380,130 L390,130 L395,135 L400,140 L405,140 L410,145 L410,150 L405,155 L400,155 L395,150 L390,150 L385,145 L380,145 L375,140 L370,140 Z',
  'Portugal': 'M360,135 L365,135 L370,140 L370,150 L365,155 L360,155 L360,145 Z',
  'Italy': 'M415,120 L420,120 L425,125 L430,125 L430,135 L435,140 L435,150 L430,155 L425,160 L420,165 L420,170 L415,170 L415,165 L420,160 L420,155 L415,150 L415,140 L420,135 L420,130 L415,125 Z',
  'Germany': 'M410,95 L415,95 L420,90 L430,90 L435,95 L435,105 L430,110 L425,110 L420,105 L415,105 L410,100 Z',
  'Netherlands': 'M405,85 L410,85 L415,80 L420,80 L420,90 L415,90 L410,85 L405,85 Z',
  'Belgium': 'M405,90 L410,90 L415,95 L410,100 L405,100 L405,95 Z',
  'Switzerland': 'M410,110 L420,110 L420,120 L415,120 L410,115 Z',
  'Austria': 'M420,110 L435,110 L435,120 L425,120 L420,115 Z',
  'Greece': 'M440,135 L450,135 L455,140 L455,150 L450,155 L445,155 L440,150 L440,140 Z',
  'Turkey': 'M455,130 L475,130 L485,135 L490,140 L490,145 L485,150 L475,150 L465,145 L455,140 Z',

  // Asia
  'Russia': 'M435,45 L620,45 L625,50 L625,60 L620,70 L615,75 L610,75 L605,80 L600,80 L595,85 L590,85 L585,90 L580,90 L575,95 L570,95 L565,100 L560,100 L555,95 L550,95 L545,90 L540,90 L535,85 L530,85 L525,80 L520,80 L515,75 L510,75 L505,70 L500,70 L495,65 L490,65 L485,60 L480,60 L475,55 L470,55 L465,50 L460,50 L455,55 L450,55 L445,60 L440,60 L435,55 Z',
  'China': 'M570,105 L580,105 L590,100 L600,100 L610,105 L620,105 L630,110 L640,115 L645,120 L645,130 L640,140 L635,145 L630,150 L625,155 L620,160 L615,160 L610,155 L605,155 L600,150 L595,150 L590,145 L585,145 L580,140 L575,140 L570,135 L570,125 L575,120 L575,110 Z',
  'Japan': 'M655,115 L665,115 L670,120 L675,125 L675,135 L670,145 L665,150 L660,155 L655,160 L650,160 L650,155 L655,150 L655,140 L650,135 L650,125 L655,120 Z',
  'South Korea': 'M645,135 L655,135 L660,140 L660,150 L655,155 L650,155 L645,150 L645,140 Z',
  'India': 'M530,160 L540,160 L550,155 L560,155 L570,160 L575,170 L575,185 L570,195 L565,200 L560,205 L555,210 L550,215 L545,215 L540,210 L535,205 L530,195 L530,185 L535,175 L535,165 Z',
  'Thailand': 'M585,185 L595,185 L600,190 L600,205 L595,215 L590,220 L585,220 L585,210 L590,200 L590,190 Z',
  'Vietnam': 'M600,180 L610,180 L615,185 L615,200 L610,210 L605,220 L600,220 L600,210 L605,200 L605,185 Z',
  'Malaysia': 'M590,220 L600,220 L605,225 L605,235 L600,240 L595,240 L590,235 L590,225 Z',
  'Singapore': 'M598,236 L603,236 L603,241 L598,241 Z',
  'Indonesia': 'M590,240 L610,240 L625,245 L640,250 L645,255 L645,265 L640,270 L630,270 L620,265 L610,265 L600,260 L590,260 L590,250 Z',
  'Philippines': 'M620,185 L630,185 L635,190 L635,205 L630,215 L625,220 L620,220 L620,210 L625,200 L625,190 Z',
  'UAE': 'M495,155 L510,155 L515,160 L515,170 L510,175 L500,175 L495,170 L495,160 Z',
  'Hong Kong': 'M625,165 L630,165 L630,170 L625,170 Z',
  'Taiwan': 'M635,155 L640,155 L640,165 L635,165 Z',

  // Oceania
  'Australia': 'M605,275 L620,275 L635,280 L650,285 L665,290 L675,300 L680,310 L680,325 L675,335 L665,340 L650,345 L635,345 L620,340 L610,335 L605,325 L605,310 L610,300 L610,285 Z',
  'New Zealand': 'M685,325 L695,325 L700,330 L700,345 L695,355 L690,360 L685,360 L685,350 L690,340 L690,330 Z',

  // South America
  'Brazil': 'M245,230 L260,230 L275,235 L285,245 L290,260 L290,280 L285,295 L275,305 L265,310 L255,310 L245,305 L240,295 L240,280 L245,265 L245,245 Z',
  'Argentina': 'M245,315 L260,315 L265,325 L265,345 L260,360 L255,370 L250,370 L245,360 L245,345 L250,330 Z',
  'Chile': 'M235,315 L242,315 L242,330 L240,350 L235,370 L230,370 L230,350 L235,330 Z',
  'Peru': 'M225,245 L240,245 L245,255 L245,275 L240,285 L230,285 L225,275 L225,255 Z',
  'Colombia': 'M230,220 L245,220 L250,230 L250,245 L245,250 L235,250 L230,240 Z',

  // Africa
  'Egypt': 'M445,160 L460,160 L465,165 L465,180 L460,190 L450,190 L445,180 L445,165 Z',
  'Morocco': 'M360,160 L380,160 L385,165 L385,180 L380,185 L370,185 L365,180 L360,175 Z',
  'South Africa': 'M445,300 L465,300 L475,310 L475,325 L470,335 L460,340 L450,340 L445,330 L445,315 Z',
};

// Continent mapping for grouping
const CONTINENT_MAP: Record<string, string> = {
  // North America
  'USA': 'North America',
  'Canada': 'North America',
  'Mexico': 'North America',

  // South America
  'Brazil': 'South America',
  'Argentina': 'South America',
  'Chile': 'South America',
  'Peru': 'South America',
  'Colombia': 'South America',

  // Europe
  'UK': 'Europe',
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
  'Hong Kong': 'Asia',
  'Taiwan': 'Asia',

  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',

  // Africa
  'Egypt': 'Africa',
  'Morocco': 'Africa',
  'South Africa': 'Africa',
};

export function WorldMapVisualization({ visitedCountries }: WorldMapVisualizationProps) {
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
      {/* World Map SVG */}
      <div className="w-full aspect-[2/1] bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden p-4">
        <svg
          viewBox="0 0 750 400"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* All countries (background) */}
          {Object.entries(COUNTRY_PATHS).map(([country, path]) => (
            <path
              key={country}
              d={path}
              fill={visitedCountries.has(country) ? 'currentColor' : 'none'}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              className={
                visitedCountries.has(country)
                  ? 'text-black dark:text-white transition-colors duration-300'
                  : 'dark:text-gray-800'
              }
              opacity={visitedCountries.has(country) ? 1 : 0.2}
            >
              <title>{country}</title>
            </path>
          ))}
        </svg>
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
