'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Search } from 'lucide-react';

import { CARD_META, CARD_MEDIA, CARD_TITLE, CARD_WRAPPER } from '@/components/CardStyles';
import { FollowCityButton } from '@/components/FollowCityButton';
import { MultiplexAd } from '@/components/GoogleAd';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';

interface CityStats {
  city: string;
  country: string;
  count: number;
  featuredImage?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CitiesPage() {
  const router = useRouter();
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityStats[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows
  const [advancedFilters, setAdvancedFilters] = useState<{
    city?: string;
    category?: string;
    michelin?: boolean;
    crown?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    openNow?: boolean;
  }>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCityStats();
  }, []);

  useEffect(() => {
    applyFilters(cityStats, selectedCountry, advancedFilters);
  }, [selectedCountry, advancedFilters, cityStats]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setAdvancedFilters(prev => ({
        ...prev,
        city: searchQuery.trim() ? searchQuery.trim() : undefined,
      }));
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const applyFilters = (cities: CityStats[], country: string, filters: typeof advancedFilters) => {
    let filtered = [...cities];

    if (country) {
      filtered = filtered.filter(c => c.country === country);
    }

    if (filters.city) {
      const query = filters.city.toLowerCase();
      filtered = filtered.filter(cityStat => {
        const normalizedCity = cityStat.city.replace(/-/g, ' ').toLowerCase();
        const normalizedCountry = cityStat.country?.toLowerCase() ?? '';
        return (
          normalizedCity.includes(query) ||
          capitalizeCity(cityStat.city).toLowerCase().includes(query) ||
          normalizedCountry.includes(query)
        );
      });
    }

    setFilteredCities(filtered);
    setCurrentPage(1);
  };

  const fetchCityStats = async () => {
    try {
      // Fetch all destinations with images
      const { data, error } = await supabase
        .from('destinations')
        .select('city, image');

      if (error) throw error;

      const destinations = data as Destination[];
      
      // Count cities and get featured image (first destination with image)
      const cityData = destinations.reduce((acc, dest) => {
        if (!acc[dest.city]) {
          acc[dest.city] = {
            count: 0,
            featuredImage: dest.image || undefined,
          };
        }
        acc[dest.city].count += 1;
        // Update featured image if current one doesn't have image but this one does
        if (!acc[dest.city].featuredImage && dest.image) {
          acc[dest.city].featuredImage = dest.image;
        }
        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string }>);

      const stats = Object.entries(cityData)
        .map(([city, data]) => ({
          city,
          country: cityCountryMap[city] || 'Unknown',
          count: data.count,
          featuredImage: data.featuredImage,
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      setCityStats(stats);
      
      // Extract unique countries
      const uniqueCountries = Array.from(new Set(stats.map(s => s.country).filter(Boolean))) as string[];
      setCountries(uniqueCountries.sort());
      
      // Apply initial filtering
      applyFilters(stats, selectedCountry, advancedFilters);
    } catch (error) {
      console.error('Error fetching city stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalDestinations = useMemo(
    () => cityStats.reduce((total, city) => total + city.count, 0),
    [cityStats]
  );

  const featuredCities = useMemo(() => cityStats.slice(0, 3), [cityStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading cities...</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-gray-50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-black">
      <section className="relative overflow-hidden pt-24 pb-16 md:pb-24">
        <div className="absolute inset-x-0 -top-24 h-[320px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_65%)]" aria-hidden />
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.2em] text-gray-600 dark:text-gray-300">
              Cities &amp; Neighborhoods
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Discover every city we&apos;ve mapped out for Urban Manual
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300">
              Explore curated guides for {cityStats.length} destinations across {countries.length}{' '}
              countries with {totalDestinations.toLocaleString()} spots handpicked by our editors.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <StatPill label="Total Cities" value={cityStats.length.toLocaleString()} />
            <StatPill label="Countries" value={countries.length.toLocaleString()} />
            <StatPill label="Places Covered" value={totalDestinations.toLocaleString()} />
            <StatPill label="Featured City" value={featuredCities[0] ? capitalizeCity(featuredCities[0].city) : 'Coming soon'} subtle />
          </div>

          {featuredCities.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Trending now</span>
              <div className="flex flex-wrap gap-2">
                {featuredCities.map(({ city }) => (
                  <button
                    key={city}
                    onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:-translate-y-0.5 hover:border-gray-300 hover:bg-white dark:hover:border-white/20"
                  >
                    <MapPin className="h-4 w-4" />
                    {capitalizeCity(city)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="relative z-20 -mt-10 pb-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] shadow-lg shadow-gray-900/[0.03] dark:shadow-black/40 backdrop-blur">
            <div className="p-6 sm:p-8 space-y-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter the collection</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Search for a specific city or focus on a country to narrow the grid below.
                  </p>
                </div>
                <div className="w-full lg:w-[320px]">
                  <label htmlFor="city-search" className="sr-only">
                    Search cities
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      id="city-search"
                      type="search"
                      placeholder="Search by city or country"
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                      className="w-full rounded-full border border-gray-200/80 bg-white py-3 pl-12 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:border-white/10 dark:bg-black/40 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/20"
                    />
                  </div>
                </div>
              </div>

              {countries.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Browse by country</span>
                    {(selectedCountry || searchQuery) && (
                      <button
                        onClick={() => {
                          setSelectedCountry('');
                          setSearchQuery('');
                        }}
                        className="text-xs font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                  <div className="mt-3 -mx-2 overflow-x-auto pb-2">
                    <div className="flex w-max min-w-full items-center gap-2 px-2">
                      <CountryPill
                        active={!selectedCountry}
                        label="All countries"
                        onClick={() => {
                          setSelectedCountry('');
                          setAdvancedFilters(prev => ({ ...prev, city: searchQuery.trim() ? searchQuery.trim() : undefined }));
                        }}
                      />
                      {countries.map(country => (
                        <CountryPill
                          key={country}
                          active={selectedCountry === country}
                          label={country}
                          onClick={() => {
                            const newCountry = country === selectedCountry ? '' : country;
                            setSelectedCountry(newCountry);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12">
            {filteredCities.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200/80 bg-white/70 px-6 py-20 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <MapPin className="h-10 w-10 text-gray-300 dark:text-gray-700" />
                <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-100">No cities match your filters</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Try searching for another city or resetting the filters to explore the full catalog.
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedCities = filteredCities.slice(startIndex, endIndex);

                    return (
                      <>
                        {paginatedCities.map(cityData => {
                          const { city, country, count, featuredImage } = cityData;
                          return (
                            <button
                              key={city}
                              onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                              className={`${CARD_WRAPPER} group cursor-pointer text-left transition hover:-translate-y-1`}
                            >
                              <div className={`${CARD_MEDIA} mb-2 relative overflow-hidden`}>
                                {featuredImage ? (
                                  <Image
                                    src={featuredImage}
                                    alt={capitalizeCity(city)}
                                    fill
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                    className="object-cover transition duration-300 group-hover:scale-105"
                                    quality={80}
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-300 dark:bg-white/[0.02] dark:text-gray-700">
                                    <MapPin className="h-12 w-12" />
                                  </div>
                                )}

                                <div className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm dark:bg-white/80 dark:text-black">
                                  {count}
                                </div>

                                <div className="absolute top-2 right-2">
                                  <FollowCityButton
                                    citySlug={city}
                                    cityName={capitalizeCity(city)}
                                    variant="compact"
                                    showLabel={false}
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <h3 className={`${CARD_TITLE} text-base`}>{capitalizeCity(city)}</h3>
                                <div className={`${CARD_META}`}>
                                  <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                                    <MapPin className="h-3 w-3" />
                                    {country}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {currentPage === 1 && paginatedCities.length >= Math.min(6, itemsPerPage) && (
                          <MultiplexAd slot="3271683710" className="mt-2" />
                        )}
                      </>
                    );
                  })()}
                </div>

                {(() => {
                  const totalPages = Math.ceil(filteredCities.length / itemsPerPage);
                  if (totalPages <= 1) return null;

                  return (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-gray-200/80 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white disabled:opacity-40 disabled:shadow-none disabled:hover:bg-transparent dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/10"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = index + 1;
                          } else if (currentPage <= 3) {
                            pageNum = index + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + index;
                          } else {
                            pageNum = currentPage - 2 + index;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                                currentPage === pageNum
                                  ? 'bg-black text-white shadow-sm shadow-gray-800/20 dark:bg-white dark:text-black'
                                  : 'border border-gray-200/80 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/10'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-gray-200/80 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white disabled:opacity-40 disabled:shadow-none disabled:hover:bg-transparent dark:border-white/10 dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/10"
                      >
                        Next
                      </button>

                      <span className="hidden sm:inline-block text-xs text-gray-500 dark:text-gray-400">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatPill({
  label,
  value,
  subtle,
}: {
  label: string;
  value: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 px-5 py-4 text-sm font-medium text-gray-700 shadow-sm shadow-gray-900/[0.04] dark:border-white/10 dark:text-gray-200 dark:shadow-black/40 ${
        subtle ? 'bg-white/50 dark:bg-white/[0.04]' : 'bg-white dark:bg-white/[0.06]'
      }`}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-gray-500/80 dark:text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function CountryPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-medium transition ${
        active
          ? 'border-gray-900 bg-gray-900 text-white shadow-sm dark:border-white dark:bg-white dark:text-black'
          : 'border-gray-200/80 bg-white/70 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.02] dark:text-gray-300 dark:hover:border-white/20 dark:hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}
