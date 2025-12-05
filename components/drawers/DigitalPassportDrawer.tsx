'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { createClient } from '@/lib/supabase/client';
import { PassportStamp, EmptyPassportPage, type VisitedCountry } from '@/components/passport/PassportStamp';
import { X, ChevronLeft, Globe, MapPin, Plane } from 'lucide-react';

interface DigitalPassportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Continent mapping for countries
const CONTINENT_MAP: Record<string, string> = {
  // Europe
  'United Kingdom': 'Europe',
  'France': 'Europe',
  'Italy': 'Europe',
  'Spain': 'Europe',
  'Germany': 'Europe',
  'Netherlands': 'Europe',
  'Belgium': 'Europe',
  'Switzerland': 'Europe',
  'Austria': 'Europe',
  'Portugal': 'Europe',
  'Greece': 'Europe',
  'Sweden': 'Europe',
  'Norway': 'Europe',
  'Denmark': 'Europe',
  'Finland': 'Europe',
  'Ireland': 'Europe',
  'Iceland': 'Europe',
  'Poland': 'Europe',
  'Czech Republic': 'Europe',
  'Turkey': 'Europe',
  // Asia
  'Japan': 'Asia',
  'China': 'Asia',
  'South Korea': 'Asia',
  'Thailand': 'Asia',
  'Singapore': 'Asia',
  'Malaysia': 'Asia',
  'Indonesia': 'Asia',
  'Vietnam': 'Asia',
  'Philippines': 'Asia',
  'India': 'Asia',
  'Taiwan': 'Asia',
  'Hong Kong': 'Asia',
  // Middle East
  'United Arab Emirates': 'Middle East',
  'Israel': 'Middle East',
  'Jordan': 'Middle East',
  'Lebanon': 'Middle East',
  'Saudi Arabia': 'Middle East',
  'Qatar': 'Middle East',
  // Americas
  'United States': 'Americas',
  'Canada': 'Americas',
  'Mexico': 'Americas',
  'Brazil': 'Americas',
  'Argentina': 'Americas',
  'Chile': 'Americas',
  'Peru': 'Americas',
  'Colombia': 'Americas',
  // Oceania
  'Australia': 'Oceania',
  'New Zealand': 'Oceania',
  // Africa
  'South Africa': 'Africa',
  'Morocco': 'Africa',
  'Egypt': 'Africa',
  'Russia': 'Europe',
};

function getContinent(country: string): string {
  return CONTINENT_MAP[country] || 'Other';
}

// Close button component
function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2.5 sm:p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
    >
      <X className="w-5 h-5 sm:w-4 sm:h-4" />
    </button>
  );
}

// Back button component
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2.5 sm:p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
    >
      <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
    </button>
  );
}

// Stats pill component
function StatsPill({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
      <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  );
}

export default function DigitalPassportDrawer({ isOpen, onClose }: DigitalPassportDrawerProps) {
  const { user } = useAuth();
  const { goBack, canGoBack } = useDrawer();
  const [visitedCountries, setVisitedCountries] = useState<VisitedCountry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisitedCountries() {
      if (!user?.id || !isOpen) {
        setVisitedCountries([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const supabaseClient = createClient();

        // Fetch visited places with destination country info
        const { data, error } = await supabaseClient
          .from('visited_places')
          .select(`
            id,
            visited_at,
            created_at,
            destinations!inner(
              country,
              city
            )
          `)
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false });

        if (error) {
          console.error('Error fetching visited countries:', error);
          setVisitedCountries([]);
          return;
        }

        // Aggregate by country
        const countryMap = new Map<string, { visitedAt: string; placesCount: number }>();

        (data || []).forEach((item: Record<string, unknown>) => {
          const dest = item.destinations;
          let country: string | null = null;

          if (Array.isArray(dest)) {
            country = dest[0]?.country;
          } else if (dest && typeof dest === 'object') {
            country = (dest as { country?: string }).country || null;
          }

          if (country) {
            const existing = countryMap.get(country);
            const visitDate = (item.visited_at || item.created_at) as string;

            if (existing) {
              existing.placesCount += 1;
              // Keep the earliest visit date
              if (new Date(visitDate) < new Date(existing.visitedAt)) {
                existing.visitedAt = visitDate;
              }
            } else {
              countryMap.set(country, {
                visitedAt: visitDate,
                placesCount: 1,
              });
            }
          }
        });

        // Convert to array and sort by visit date (most recent first)
        const countries: VisitedCountry[] = Array.from(countryMap.entries())
          .map(([country, data]) => ({
            country,
            visitedAt: data.visitedAt,
            placesCount: data.placesCount,
          }))
          .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());

        setVisitedCountries(countries);
      } catch (err) {
        console.error('Error in fetchVisitedCountries:', err);
        setVisitedCountries([]);
      } finally {
        setLoading(false);
      }
    }

    fetchVisitedCountries();
  }, [user?.id, isOpen]);

  // Calculate stats
  const stats = useMemo(() => {
    const continents = new Set(visitedCountries.map((c) => getContinent(c.country)));
    const totalPlaces = visitedCountries.reduce((sum, c) => sum + c.placesCount, 0);

    return {
      countries: visitedCountries.length,
      continents: continents.size,
      places: totalPlaces,
    };
  }, [visitedCountries]);

  // Group countries by continent
  const groupedByContinent = useMemo(() => {
    const groups: Record<string, VisitedCountry[]> = {};

    visitedCountries.forEach((country) => {
      const continent = getContinent(country.country);
      if (!groups[continent]) {
        groups[continent] = [];
      }
      groups[continent].push(country);
    });

    // Sort continents by number of countries visited
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [visitedCountries]);

  const handleBack = () => {
    if (canGoBack) {
      goBack();
    } else {
      onClose();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <BackButton onClick={handleBack} />
        <CloseButton onClick={onClose} />
      </div>

      {/* Title Section */}
      <div className="px-5 pb-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
          <span className="text-2xl">🛂</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Digital Passport
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your travel stamps collection
        </p>
      </div>

      {/* Stats Row */}
      {stats.countries > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <StatsPill icon={Globe} value={stats.countries} label={stats.countries === 1 ? 'country' : 'countries'} />
            <StatsPill icon={Plane} value={stats.continents} label={stats.continents === 1 ? 'continent' : 'continents'} />
            <StatsPill icon={MapPin} value={stats.places} label={stats.places === 1 ? 'place' : 'places'} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          // Loading skeleton
          <div className="grid grid-cols-3 gap-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : visitedCountries.length === 0 ? (
          <EmptyPassportPage />
        ) : (
          // Passport pages with stamps
          <div className="space-y-6">
            {groupedByContinent.map(([continent, countries]) => (
              <div key={continent}>
                {/* Continent header */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {continent}
                  </h3>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600">
                    ({countries.length})
                  </span>
                </div>

                {/* Stamps grid - styled like passport page */}
                <div className="relative p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                  {/* Passport page texture lines */}
                  <div className="absolute inset-4 pointer-events-none opacity-[0.03] dark:opacity-[0.02]">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="h-px bg-gray-900 dark:bg-white mb-6"
                      />
                    ))}
                  </div>

                  {/* Stamps */}
                  <div className="relative grid grid-cols-3 gap-3">
                    {countries.map((country, index) => (
                      <PassportStamp
                        key={country.country}
                        country={country}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Travel milestone */}
      {stats.countries >= 5 && (
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {stats.countries >= 20
                ? 'World Explorer - Keep discovering!'
                : stats.countries >= 10
                  ? 'Seasoned Traveler - Great journey so far!'
                  : 'Getting started - Many adventures await!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
