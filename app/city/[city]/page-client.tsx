'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { MapPin } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { CARD_WRAPPER, CARD_MEDIA, CARD_META, CARD_TITLE } from '@/components/CardStyles';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { FollowCityButton } from '@/components/FollowCityButton';
import DynamicPrompt from '@/components/DynamicPrompt';
import { PageIntro } from '@/components/PageIntro';
import { PageContainer } from '@/components/PageContainer';
import { TrendingSection } from '@/components/TrendingSection';

const DestinationDrawer = dynamic(
  () => import('@/components/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
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
  const params = useParams();
  const citySlug = decodeURIComponent(params.city as string);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
    openNow?: boolean;
    minRating?: number;
    category?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 21;

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
          'slug, name, city, category, description, content, image, michelin_stars, crown, opening_hours, rating'
        )
        .eq('city', citySlug)
        .order('name');

      if (error) throw error;

      const results = data || [];
      setDestinations(results);

      const uniqueCategories = Array.from(new Set(results.map(d => d.category).filter(Boolean))) as string[];
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
      filtered = filtered.filter(d => d.category === category);
    }

    if (filters.michelin) {
      filtered = filtered.filter(d => d.michelin_stars && d.michelin_stars > 0);
    }
    if (filters.crown) {
      filtered = filtered.filter(d => d.crown);
    }
    if (filters.openNow) {
      filtered = filtered.filter(d => d.opening_hours?.open_now);
    }
    if (typeof filters.minRating === 'number') {
      const threshold = filters.minRating;
      filtered = filtered.filter(d => (d.rating ?? 0) >= threshold);
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

      const slugSet = new Set(data?.map(entry => entry.destination_slug) || []);
      setVisitedSlugs(slugSet);
    } catch (err) {
      console.error('Error fetching visited destinations:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  const cityDisplayName = capitalizeCity(citySlug);
  const country = cityCountryMap[citySlug] || 'Unknown';
  const introDescription = [
    country !== 'Unknown' ? country : undefined,
    `${filteredDestinations.length || destinations.length} destination${
      (filteredDestinations.length || destinations.length) === 1 ? '' : 's'
    }`,
  ]
    .filter(Boolean)
    .join(' • ');

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
      <main className="pb-16">
        <PageIntro
          eyebrow={`${cityDisplayName}'s Manual`}
          title={`Discover ${cityDisplayName}`}
          description={introDescription}
          actions={
            user ? (
              <FollowCityButton citySlug={citySlug} cityName={cityDisplayName} variant="default" showLabel />
            ) : undefined
          }
        />

        <PageContainer className="space-y-10">
          {categories.length > 0 && (
            <div className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/70 px-6 py-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[1.5px] text-gray-600 dark:text-gray-400">
                    Categories
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setAdvancedFilters(prev => ({ ...prev, category: undefined }));
                    }}
                    className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                      !selectedCategory
                        ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                        : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-black'
                    }`}
                  >
                    View All
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-all ${
                        selectedCategory === category
                          ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                          : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-black'
                      }`}
                    >
                      {capitalizeCategory(category)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs">
            <button
              onClick={() => setAdvancedFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                advancedFilters.michelin
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-black'
              }`}
            >
              Michelin
            </button>
            <button
              onClick={() => setAdvancedFilters(prev => ({ ...prev, crown: !prev.crown }))}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                advancedFilters.crown
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-black'
              }`}
            >
              Crowned
            </button>
            <button
              onClick={() => setAdvancedFilters(prev => ({ ...prev, openNow: !prev.openNow }))}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                advancedFilters.openNow
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-black'
              }`}
            >
              Open now
            </button>
            <button
              onClick={() =>
                setAdvancedFilters(prev => ({ ...prev, minRating: prev.minRating ? undefined : 4.5 }))
              }
              className={`px-3 py-1.5 rounded-full border transition-all ${
                advancedFilters.minRating
                  ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                  : 'border-gray-300 text-gray-700 dark:text-gray-300 hover:border-black'
              }`}
            >
              Rating 4.5+
            </button>
          </div>

          <DynamicPrompt city={cityDisplayName} category={selectedCategory} className="mb-2" />

          <TrendingSection city={citySlug} />

          {user && filteredDestinations.length > 0 && (
            <PersonalizedRecommendations
              limit={6}
              title={`Recommended in ${cityDisplayName}`}
              showTitle
              filterCity={citySlug}
              onDestinationClick={destination => {
                setSelectedDestination(destination);
                setIsDrawerOpen(true);
              }}
              className="rounded-[32px] border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-950/70 px-4 py-4"
            />
          )}

          {filteredDestinations.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-gray-300 dark:border-gray-700 px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              No destinations found in {cityDisplayName}.
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
                {paginatedDestinations.map((destination, index) => {
                  const isVisited = user && visitedSlugs.has(destination.slug);

                  return (
                    <button
                      key={destination.slug}
                      onClick={() => {
                        setSelectedDestination(destination);
                        setIsDrawerOpen(true);
                      }}
                      className={`${CARD_WRAPPER} cursor-pointer text-left transition-transform duration-300 hover:-translate-y-1 ${
                        isVisited ? 'opacity-70' : ''
                      }`}
                    >
                      <div className={`${CARD_MEDIA} mb-2 relative`}>
                        {destination.image ? (
                          <Image
                            src={destination.image}
                            alt={destination.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
                              isVisited ? 'grayscale' : ''
                            }`}
                            quality={80}
                            loading={index < 6 ? 'eager' : 'lazy'}
                            fetchPriority={index === 0 ? 'high' : 'auto'}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                            <MapPin className="h-12 w-12 opacity-20" />
                          </div>
                        )}

                        {destination.michelin_stars && destination.michelin_stars > 0 && (
                          <div className="absolute bottom-2 left-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                            <Image
                              src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                              alt="Michelin star"
                              width={12}
                              height={12}
                              className="h-3 w-3"
                            />
                            <span>{destination.michelin_stars}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className={CARD_TITLE} role="heading" aria-level={3}>
                          {destination.name}
                        </div>
                        <div className={CARD_META}>
                          <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                            {capitalizeCity(destination.city)}
                          </span>
                          {destination.category && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                                {destination.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className={`px-3 py-2 text-sm rounded-full transition-all ${
                            currentPage === pageNumber
                              ? 'bg-black dark:bg-white text-white dark:text-black font-medium'
                              : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>

                  <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
              )}
            </div>
          )}
        </PageContainer>
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
            await supabase.from('saved_places').insert({ user_id: user.id, destination_slug: slug });
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
            await supabase.from('visited_places').insert({ user_id: user.id, destination_slug: slug });
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
