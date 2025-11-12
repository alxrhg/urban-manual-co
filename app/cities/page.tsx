'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Map, LayoutGrid, Plus, SlidersHorizontal } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import { cityCountryMap } from '@/data/cityCountryMap';
import { FollowCityButton } from '@/components/FollowCityButton';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import GreetingHero from '@/src/features/search/GreetingHero';
import { useAuth } from '@/contexts/AuthContext';
import { capitalizeCity } from '@/lib/utils';

interface CityStats {
  city: string;
  country: string;
  count: number;
  featuredImage?: string;
  categories: string[];
  hasMichelin: boolean;
  hasCrown: boolean;
}

export default function CitiesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityStats[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
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
  const [searchTerm, setSearchTerm] = useState('');

  const userName = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    const metadataName = typeof metadata?.name === 'string' ? metadata.name : undefined;
    const emailName = user?.email ? user.email.split('@')[0] : undefined;
    const raw = metadataName ?? emailName;
    if (!raw) return undefined;
    return raw
      .split(/[\s._-]+/)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, [user]);

  const applyFilters = useCallback((
    cities: CityStats[],
    country: string,
    filters: typeof advancedFilters,
    query: string
  ) => {
    let filtered = [...cities];

    // Country filter
    if (country) {
      filtered = filtered.filter(c => c.country === country);
    }

    if (filters.city) {
      filtered = filtered.filter(c => c.city === filters.city);
    }

    if (filters.category) {
      filtered = filtered.filter(c => c.categories.includes(filters.category as string));
    }

    if (filters.michelin) {
      filtered = filtered.filter(c => c.hasMichelin);
    }

    if (filters.crown) {
      filtered = filtered.filter(c => c.hasCrown);
    }

    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery) {
      filtered = filtered.filter(c => {
        const cityName = capitalizeCity(c.city).toLowerCase();
        const countryName = c.country.toLowerCase();
        return cityName.includes(normalizedQuery) || countryName.includes(normalizedQuery);
      });
    }

    setFilteredCities(filtered);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    const fetchCityStats = async () => {
      try {
        // Fetch all destinations with images
        const { data, error } = await supabase
          .from('destinations')
          .select('city, image, category, michelin_stars, crown');

        if (error) throw error;

        const destinations = data as Destination[];

        const globalCategories = new Set<string>();

        // Count cities and get featured image (first destination with image)
        const cityData = destinations.reduce((acc, dest) => {
          if (!acc[dest.city]) {
            acc[dest.city] = {
              count: 0,
              featuredImage: dest.image || undefined,
              categories: new Set<string>(),
              hasMichelin: false,
              hasCrown: false,
            };
          }
          acc[dest.city].count += 1;
          // Update featured image if current one doesn't have image but this one does
          if (!acc[dest.city].featuredImage && dest.image) {
            acc[dest.city].featuredImage = dest.image;
          }
          if (dest.category) {
            const normalizedCategory = dest.category.trim();
            if (normalizedCategory) {
              acc[dest.city].categories.add(normalizedCategory);
              globalCategories.add(normalizedCategory);
            }
          }
          if (!acc[dest.city].hasMichelin && typeof dest.michelin_stars === 'number') {
            acc[dest.city].hasMichelin = dest.michelin_stars > 0;
          }
          if (!acc[dest.city].hasCrown && dest.crown) {
            acc[dest.city].hasCrown = true;
          }
          return acc;
        }, {} as Record<string, { count: number; featuredImage?: string; categories: Set<string>; hasMichelin: boolean; hasCrown: boolean }>);

        const stats = Object.entries(cityData)
          .map(([city, data]) => ({
            city,
            country: cityCountryMap[city] || 'Unknown',
            count: data.count,
            featuredImage: data.featuredImage,
            categories: Array.from(data.categories).sort((a, b) => a.localeCompare(b)),
            hasMichelin: data.hasMichelin,
            hasCrown: data.hasCrown,
          }))
          .sort((a, b) => b.count - a.count); // Sort by count descending

        setCityStats(stats);

        // Extract unique countries
        const uniqueCountries = Array.from(new Set(stats.map(s => s.country).filter(Boolean))) as string[];
        setCountries(uniqueCountries.sort());

        setCategories(Array.from(globalCategories).sort((a, b) => a.localeCompare(b)));
      } catch (error) {
        console.error('Error fetching city stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCityStats();
  }, []);

  useEffect(() => {
    applyFilters(cityStats, selectedCountry, advancedFilters, searchTerm);
  }, [selectedCountry, advancedFilters, cityStats, searchTerm, applyFilters]);

  const availableCities = useMemo(() => cityStats.map(stat => stat.city), [cityStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading cities...</div>
      </div>
    );
  }

  const actionButtonClass =
    'inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-[11px] font-medium uppercase tracking-[1.5px] text-gray-700 transition hover:border-gray-300 hover:bg-white dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60';

  return (
    <main className="relative min-h-screen">
      {/* Hero Section */}
      <section className="min-h-[60vh] flex flex-col px-6 md:px-10 lg:px-12 py-16 md:py-20">
        <div className="w-full flex md:justify-start flex-1">
          <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col">
            <div className="text-left mb-10">
              <h1 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
                All Cities
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span>{cityStats.length} cities around the world</span>
              </div>
            </div>

            <GreetingHero
              searchQuery={searchTerm}
              onSearchChange={value => setSearchTerm(value)}
              onSubmit={query => {
                const normalized = query.trim().toLowerCase();
                if (!normalized) return;
                const match = cityStats.find(stat => stat.city.toLowerCase() === normalized);
                if (match) {
                  router.push(`/city/${encodeURIComponent(match.city)}`);
                }
              }}
              userName={userName}
              isAIEnabled={false}
              isSearching={false}
              filters={advancedFilters}
              availableCities={availableCities}
              availableCategories={categories}
              selectedCity={advancedFilters.city || ''}
              selectedCategory={advancedFilters.category || ''}
              onCitySelect={city => {
                setSelectedCountry('');
                setAdvancedFilters(prev => ({
                  ...prev,
                  city: city || undefined,
                }));
              }}
              onCategorySelect={(category, options) => {
                if (options?.michelin) {
                  setAdvancedFilters(prev => ({
                    ...prev,
                    michelin: prev.michelin ? undefined : true,
                  }));
                  return;
                }

                setAdvancedFilters(prev => ({
                  ...prev,
                  category: prev.category === category ? undefined : category || undefined,
                  michelin: undefined,
                }));
              }}
              showBrowseLists
            />

            {countries.length > 0 && (
              <div className="mt-10">
                <div className="text-[11px] uppercase tracking-[2px] text-gray-400 dark:text-gray-500 mb-4">
                  Countries
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-3 text-xs">
                  <button
                    onClick={() => {
                      setSelectedCountry('');
                    }}
                    className={`transition-all ${
                      !selectedCountry
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    All Countries
                  </button>
                  {countries.map(country => (
                    <button
                      key={country}
                      onClick={() => {
                        const newCountry = country === selectedCountry ? '' : country;
                        setSelectedCountry(newCountry);
                        setAdvancedFilters(prev => ({
                          ...prev,
                          city: undefined,
                        }));
                      }}
                      className={`transition-all ${
                        selectedCountry === country
                          ? 'font-medium text-black dark:text-white'
                          : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 flex flex-wrap items-center gap-3" aria-label="Cities navigation actions">
              <button
                type="button"
                onClick={() => router.push('/trips?new=1')}
                className={actionButtonClass}
              >
                <Plus className="h-4 w-4" />
                Start a Trip
              </button>
              <button
                type="button"
                onClick={() => router.push('/search#filters')}
                className={actionButtonClass}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              <button type="button" className={`${actionButtonClass} bg-black text-white dark:bg-white dark:text-black`}>
                <LayoutGrid className="h-4 w-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => router.push('/map')}
                className={actionButtonClass}
              >
                <Map className="h-4 w-4" />
                Map
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Section */}
      <section className="pb-16 px-6 md:px-10 lg:px-12">
        <div className="container mx-auto px-4 md:px-8 lg:px-12">
          {filteredCities.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-gray-500">No cities found</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                {(() => {
                  const startIndex = (currentPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const paginatedCities = filteredCities.slice(startIndex, endIndex);

                  return paginatedCities.map(cityData => {
                    const { city, country, count, featuredImage } = cityData;
                    return (
                      <button
                        key={city}
                        onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                        className={`${CARD_WRAPPER} cursor-pointer text-left`}
                      >
                        {/* Image Container */}
                        <div className={`${CARD_MEDIA} mb-2 relative overflow-hidden`}>
                          {featuredImage ? (
                            <Image
                              src={featuredImage}
                              alt={capitalizeCity(city)}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              quality={80}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                              <MapPin className="h-12 w-12 opacity-20" />
                            </div>
                          )}

                          {/* City count badge */}
                          <div className="absolute bottom-2 right-2 bg-black/70 dark:bg-white/70 backdrop-blur-sm text-white dark:text-black px-2 py-1 rounded text-xs font-medium">
                            {count}
                          </div>

                          {/* Follow button */}
                          <div className="absolute top-2 right-2">
                            <FollowCityButton
                              citySlug={city}
                              cityName={capitalizeCity(city)}
                              variant="compact"
                              showLabel={false}
                            />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="space-y-0.5">
                          <h3 className={`${CARD_TITLE}`}>{capitalizeCity(city)}</h3>

                          <div className={`${CARD_META}`}>
                            <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {country}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Pagination */}
              {(() => {
                const totalPages = Math.ceil(filteredCities.length / itemsPerPage);
                if (totalPages <= 1) return null;

                return (
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 sm:px-4 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-2.5 sm:px-3 py-2 text-xs rounded-2xl transition-colors ${
                              currentPage === pageNum
                                ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                                : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                      className="px-3 sm:px-4 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>

                    <span className="hidden sm:inline-block ml-4 text-xs text-gray-500 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                );
              })()}

              {/* Horizontal Ad below pagination */}
              {filteredCities.length > 0 && (
                <div className="mt-8 w-full">
                  <div className="max-w-4xl mx-auto border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="text-xs text-gray-400 mb-2 text-center">Sponsored</div>
                    <ins
                      className="adsbygoogle"
                      style={{ display: 'block', height: '90px' }}
                      data-ad-client="ca-pub-3052286230434362"
                      data-ad-slot="3271683710"
                      data-ad-format="horizontal"
                      data-full-width-responsive="false"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
