'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin } from 'lucide-react';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
// Lazy load drawer (only when opened)
const DestinationDrawer = dynamic(
  () => import('@/components/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  { 
    ssr: false,
    loading: () => null
  }
);
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { FollowCityButton } from '@/components/FollowCityButton';
import { SearchFiltersComponent } from '@/components/SearchFilters';
import DynamicPrompt from '@/components/DynamicPrompt';
import dynamic from 'next/dynamic';
import { DestinationCard } from '@/components/DestinationCard';

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CityPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const city = decodeURIComponent(params.city as string);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
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
    fetchDestinations();
    if (user) {
      fetchVisitedPlaces();
    }
    // Reset to page 1 when city changes
    setCurrentPage(1);
  }, [city, user]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('slug, name, city, category, description, content, image, michelin_stars, crown')
        .eq('city', city)
        .order('name');

      if (error) throw error;
      const dests = data || [];
      setDestinations(dests);
      
      // Extract unique categories
      const uniqueCategories = Array.from(new Set(dests.map(d => d.category).filter(Boolean))) as string[];
      setCategories(uniqueCategories);
      
      // Apply initial filtering
      applyFilters(dests, selectedCategory, advancedFilters);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      setDestinations([]);
      setFilteredDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dests: Destination[], category: string, filters: typeof advancedFilters) => {
    let filtered = [...dests];
    
    // Category filter
    if (category) {
      filtered = filtered.filter(d => d.category === category);
    }
    
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    // Advanced filters
    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }
    if (filters.crown) {
      filtered = filtered.filter(d => d.crown);
    }
    
    setFilteredDestinations(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  };

  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters(destinations, selectedCategory, advancedFilters);
    }
  }, [selectedCategory, advancedFilters]);

  const fetchVisitedPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (error) throw error;

      const slugs = new Set(data?.map(v => v.destination_slug) || []);
      setVisitedSlugs(slugs);
    } catch (error) {
      console.error('Error fetching visited places:', error);
    }
  };

  function capitalizeCategory(category: string): string {
    return category
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const cityDisplayName = capitalizeCity(city);
  const country = cityCountryMap[city] || 'Unknown';

  return (
    <>
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
                        {cityDisplayName}'s Manual
                      </h1>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <MapPin className="h-4 w-4" />
                        <span>{country}</span>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span>{destinations.length} destination{destinations.length !== 1 ? 's' : ''}</span>
                      </div>
                      {user && (
                        <div className="mt-4">
                          <FollowCityButton 
                            citySlug={city}
                            cityName={cityDisplayName}
                            variant="default"
                            showLabel={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Category List - Uses space below greeting, aligned to bottom */}
                {categories.length > 0 && (
                  <div className="flex-1 flex items-end">
                    <div className="w-full pt-8">
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                        <button
                          onClick={() => {
                            setSelectedCategory("");
                            setAdvancedFilters(prev => ({ ...prev, category: undefined }));
                          }}
                          className={`transition-all ${
                            !selectedCategory
                              ? "font-medium text-black dark:text-white"
                              : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                          }`}
                        >
                          All Categories
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => {
                              const newCategory = category === selectedCategory ? "" : category;
                              setSelectedCategory(newCategory);
                              setAdvancedFilters(prev => ({ ...prev, category: newCategory || undefined }));
                            }}
                            className={`transition-all ${
                              selectedCategory === category
                                ? "font-medium text-black dark:text-white"
                                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                            }`}
                          >
                            {capitalizeCategory(category)}
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
              {/* Dynamic AI Prompt for City */}
              <DynamicPrompt 
                city={cityDisplayName}
                category={selectedCategory}
                className="mb-6"
              />
              
              {/* Personalized Recommendations for this city (if user is logged in) */}
              {user && filteredDestinations.length > 0 && (
                <PersonalizedRecommendations
                  limit={6}
                  title={`Recommended in ${cityDisplayName}`}
                  showTitle={true}
                  filterCity={city}
                  onDestinationClick={(destination) => {
                    setSelectedDestination(destination);
                    setIsDrawerOpen(true);
                  }}
                  className="mb-12"
                />
              )}

              {/* Destinations Grid */}
              {filteredDestinations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No destinations found in {cityDisplayName}.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                  {(() => {
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const endIndex = startIndex + itemsPerPage;
                    const paginatedDestinations = filteredDestinations.slice(startIndex, endIndex);
                    return paginatedDestinations.map((destination, index) => (
                      <DestinationCard
                        key={destination.slug}
                        destination={destination}
                        index={startIndex + index}
                        isVisited={visitedSlugs.has(destination.slug)}
                        onClick={() => {
                          setSelectedDestination(destination);
                          setIsDrawerOpen(true);
                        }}
                      />
                    ));
                  })()}
                </div>

                {/* Pagination */}
                {(() => {
                  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);
                  if (totalPages <= 1) return null;
                  
                  return (
                    <div className="mt-8 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                                  : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      
                      <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
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

      {/* Destination Drawer */}
      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDestination(null);
        }}
        onSaveToggle={async (slug: string) => {
          if (user) {
            const { data } = await supabase
              .from('saved_places')
              .select('id')
              .eq('user_id', user.id)
              .eq('destination_slug', slug)
              .single();

            if (data) {
              await supabase
                .from('saved_places')
                .delete()
                .eq('user_id', user.id)
                .eq('destination_slug', slug);
            } else {
              await supabase
                .from('saved_places')
                .insert({ user_id: user.id, destination_slug: slug });
            }
          }
        }}
        onVisitToggle={async (slug: string) => {
          if (user) {
            const { data } = await supabase
              .from('visited_places')
              .select('id')
              .eq('user_id', user.id)
              .eq('destination_slug', slug)
              .single();

            if (data) {
              await supabase
                .from('visited_places')
                .delete()
                .eq('user_id', user.id)
                .eq('destination_slug', slug);
              setVisitedSlugs(prev => {
                const next = new Set(prev);
                next.delete(slug);
                return next;
              });
            } else {
              await supabase
                .from('visited_places')
                .insert({ user_id: user.id, destination_slug: slug });
              setVisitedSlugs(prev => new Set(prev).add(slug));
            }
            // Refresh visited places
            fetchVisitedPlaces();
          }
        }}
      />
    </>
  );
}
