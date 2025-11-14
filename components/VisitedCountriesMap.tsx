'use client';

import { useMemo } from 'react';
import { cityCountryMap } from '@/data/cityCountryMap';

interface VisitedCountriesMapProps {
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

// ISO 3166-1 alpha-2 country codes mapped to country names
const countryCodes: Record<string, string> = {
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

export default function VisitedCountriesMap({ visitedPlaces, savedPlaces = [] }: VisitedCountriesMapProps) {
  const visitedCountries = useMemo(() => {
    const countrySet = new Set<string>();
    
    // Get countries from visited places
    visitedPlaces.forEach(place => {
      const city = place.destination?.city;
      if (city) {
        const country = cityCountryMap[city];
        if (country && country !== 'Other') {
          countrySet.add(country);
        }
      }
    });
    
    return Array.from(countrySet);
  }, [visitedPlaces]);

  const getCountryFlag = (countryCode: string): string => {
    // Convert country code to flag emoji
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  if (visitedCountries.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center justify-center">
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
            {visitedCountries.length} {visitedCountries.length === 1 ? 'country' : 'countries'}
          </span>
        </div>
        <div className="text-2xl font-bold">{visitedCountries.length}</div>
      </div>

      {/* Visual map representation */}
      <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 relative overflow-hidden">
        {/* Grid pattern background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />
        </div>
        
        {/* Country flags/labels */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 p-4 w-full">
            {visitedCountries.slice(0, 12).map((country, idx) => {
              const code = countryCodes[country];
              const flag = code ? getCountryFlag(code) : '🌍';
              return (
                <div
                  key={country}
                  className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-sm border border-gray-200 dark:border-gray-800"
                  style={{
                    animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`
                  }}
                >
                  <span className="text-2xl mb-1">{flag}</span>
                  <span className="text-xs text-center font-medium text-gray-700 dark:text-gray-300 truncate w-full px-1">
                    {country.length > 12 ? country.substring(0, 10) + '...' : country}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {visitedCountries.length > 12 && (
          <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-md border border-gray-200 dark:border-gray-800">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              +{visitedCountries.length - 12} more
            </span>
          </div>
        )}
      </div>

      {/* Full country list */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {visitedCountries.map((country) => {
          const code = countryCodes[country];
          const flag = code ? getCountryFlag(code) : '🌍';
          return (
            <div
              key={country}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-dark-blue-700 transition-colors"
            >
              <span className="text-lg">{flag}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
                {country}
              </span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

