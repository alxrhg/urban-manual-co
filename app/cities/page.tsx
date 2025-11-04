'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin } from 'lucide-react';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import { cityCountryMap } from '@/data/cityCountryMap';
import { FollowCityButton } from '@/components/FollowCityButton';
import Image from 'next/image';
import { MultiplexAd } from '@/components/GoogleAd';

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
  const itemsPerPage = 21; // ~3 rows at 7 columns, fits in ~1vh
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

  useEffect(() => {
    fetchCityStats();
  }, []);

  useEffect(() => {
    applyFilters(cityStats, selectedCountry, advancedFilters);
  }, [selectedCountry, advancedFilters, cityStats]);

  const applyFilters = (cities: CityStats[], country: string, filters: typeof advancedFilters) => {
    let filtered = [...cities];
    
    // Country filter
    if (country) {
      filtered = filtered.filter(c => c.country === country);
    }
    
    setFilteredCities(filtered);
    // Reset to page 1 when filters change
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500">Loading cities...</div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen">
      {/* Hero Section - Matching homepage design */}
      <section className="min-h-[70vh] flex flex-col px-8 py-20">
        <div className="w-full flex md:justify-start flex-1 items-center">
            <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
              {/* Greeting - Always vertically centered */}
              <div className="flex-1 flex items-center">
                <div className="w-full">
                  <div className="text-left mb-8">
                    <h1 className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-[2px] font-medium">
                      All Cities
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span>{cityStats.length} cities around the world</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Country List - Uses space below greeting, aligned to bottom */}
              {countries.length > 0 && (
                <div className="flex-1 flex items-end">
                  <div className="w-full pt-8">
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                      <button
                        onClick={() => {
                          setSelectedCountry("");
                          setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                        }}
                        className={`transition-all ${
                          !selectedCountry
                            ? "font-medium text-black dark:text-white"
                            : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                        }`}
                      >
                        All Countries
                      </button>
                      {countries.map((country) => (
                        <button
                          key={country}
                          onClick={() => {
                            const newCountry = country === selectedCountry ? "" : country;
                            setSelectedCountry(newCountry);
                            setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                          }}
                          className={`transition-all ${
                            selectedCountry === country
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                          }`}
                        >
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        {/* Grid - Right below filter lists */}
        <div className="mt-8 pb-8 px-8">
            <div className="max-w-[1800px] mx-auto">
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

                  // Inject ads every 14 items
                  const withAds: Array<{ type: 'city' | 'ad'; data: any; index: number }> = [];
                  paginatedCities.forEach((cityData, index) => {
                    withAds.push({ type: 'city', data: cityData, index });
                    // Add ad after every 14th item (but not at the very end)
                    if ((index + 1) % 14 === 0 && index < paginatedCities.length - 1) {
                      withAds.push({ type: 'ad', data: { slot: '1234567890' }, index: index + 0.5 });
                    }
                  });

                  return withAds.map((item) => {
                    if (item.type === 'ad') {
                      return (
                        <MultiplexAd
                          key={`ad-${item.index}`}
                          slot={item.data.slot}
                        />
                      );
                    }

                    const { city, country, count, featuredImage } = item.data;
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
                        <h3 className={`${CARD_TITLE}`}>
                          {capitalizeCity(city)}
                        </h3>

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
                          className="px-3 sm:px-4 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
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
                          className="px-3 sm:px-4 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>

                        <span className="hidden sm:inline-block ml-4 text-xs text-gray-500 dark:text-gray-400">
                          Page {currentPage} of {totalPages}
                        </span>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
      </section>
    </main>
  );
}
