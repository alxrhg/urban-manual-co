'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, ArrowLeft, PencilLine, Loader2, X } from 'lucide-react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { FollowCityButton } from '@/components/FollowCityButton';
import { UniversalGrid } from '@/components/UniversalGrid';
import Image from 'next/image';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { toast } from 'sonner';

interface CityStats {
  city: string;
  country: string;
  count: number;
  featuredImage?: string;
}

interface CityEditDrawerProps {
  city: CityStats | null;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (country: string) => Promise<void>;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeCityKey(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export default function CitiesPage() {
  const router = useRouter();
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [filteredCities, setFilteredCities] = useState<CityStats[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(true);
  const itemsPerPage = useItemsPerPage(4); // Items to add per "Show More" click
  const [displayCount, setDisplayCount] = useState(itemsPerPage); // Initial display count
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [cityToEdit, setCityToEdit] = useState<CityStats | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSavingCity, setIsSavingCity] = useState(false);

  useEffect(() => {
    fetchCityStats();
  }, []);

  useEffect(() => {
    applyFilters(cityStats, selectedCountry, advancedFilters);
  }, [selectedCountry, advancedFilters, cityStats]);

  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/is-admin');
        if (!response.ok) {
          if (isMounted) setIsAdmin(false);
          return;
        }
        const data = await response.json();
        if (isMounted) {
          setIsAdmin(Boolean(data.isAdmin));
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        if (isMounted) setIsAdmin(false);
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const applyFilters = (cities: CityStats[], country: string, filters: typeof advancedFilters) => {
    let filtered = [...cities];
    
    // Country filter
    if (country) {
      filtered = filtered.filter(c => c.country === country);
    }
    
    setFilteredCities(filtered);
    // Reset display count when filters change
    setDisplayCount(itemsPerPage);
  };

  const fetchCityStats = async () => {
    try {
      // Fetch all destinations with images
      const { data, error } = await supabase
        .from('destinations')
        .select('city, image, country');

      if (error) throw error;

      const destinations = data as Destination[];

      // Count cities and get featured image (first destination with image)
      const cityData = destinations.reduce((acc, dest) => {
        const citySlug = dest.city?.trim();
        if (!citySlug) return acc;

        if (!acc[citySlug]) {
          const normalizedKey = normalizeCityKey(citySlug);
          const inferredCountry =
            dest.country ||
            cityCountryMap[normalizedKey] ||
            cityCountryMap[citySlug] ||
            'Unknown';

          acc[citySlug] = {
            count: 0,
            featuredImage: dest.image || undefined,
            country: inferredCountry,
          };
        }

        acc[citySlug].count += 1;

        // Update featured image if current one doesn't have image but this one does
        if (!acc[citySlug].featuredImage && dest.image) {
          acc[citySlug].featuredImage = dest.image;
        }

        if ((!acc[citySlug].country || acc[citySlug].country === 'Unknown') && dest.country) {
          acc[citySlug].country = dest.country;
        }

        return acc;
      }, {} as Record<string, { count: number; featuredImage?: string; country: string }>);

      const stats = Object.entries(cityData)
        .map(([city, data]) => ({
          city,
          country: data.country || cityCountryMap[normalizeCityKey(city)] || cityCountryMap[city] || 'Unknown',
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

  const handleCityEditClick = (event: MouseEvent<HTMLButtonElement>, cityData: CityStats) => {
    event.preventDefault();
    event.stopPropagation();
    setCityToEdit(cityData);
    setIsEditDrawerOpen(true);
  };

  const handleSaveCity = async (countryName: string) => {
    if (!cityToEdit) return;

    const trimmedCountry = countryName.trim();
    if (!trimmedCountry) {
      toast.error('Country is required');
      return;
    }

    try {
      setIsSavingCity(true);
      const { error } = await supabase
        .from('destinations')
        .update({ country: trimmedCountry })
        .eq('city', cityToEdit.city);

      if (error) {
        throw error;
      }

      toast.success('City details updated');
      await fetchCityStats();
      setIsEditDrawerOpen(false);
      setCityToEdit(null);
    } catch (error) {
      console.error('Error updating city country:', error);
      toast.error('Failed to update city');
    } finally {
      setIsSavingCity(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-600 dark:text-gray-400">Loading cities…</div>
        </div>
      </main>
    );
  }

  // Featured cities (top 4 by count from all cities)
  const featuredCities = cityStats.slice(0, 4);

  return (
    <>
      <main className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="px-6 md:px-10 lg:px-12 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 ease-out mb-8"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Discovery</span>
          </button>

          {/* Hero Content */}
          <div className="space-y-4 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-black dark:text-white">
              Cities Around the World
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              Explore destinations curated by locals and travelers. Each city tells a story through its places—from hidden cafes to celebrated landmarks.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {cityStats.length} cities • {countries.length} countries
            </p>
          </div>

          {/* Country Filter Panel */}
          {countries.length > 0 && (
            <div className="mb-12">
              <div className="mb-4">
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                  Explore by Country
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Select a country to discover its cities
                </p>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-3">
                <button
                  onClick={() => {
                    setSelectedCountry("");
                    setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                  }}
                  className={`text-xs font-medium transition-all duration-200 ease-out ${
                    !selectedCountry
                      ? "text-black dark:text-white"
                      : "text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
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
                    className={`text-xs font-medium transition-all duration-200 ease-out ${
                      selectedCountry === country
                        ? "text-black dark:text-white"
                        : "text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Cities */}
          {featuredCities.length > 0 && !selectedCountry && (
            <div className="mb-12 pt-12 border-t border-gray-200 dark:border-gray-800">
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-black dark:text-white">Featured Cities</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Most explored destinations this month
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredCities.map((cityData) => {
                  const { city, country, count, featuredImage } = cityData;
                  return (
                    <button
                      key={city}
                      onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                      className="text-left group"
                    >
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-800">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(event) => handleCityEditClick(event, cityData)}
                            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/90 dark:bg-black/80 text-gray-900 dark:text-white border border-gray-200/70 dark:border-gray-700/60 shadow-sm hover:bg-white dark:hover:bg-gray-900 transition-colors"
                          >
                            <PencilLine className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {featuredImage ? (
                          <Image
                            src={featuredImage}
                            alt={capitalizeCity(city)}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={85}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <MapPin className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-sm font-medium mb-1 text-black dark:text-white">{capitalizeCity(city)}</h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{country} • {count} places</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Grid Section */}
      <div className="pb-12 px-6 md:px-10 lg:px-12">
        <div className="max-w-7xl mx-auto">
          {filteredCities.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-sm text-gray-600 dark:text-gray-400">No cities found</span>
            </div>
          ) : (
            <>
              <UniversalGrid
                items={filteredCities.slice(0, displayCount)}
                gap="sm"
                renderItem={(cityData) => {
                  const { city, country, count, featuredImage } = cityData;
                  return (
                    <button
                      key={city}
                      onClick={() => router.push(`/city/${encodeURIComponent(city)}`)}
                      className="text-left group"
                    >
                      {/* Image Container */}
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-3 border border-gray-200 dark:border-gray-800 group-hover:opacity-80 transition-opacity">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(event) => handleCityEditClick(event, cityData)}
                            className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/90 dark:bg-black/80 text-gray-900 dark:text-white border border-gray-200/70 dark:border-gray-700/60 shadow-sm hover:bg-white dark:hover:bg-gray-900 transition-colors"
                          >
                            <PencilLine className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                        {featuredImage ? (
                          <Image
                            src={featuredImage}
                            alt={capitalizeCity(city)}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            quality={80}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <MapPin className="h-12 w-12 opacity-20" />
                          </div>
                        )}
                        
                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Count badge */}
                        <div className="absolute bottom-2 right-2 bg-white/90 dark:bg-black/90 backdrop-blur-sm text-gray-700 dark:text-gray-300 px-2 py-1 rounded-2xl text-xs font-medium border border-gray-200/50 dark:border-gray-700/50">
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
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-black dark:text-white line-clamp-1">
                          {capitalizeCity(city)}
                        </h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {country}
                        </p>
                      </div>
                    </button>
                  );
                }}
              />

              {/* Show More Button */}
              {displayCount < filteredCities.length && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                    className="px-6 py-3 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:opacity-60 transition-all duration-200 ease-out text-gray-900 dark:text-white"
                  >
                    Show More ({filteredCities.length - displayCount} remaining)
                  </button>
                </div>
              )}

              {/* Horizontal Ad below pagination */}
              {filteredCities.length > 0 && (
                <div className="mt-8 w-full">
                  <div className="max-w-4xl mx-auto border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-white dark:bg-gray-900">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 text-center uppercase tracking-wide">Sponsored</div>
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
      </div>
      </main>

      {isAdmin && (
        <CityEditDrawer
          city={cityToEdit}
          isOpen={isEditDrawerOpen}
          isSaving={isSavingCity}
          onClose={() => {
            setIsEditDrawerOpen(false);
            setCityToEdit(null);
          }}
          onSave={handleSaveCity}
        />
      )}
    </>
  );
}

function CityEditDrawer({ city, isOpen, isSaving, onClose, onSave }: CityEditDrawerProps) {
  const [countryInput, setCountryInput] = useState('');

  useEffect(() => {
    setCountryInput(city?.country || '');
  }, [city]);

  if (!isOpen || !city) return null;

  const handleSave = () => {
    onSave(countryInput);
  };

  return (
    <div className="fixed inset-0 z-[70] flex">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />
      <div className="relative ml-auto h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-1">Editing City</p>
            <h2 className="text-2xl font-bold text-black dark:text-white">{capitalizeCity(city.city)}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Slug: {city.city}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isSaving) onClose();
            }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close city edit drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide mb-2 text-gray-500 dark:text-gray-400">
              Country
            </label>
            <input
              type="text"
              value={countryInput}
              onChange={(event) => setCountryInput(event.target.value)}
              placeholder="e.g., Japan"
              className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This updates the country for all destinations within this city.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !countryInput.trim()}
            className="flex-1 px-4 py-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
