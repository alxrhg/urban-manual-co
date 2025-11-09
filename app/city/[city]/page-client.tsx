'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { DestinationCard, LazyDestinationCard } from '@/components/DestinationCard';
import { ProgressiveGrid } from '@/components/ProgressiveGrid';
import { DestinationCardSkeleton } from '@/components/skeletons/DestinationCardSkeleton';
import { MultiplexAd } from '@/components/GoogleAd';
import { CityClock } from '@/components/CityClock';

const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  {
    ssr: false,
    loading: () => null,
  }
);

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function capitalizeCategory(category: string): string {
  return category
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function CityPageClient() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const citySlug = decodeURIComponent(params.city as string);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 28;

  useEffect(() => {
    setLoading(true);
    fetchDestinations();
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
    setCurrentPage(1);
  }, [citySlug, user]);

  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters(destinations, selectedCategory, advancedFilters);
    } else {
      setFilteredDestinations([]);
    }
  }, [destinations, selectedCategory, advancedFilters]);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select(
          'slug, name, city, neighborhood, category, description, content, image, michelin_stars, crown, opening_hours, rating, tags'
        )
        .eq('city', citySlug)
        .order('name');

      if (error) throw error;

      const results = (data || []) as any[];
      setDestinations(results);

      const uniqueCategories = Array.from(new Set(results.map((d: any) => d.category).filter(Boolean))) as string[];
      setCategories(uniqueCategories);

      applyFilters(results, selectedCategory, advancedFilters);
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setDestinations([]);
      setFilteredDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dests: Destination[], category: string, filters: typeof advancedFilters) => {
    let filtered = [...dests];

    if (category) {
      filtered = filtered.filter(d => {
        const categoryMatch = d.category && d.category.toLowerCase().trim() === category.toLowerCase().trim();
        
        // If category matches, include it
        if (categoryMatch) return true;
        
        // Also check tags for category-related matches
        const tags = d.tags || [];
        const categoryLower = category.toLowerCase().trim();
        
        // Map categories to relevant tag patterns
        const categoryTagMap: Record<string, string[]> = {
          'dining': ['restaurant', 'dining', 'fine-dining', 'italian_restaurant', 'mexican_restaurant', 'japanese_restaurant', 'french_restaurant', 'chinese_restaurant', 'thai_restaurant', 'indian_restaurant', 'seafood_restaurant', 'steak_house', 'pizza', 'food'],
          'cafe': ['cafe', 'coffee_shop', 'coffee', 'bakery', 'pastry'],
          'bar': ['bar', 'pub', 'cocktail_bar', 'wine_bar', 'beer', 'nightclub', 'lounge'],
          'hotel': ['hotel', 'lodging', 'resort', 'inn', 'hostel'],
          'shopping': ['store', 'shopping', 'mall', 'market', 'boutique'],
          'attraction': ['tourist_attraction', 'museum', 'park', 'landmark', 'monument'],
          'nightlife': ['nightclub', 'bar', 'pub', 'lounge', 'entertainment'],
        };
        
        // Get relevant tags for this category
        const relevantTags = categoryTagMap[categoryLower] || [];
        
        // Check if any tags match
        const tagMatch = tags.some(tag => {
          const tagLower = tag.toLowerCase();
          return relevantTags.some(relevantTag => 
            tagLower.includes(relevantTag) || relevantTag.includes(tagLower)
          );
        });
        
        return tagMatch;
      });
    }

    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }
    if (filters.crown) {
      filtered = filtered.filter(d => d.crown);
    }

    setFilteredDestinations(filtered);
    setCurrentPage(1);
  };

  const fetchVisitedPlaces = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('visited_places')
        .select('destination_slug')
        .eq('user_id', user.id);

      if (error) throw error;

      const slugSet = new Set((data as any[])?.map((entry: any) => entry.destination_slug) || []);
      setVisitedSlugs(slugSet);
    } catch (err) {
      console.error('Error fetching visited destinations:', err);
    }
  };

  if (loading) {
    return (
      <main className="px-8 py-20">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </main>
    );
  }

  const cityDisplayName = capitalizeCity(citySlug);
  const country = cityCountryMap[citySlug] || '';

  const handleCategorySelect = (category: string) => {
    const nextCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(nextCategory);
    setAdvancedFilters(prev => ({ ...prev, category: nextCategory || undefined }));
  };

  const paginatedDestinations = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDestinations.slice(start, end);
  })();

  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  return (
    <>
      <main className="px-8 py-20 min-h-screen">
        <div className="max-w-[1800px] mx-auto space-y-12">
          {/* Header */}
          <div>
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-black dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>

            <div className="space-y-2">
              {country && <p className="text-xs text-gray-500">{country}</p>}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl sm:text-4xl font-light">{cityDisplayName}</h1>
                  <p className="text-xs text-gray-500 mt-1">
                    {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                  </p>
                </div>
                <CityClock citySlug={citySlug} />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                <button
                  onClick={() => handleCategorySelect('')}
                  className={`transition-all ${
                    !selectedCategory
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategorySelect(category)}
                    className={`transition-all ${
                      selectedCategory === category
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    {capitalizeCategory(category)}
                  </button>
                ))}
              </div>
            )}

            {/* Advanced Filters */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <button
                onClick={() => setAdvancedFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                className={`flex items-center gap-1.5 transition-all ${
                  advancedFilters.michelin
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                <img
                  src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                  alt="Michelin star"
                  className="h-3 w-3"
                />
                Michelin
              </button>
              <button
                onClick={() => setAdvancedFilters(prev => ({ ...prev, crown: !prev.crown }))}
                className={`flex items-center gap-1.5 transition-all ${
                  advancedFilters.crown
                    ? 'font-medium text-black dark:text-white'
                    : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                }`}
              >
                Crown
              </button>
            </div>
          </div>

          {/* Destinations Grid */}
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-sm text-gray-500">No destinations found in {cityDisplayName}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <ProgressiveGrid
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6"
                skeletonComponent={<DestinationCardSkeleton />}
                threshold={0.1}
                rootMargin="100px"
              >
                {paginatedDestinations.map((destination, index) => {
                  const isVisited = !!(user && visitedSlugs.has(destination.slug));

                  return (
                    <LazyDestinationCard
                      key={destination.slug}
                      destination={destination}
                      onClick={() => {
                        setSelectedDestination(destination);
                        setIsDrawerOpen(true);
                      }}
                      index={index}
                      isVisited={isVisited}
                      showBadges={true}
                    />
                  );
                })}
              </ProgressiveGrid>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="w-full flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 sm:px-4 py-2 text-xs border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                      let pageNumber: number;

                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = currentPage - 2 + index;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`px-2.5 sm:px-3 py-2 text-xs rounded-2xl transition-all ${
                            currentPage === pageNumber
                              ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                              : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900'
                          }`}
                        >
                          {pageNumber}
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
                </div>
              )}

              {/* Ad after grid */}
              <MultiplexAd slot="3271683710" />
            </div>
          )}
        </div>
      </main>

      <DestinationDrawer
        destination={selectedDestination}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedDestination(null);
        }}
        onSaveToggle={async (slug: string) => {
          if (!user) return;

          const { data } = await supabase
            .from('saved_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', slug)
            .single();

          if (data) {
            await supabase.from('saved_places').delete().eq('user_id', user.id).eq('destination_slug', slug);
          } else {
            await (supabase.from('saved_places').insert as any)({ user_id: user.id, destination_slug: slug });
          }
        }}
        onVisitToggle={async (slug: string) => {
          if (!user) return;

          const { data } = await supabase
            .from('visited_places')
            .select('id')
            .eq('user_id', user.id)
            .eq('destination_slug', slug)
            .single();

          if (data) {
            await supabase.from('visited_places').delete().eq('user_id', user.id).eq('destination_slug', slug);
            setVisitedSlugs(prev => {
              const next = new Set(prev);
              next.delete(slug);
              return next;
            });
          } else {
            await (supabase.from('visited_places').insert as any)({ user_id: user.id, destination_slug: slug });
            setVisitedSlugs(prev => {
              const next = new Set(prev);
              next.add(slug);
              return next;
            });
          }
        }}
      />
    </>
  );
}
