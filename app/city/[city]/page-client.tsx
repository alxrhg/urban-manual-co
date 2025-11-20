'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { EditModeToggle } from '@/components/EditModeToggle';
import { MultiplexAd } from '@/components/GoogleAd';
import { CityClock } from '@/components/CityClock';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';

const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  {
    ssr: false,
    loading: () => null,
  }
);

const POIDrawer = dynamic(
  () => import('@/components/POIDrawer').then(mod => ({ default: mod.POIDrawer })),
  {
    ssr: false,
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
  const isAdmin = (user?.app_metadata as Record<string, any> | undefined)?.role === 'admin';
  const {
    isEditMode: adminEditMode,
    toggleEditMode,
    disableEditMode,
    canUseEditMode,
  } = useAdminEditMode();
  const editModeActive = isAdmin && adminEditMode;
  const handleEditModeToggle = () => {
    if (!isAdmin || !canUseEditMode) return;
    toggleEditMode();
  };

  const baseCategories = useMemo(
    () => [
      { label: 'All Categories', value: '' },
      { label: 'Hotel', value: 'hotel' },
      { label: 'Dining', value: 'dining' },
      { label: 'Others', value: 'others' },
      { label: 'Shopping', value: 'shopping' },
      { label: 'Bar', value: 'bar' },
      { label: 'Cafe', value: 'cafe' },
      { label: 'Culture', value: 'culture' },
      { label: 'Michelin', value: 'michelin' },
      { label: 'Crown', value: 'crown' },
    ],
    []
  );

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>(baseCategories);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [showPOIDrawer, setShowPOIDrawer] = useState(false);
  const [isCreatingNewPOI, setIsCreatingNewPOI] = useState(false);

  const [gridColumns, setGridColumns] = useState(4);
  const itemsPerPage = useMemo(() => gridColumns * 3, [gridColumns]);

  const { openDrawer, isDrawerOpen: isDrawerTypeOpen, closeDrawer } = useDrawer();

  const handleAdminEdit = (destination: Destination) => {
    if (!isAdmin) return;
    setEditingDestination(destination);
    setIsCreatingNewPOI(false);
    setShowPOIDrawer(true);
  };

  const handleAddNewPOI = () => {
    if (!isAdmin) return;
    setEditingDestination(null);
    setIsCreatingNewPOI(true);
    setShowPOIDrawer(true);
  };

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;

      if (width >= 1280) {
        setGridColumns(4);
      } else if (width >= 768) {
        setGridColumns(3);
      } else {
        setGridColumns(1);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

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
          'slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, opening_hours_json, rating, tags'
        )
        .eq('city', citySlug)
        .order('name');

      if (error) throw error;

      const results = (data || []) as any[];
      setDestinations(results);

      // Count destinations per category and only show categories with at least 2 destinations
      const categoryCounts = new Map<string, number>();
      results.forEach((d: any) => {
        if (d.category) {
          categoryCounts.set(d.category, (categoryCounts.get(d.category) || 0) + 1);
        }
      });

      // Filter out quiet categories (categories with less than 2 destinations)
      const activeCategories = Array.from(categoryCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([category, _]) => category);

      const formattedCategories = activeCategories.map(category => ({
        label: capitalizeCategory(category),
        value: category.toLowerCase(),
      }));

      const mergedCategories = [...baseCategories];

      formattedCategories.forEach(category => {
        if (!mergedCategories.some(existing => existing.value === category.value)) {
          mergedCategories.push(category);
        }
      });

      setCategories(mergedCategories);

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
    const categoryValue = category.toLowerCase();

    if (categoryValue && categoryValue !== 'michelin' && categoryValue !== 'crown') {
      if (categoryValue === 'others') {
        const primaryCategories = ['hotel', 'dining', 'shopping', 'bar', 'cafe', 'culture'];
        filtered = filtered.filter(d => {
          const destinationCategory = (d.category || '').toLowerCase().trim();
          return destinationCategory && !primaryCategories.includes(destinationCategory);
        });
      } else {
        filtered = filtered.filter(d => {
          const categoryMatch = d.category && d.category.toLowerCase().trim() === categoryValue;

          // If category matches, include it
          if (categoryMatch) return true;

          // Also check tags for category-related matches
          const tags = d.tags || [];

          // Map categories to relevant tag patterns
          const categoryTagMap: Record<string, string[]> = {
            'dining': ['restaurant', 'dining', 'fine-dining', 'italian_restaurant', 'mexican_restaurant', 'japanese_restaurant', 'french_restaurant', 'chinese_restaurant', 'thai_restaurant', 'indian_restaurant', 'seafood_restaurant', 'steak_house', 'pizza', 'food'],
            'cafe': ['cafe', 'coffee_shop', 'coffee', 'bakery', 'pastry'],
            'bar': ['bar', 'pub', 'cocktail_bar', 'wine_bar', 'beer', 'nightclub', 'lounge'],
            'hotel': ['hotel', 'lodging', 'resort', 'inn', 'hostel'],
            'shopping': ['store', 'shopping', 'mall', 'market', 'boutique'],
            'attraction': ['tourist_attraction', 'museum', 'park', 'landmark', 'monument'],
            'nightlife': ['nightclub', 'bar', 'pub', 'lounge', 'entertainment'],
            'culture': ['museum', 'gallery', 'exhibit', 'cultural'],
          };

          // Get relevant tags for this category
          const relevantTags = categoryTagMap[categoryValue] || [];

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
      <main className="min-h-screen bg-[#0F1624] text-white px-5 sm:px-6 md:px-8 lg:px-8 py-16">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-sm text-white/70">Loading destinations...</div>
          </div>
        </div>
      </main>
    );
  }

  const cityDisplayName = capitalizeCity(citySlug);
  const country = cityCountryMap[citySlug] || '';

  const handleCategorySelect = (category: string) => {
    const nextCategory = category === selectedCategory ? '' : category;
    setSelectedCategory(nextCategory);
    setAdvancedFilters({
      michelin: nextCategory === 'michelin',
      crown: nextCategory === 'crown',
    });
  };

  const paginatedDestinations = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDestinations.slice(start, end);
  })();

  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  return (
    <>
      <main className="min-h-screen bg-[#0F1624] text-white px-5 sm:px-6 md:px-8 lg:px-8 py-16">
        <div className="max-w-[1440px] mx-auto space-y-12">
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-white/60">
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </button>
              <CityClock citySlug={citySlug} className="!text-white/70 [&_*]:!text-white/70" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-white/50">
                {country && <span>{country}</span>}
                {country && <span className="opacity-30">/</span>}
                <span>{cityDisplayName}</span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1.5">
                  <h1 className="text-4xl font-semibold leading-tight">{cityDisplayName}</h1>
                  <div className="flex items-center gap-3 text-sm text-white/70">
                    <span>
                      {filteredDestinations.length}{' '}
                      {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                    </span>
                    <span className="flex items-center gap-2 text-white/60">
                      <Clock className="h-4 w-4" />
                      Updated just now
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {isAdmin && (
                    <button
                      onClick={handleAddNewPOI}
                      className="px-4 py-2 bg-white/20 text-white rounded-full border border-white/20 hover:bg-white/25 hover:-translate-y-[1px] transition-all duration-200 text-xs font-medium flex items-center gap-2"
                      title="Add new POI to this city"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add POI
                    </button>
                  )}
                  {isAdmin && (
                    <EditModeToggle active={editModeActive} onToggle={handleEditModeToggle} size="compact" />
                  )}
                </div>
              </div>
            </div>

            {editModeActive && (
              <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-100">Editing {cityDisplayName}</p>
                  <p className="text-xs text-amber-50/70">
                    Use the edit button on any card to update this city’s places instantly.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAddNewPOI}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-white/90 text-amber-900 border border-amber-200 shadow-sm hover:bg-white"
                  >
                    Add Place
                  </button>
                  <button
                    onClick={() => disableEditMode()}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-amber-500 text-white hover:bg-amber-400"
                  >
                    Exit Edit Mode
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Categories</h2>
              </div>
              <div className="overflow-x-auto pb-1 -mx-1">
                <div className="flex gap-3 min-w-full px-1">
                  {categories.map(category => {
                    const isActive = selectedCategory === category.value;
                    return (
                      <button
                        key={category.value}
                        onClick={() => handleCategorySelect(category.value)}
                        className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-white/20 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                            : 'bg-white/5 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        {category.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {filteredDestinations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-sm text-white/70">No destinations found in {cityDisplayName}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-11">
                  {paginatedDestinations.map((destination, index) => {
                    const isVisited = !!(user && visitedSlugs.has(destination.slug));
                    const imageSrc = destination.image_thumbnail || destination.image;

                    return (
                      <div
                        key={destination.slug}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedDestination(destination);
                          openDrawer('destination');
                        }}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            setSelectedDestination(destination);
                            openDrawer('destination');
                          }
                        }}
                        className="group relative h-full rounded-2xl bg-white/5 border border-white/5 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(0,0,0,0.35)] focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {imageSrc ? (
                            <Image
                              src={imageSrc}
                              alt={`${destination.name} in ${capitalizeCity(destination.city)}${destination.category ? ` - ${destination.category}` : ''}`}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                              className="object-cover transition duration-500 group-hover:scale-105"
                              priority={index < 2}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-white/40">
                              <MapPin className="h-10 w-10" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                          {destination.michelin_stars && destination.michelin_stars > 0 && (
                            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1 text-[13px] font-medium backdrop-blur-sm">
                              <Image src="/michelin-star.svg" alt="Michelin" width={16} height={16} />
                              <span>{destination.michelin_stars}</span>
                            </div>
                          )}

                          {destination.crown && (
                            <div className="absolute top-3 right-3 rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
                              Crown
                            </div>
                          )}

                          {isVisited && (
                            <div className="absolute bottom-3 right-3 rounded-full bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                              Visited
                            </div>
                          )}

                          {isAdmin && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleAdminEdit(destination);
                              }}
                              className={`absolute top-3 right-3 rounded-full bg-white/90 text-gray-900 p-2 transition hover:bg-white ${
                                editModeActive ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              aria-label="Edit destination"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>
                          )}
                        </div>

                        <div className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-white/60">
                            <span>{destination.category ? capitalizeCategory(destination.category) : 'Destination'}</span>
                            <span className="h-1 w-1 rounded-full bg-white/40" />
                            <span className="inline-flex items-center gap-1 text-white/60">
                              <MapPin className="h-3 w-3" />
                              {capitalizeCity(destination.city)}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold leading-tight text-white">{destination.name}</h3>
                          <p className="text-sm text-white/70 line-clamp-2">
                            {destination.micro_description ||
                              (destination.category && destination.city
                                ? `${capitalizeCategory(destination.category)} in ${capitalizeCity(destination.city)}`
                                : destination.city
                                  ? `Located in ${capitalizeCity(destination.city)}`
                                  : destination.category || '')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="w-full flex flex-wrap items-center justify-center gap-3 pt-4">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      Prev
                    </button>

                    <div className="flex items-center gap-2">
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

                        const isActive = currentPage === pageNumber;

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setCurrentPage(pageNumber)}
                            className={`min-w-[36px] rounded-xl px-3 py-2 text-sm transition-all duration-200 ${
                              isActive
                                ? 'bg-white/20 text-white shadow-[0_6px_18px_rgba(0,0,0,0.35)]'
                                : 'bg-white/10 text-white/80 hover:bg-white/15'
                            }`}
                            aria-label={`Page ${pageNumber}`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          <MultiplexAd slot="3271683710" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Discover More</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {['Groceries', 'Best vacation packages', 'Kyoto', 'Bangkok'].map(item => (
                <div
                  key={item}
                  className="rounded-2xl bg-white/10 border border-white/10 px-5 py-4 text-white/80 transition hover:bg-white/15"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Destination Drawer - Only render when open */}
      {isDrawerTypeOpen('destination') && selectedDestination && (
        <DestinationDrawer
          destination={selectedDestination}
          isOpen={true}
          onClose={() => {
            closeDrawer();
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
        onVisitToggle={async (slug: string, visited: boolean) => {
          if (!user) return;

          // Update local state based on the visited parameter
          setVisitedSlugs(prev => {
            const next = new Set(prev);
            if (visited) {
              next.add(slug);
            } else {
              next.delete(slug);
            }
            return next;
          });

          // The DestinationDrawer already handles the database update,
          // so we just need to sync our local state
        }}
        />
      )}

      {isAdmin && (
        <POIDrawer
          isOpen={showPOIDrawer}
          onClose={() => {
            setShowPOIDrawer(false);
            setEditingDestination(null);
            setIsCreatingNewPOI(false);
          }}
          destination={editingDestination || undefined}
          initialCity={isCreatingNewPOI ? citySlug : undefined}
          onSave={async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            await fetchDestinations();
            setEditingDestination(null);
            setIsCreatingNewPOI(false);
            setShowPOIDrawer(false);
          }}
        />
      )}
    </>
  );
}
