'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowLeft, Loader2, X } from "lucide-react";
import Image from "next/image";

import { cityCountryMap } from "@/data/cityCountryMap";
import { SubpageHero } from "@/components/layout/SubpageHero";
import { ContentCard } from "@/components/layout/ContentCard";
import { UniversalGrid } from "@/components/UniversalGrid";
import { DestinationCard } from "@/components/DestinationCard";
import { supabase } from "@/lib/supabase";
import { Destination } from "@/types/destination";
import { useItemsPerPage } from "@/hooks/useGridColumns";
import { useToast } from "@/hooks/useToast";

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

// Convert CityStats to Destination format for DestinationCard
function cityStatsToDestination(cityData: CityStats): Destination {
  return {
    slug: cityData.city,
    name: capitalizeCity(cityData.city),
    city: cityData.city,
    category: `${cityData.count} places`,
    micro_description: `${cityData.country}`,
    image: cityData.featuredImage,
    image_thumbnail: cityData.featuredImage,
  };
}

export default function CitiesPage() {
  const router = useRouter();
  const toast = useToast();
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
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-xs text-gray-500 dark:text-gray-400">Loading cities…</div>
        </div>
      </main>
    );
  }

  // Featured cities (top 4 by count from all cities)
  const featuredCities = cityStats.slice(0, 4);
  const heroMeta = [
    { label: "Cities", value: cityStats.length.toString() },
    { label: "Countries", value: countries.length.toString() },
    { label: "Featured", value: featuredCities.length.toString() },
    { label: "Visible now", value: `${filteredCities.length} results` },
  ];
  const heroPills = [
    { label: selectedCountry ? `Focused on ${selectedCountry}` : "All countries" },
    { label: `${displayCount} showing • ${filteredCities.length} total` },
  ];

  return (
    <>
      <main className="w-full px-6 md:px-10 py-20 min-h-screen">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          </div>

          <SubpageHero
            eyebrow="Cities"
            title="Discover destinations by city"
            description="Every city card reuses the homepage cards and account-style stats so the transition feels seamless. Filter by country or dive straight into the featured carousel."
            meta={heroMeta}
            pills={heroPills}
            actions={
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Data refreshes nightly from Supabase + editorial notes
              </span>
            }
          />

          {featuredCities.length > 0 && (
            <ContentCard
              title="Featured cities"
              description="Most explored destinations this month."
            >
              <div className="relative -mx-6 md:-mx-8">
                <div className="overflow-x-auto scrollbar-hide px-6 md:px-8">
                  <div className="flex gap-5 md:gap-7 lg:gap-8 pb-2">
                    {featuredCities.map(cityData => (
                      <div key={cityData.city} className="flex-shrink-0 w-[260px] sm:w-[300px] md:w-[340px]">
                        <DestinationCard
                          destination={cityStatsToDestination(cityData)}
                          onClick={() => router.push(`/city/${encodeURIComponent(cityData.city)}`)}
                          showBadges={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ContentCard>
          )}

          {countries.length > 0 && (
            <ContentCard
              variant="muted"
              title="Explore by country"
              description="Use the text-tab filters borrowed from the account page to narrow the grid."
            >
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedCountry("");
                    setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    !selectedCountry
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  All countries
                </button>
                {countries.map(country => (
                  <button
                    key={country}
                    onClick={() => {
                      const newCountry = country === selectedCountry ? "" : country;
                      setSelectedCountry(newCountry);
                      setAdvancedFilters(prev => ({ ...prev, city: undefined }));
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                      selectedCountry === country
                        ? "bg-white text-neutral-900 shadow-sm dark:bg-white/10 dark:text-white"
                        : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
            </ContentCard>
          )}

          <ContentCard
            title="All cities"
            description={`${filteredCities.length} curated hubs. Tap a card to open the destination drawer for that city.`}
          >
            {filteredCities.length === 0 ? (
              <div className="text-center py-16">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">No cities found</span>
              </div>
            ) : (
              <>
                <UniversalGrid
                  items={filteredCities.slice(0, displayCount)}
                  gap="md"
                  renderItem={cityData => (
                    <DestinationCard
                      key={cityData.city}
                      destination={cityStatsToDestination(cityData)}
                      onClick={() => router.push(`/city/${encodeURIComponent(cityData.city)}`)}
                      showBadges={false}
                    />
                  )}
                />

                {displayCount < filteredCities.length && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => setDisplayCount(prev => prev + itemsPerPage)}
                      className="rounded-full border border-neutral-200/70 px-6 py-3 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
                    >
                      Show more ({filteredCities.length - displayCount} remaining)
                    </button>
                  </div>
                )}

                {filteredCities.length > 0 && (
                  <div className="mt-8 w-full">
                    <div className="max-w-4xl mx-auto rounded-2xl border border-neutral-200/70 p-4 text-center text-xs text-neutral-400 dark:border-white/10 dark:text-neutral-500">
                      Sponsored placement
                    </div>
                  </div>
                )}
              </>
            )}
          </ContentCard>
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
