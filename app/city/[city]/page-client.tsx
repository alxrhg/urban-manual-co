'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Grid3X3, Map, Sparkles } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { DestinationCard } from '@/components/DestinationCard';
import { EditModeToggle } from '@/components/EditModeToggle';
import { UniversalGrid } from '@/components/UniversalGrid';
import { MultiplexAd } from '@/components/GoogleAd';
import { CityClock } from '@/components/CityClock';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';

/**
 * Props for the CityPageClient component
 * Initial data is fetched server-side for faster loading
 */
export interface CityPageClientProps {
  initialDestinations?: Destination[];
  initialCategories?: string[];
  initialNeighborhoods?: string[];
  initialTopPicks?: Destination[];
  initialCategoryCounts?: Record<string, number>;
}

const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  {
    ssr: false,
    loading: () => null,
  }
);

const GoogleInteractiveMap = dynamic(
  () => import('@/components/maps/GoogleInteractiveMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center">
        <span className="text-sm text-gray-500">Loading map...</span>
      </div>
    ),
  }
);

import { useDrawerStore } from '@/lib/stores/drawer-store';

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

export default function CityPageClient({
  initialDestinations = [],
  initialCategories = [],
  initialNeighborhoods = [],
  initialTopPicks = [],
  initialCategoryCounts = {},
}: CityPageClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const citySlug = params?.city ? decodeURIComponent(params.city as string) : '';
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

  // Track whether we have SSR data
  const hasSSRData = initialDestinations.length > 0;

  // Initialize state with SSR data if available
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>(initialDestinations);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [neighborhoods] = useState<string[]>(initialNeighborhoods);
  const [topPicks] = useState<Destination[]>(initialTopPicks);
  const [categoryCounts] = useState<Record<string, number>>(initialCategoryCounts);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  // Skip loading state if we have SSR data
  const [loading, setLoading] = useState(!hasSSRData);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);

  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows

  const { openDrawer, isDrawerOpen: isDrawerTypeOpen, closeDrawer } = useDrawer();
  const { openDrawer: openGlobalDrawer } = useDrawerStore();

  const handleAdminEdit = (destination: Destination) => {
    if (!isAdmin) return;
    // Open destination drawer - editing happens inline
    setSelectedDestination(destination);
    openDrawer('destination');
  };

  const handleAddNewPOI = () => {
    if (!isAdmin) return;
    setEditingDestination(null);
    openGlobalDrawer('poi-editor', {
      destination: null,
      initialCity: citySlug,
      onSave: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        await fetchDestinations();
      }
    });
  };

  useEffect(() => {
    // Skip fetching destinations if we have SSR data
    if (!hasSSRData) {
      setLoading(true);
      fetchDestinations();
    }
    // Always fetch user-specific data
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
    setCurrentPage(1);
  }, [citySlug, user, hasSSRData]);

  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters(destinations, selectedCategory, selectedNeighborhood, advancedFilters);
    } else {
      setFilteredDestinations([]);
    }
  }, [destinations, selectedCategory, selectedNeighborhood, advancedFilters]);

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

      // Count destinations per category (case-insensitive) and only show categories with at least 2 destinations
      const localCategoryCounts = new Map<string, number>();
      const categoryOriginalCase = new Map<string, string>(); // Track original case
      results.forEach((d: any) => {
        if (d.category) {
          const categoryLower = d.category.toLowerCase();
          // Use lowercase for counting, but preserve original case
          if (!categoryOriginalCase.has(categoryLower)) {
            categoryOriginalCase.set(categoryLower, d.category);
          }
          localCategoryCounts.set(categoryLower, (localCategoryCounts.get(categoryLower) || 0) + 1);
        }
      });

      // Filter out quiet categories (categories with less than 2 destinations)
      const activeCategories = Array.from(localCategoryCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([categoryLower, _]) => categoryOriginalCase.get(categoryLower) || categoryLower);

      setCategories(activeCategories);

      applyFilters(results, selectedCategory, selectedNeighborhood, advancedFilters);
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setDestinations([]);
      setFilteredDestinations([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (dests: Destination[], category: string, neighborhood: string, filters: typeof advancedFilters) => {
    let filtered = [...dests];

    // Filter by neighborhood
    if (neighborhood) {
      filtered = filtered.filter(d =>
        d.neighborhood && d.neighborhood.trim().toLowerCase() === neighborhood.toLowerCase()
      );
    }

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
      <main className="w-full px-6 md:px-10 lg:px-12 py-20">
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

  const handleNeighborhoodSelect = (neighborhood: string) => {
    const nextNeighborhood = neighborhood === selectedNeighborhood ? '' : neighborhood;
    setSelectedNeighborhood(nextNeighborhood);
  };

  // Compute map center from filtered destinations
  const mapCenter = useMemo(() => {
    const destinationsWithCoords = filteredDestinations.filter(d => d.latitude && d.longitude);
    if (destinationsWithCoords.length === 0) {
      return { lat: 0, lng: 0 };
    }
    const avgLat = destinationsWithCoords.reduce((sum, d) => sum + (d.latitude || 0), 0) / destinationsWithCoords.length;
    const avgLng = destinationsWithCoords.reduce((sum, d) => sum + (d.longitude || 0), 0) / destinationsWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [filteredDestinations]);

  const paginatedDestinations = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDestinations.slice(start, end);
  })();

  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  return (
    <>
      <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
        <div className="max-w-[1800px] mx-auto">
          {/* Header - Minimal design matching homepage */}
          <div className="mb-12">
            <button
              onClick={() => router.push('/')}
              className="mb-6 text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
              aria-label="Back"
            >
              ← Back
            </button>

            <div className="mb-8">
              {country && (
                <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                  {country}
                </div>
              )}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-light text-black dark:text-white mb-1">{cityDisplayName}</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {filteredDestinations.length} {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      title="Grid view"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`p-2 rounded-full transition-all duration-200 ${
                        viewMode === 'map'
                          ? 'bg-white dark:bg-gray-900 text-black dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                      title="Map view"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={handleAddNewPOI}
                      className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out text-xs font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:ring-offset-2"
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
                  <CityClock citySlug={citySlug} />
                </div>
              </div>
            </div>

            {editModeActive && (
              <div className="mb-8 rounded-2xl border border-gray-200/70 dark:border-gray-700/30 bg-gray-50/80 dark:bg-gray-800/10 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    Editing {cityDisplayName}
                  </p>
                  <p className="text-xs text-gray-700/80 dark:text-gray-300/80">
                    Use the edit button on any card to update this city's places instantly.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAddNewPOI}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-white text-gray-900 border border-gray-200 shadow-sm hover:bg-gray-100 transition-all dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    Add Place
                  </button>
                  <button
                    onClick={() => disableEditMode()}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    Exit Edit Mode
                  </button>
                </div>
              </div>
            )}

            {/* Neighborhood Filter Tabs */}
            {neighborhoods.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => handleNeighborhoodSelect('')}
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                      !selectedNeighborhood
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    All Neighborhoods
                  </button>
                  {neighborhoods.map(neighborhood => (
                    <button
                      key={neighborhood}
                      onClick={() => handleNeighborhoodSelect(neighborhood)}
                      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                        selectedNeighborhood === neighborhood
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {neighborhood}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {Object.keys(categoryCounts).length > 0 && (
              <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(categoryCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([category, count]) => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                        selectedCategory === category
                          ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800/50'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="text-2xl font-light text-black dark:text-white">{count}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{capitalizeCategory(category)}</div>
                    </button>
                  ))}
              </div>
            )}

            {/* Filters - Matching homepage style */}
            <div className="space-y-4">
              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                  <button
                    onClick={() => handleCategorySelect('')}
                    className={`transition-all duration-200 ease-out ${
                      !selectedCategory
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    All Categories
                  </button>
                  {categories
                    .slice()
                    .sort((a, b) => {
                      // Always put "others" at the end
                      if (a.toLowerCase() === 'others') return 1;
                      if (b.toLowerCase() === 'others') return -1;
                      return 0;
                    })
                    .map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategorySelect(category)}
                      className={`transition-all duration-200 ease-out ${
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
              <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                <button
                  onClick={() => setAdvancedFilters(prev => ({ ...prev, michelin: !prev.michelin }))}
                  className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                    advancedFilters.michelin
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  <img
                    src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
                    onError={(e) => {
                      // Fallback to local file if external URL fails
                      const target = e.currentTarget;
                      if (target.src !== '/michelin-star.svg') {
                        target.src = '/michelin-star.svg';
                      }
                    }}
                  />
                  Michelin
                </button>
                <button
                  onClick={() => setAdvancedFilters(prev => ({ ...prev, crown: !prev.crown }))}
                  className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                    advancedFilters.crown
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  Crown
                </button>
              </div>
            </div>
          </div>

          {/* Top Picks Section */}
          {topPicks.length > 0 && !selectedCategory && !selectedNeighborhood && !advancedFilters.michelin && !advancedFilters.crown && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-medium text-black dark:text-white">Top Picks</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {topPicks.map((destination, index) => {
                  const isVisited = !!(user && visitedSlugs.has(destination.slug));
                  return (
                    <DestinationCard
                      key={destination.slug}
                      destination={destination}
                      onClick={() => {
                        setSelectedDestination(destination);
                        openDrawer('destination');
                      }}
                      index={index}
                      isVisited={isVisited}
                      showBadges={true}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Destinations Grid / Map View */}
          {filteredDestinations.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No destinations found in {cityDisplayName}
              </p>
            </div>
          ) : viewMode === 'map' ? (
            /* Map View */
            <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <GoogleInteractiveMap
                destinations={filteredDestinations}
                onMarkerClick={(destination) => {
                  setSelectedDestination(destination);
                  openDrawer('destination');
                }}
                center={mapCenter}
                zoom={12}
                selectedDestination={selectedDestination}
              />
            </div>
          ) : (
            <div className="space-y-8">
              <UniversalGrid
                items={paginatedDestinations}
                renderItem={(destination, index) => {
                  const isVisited = !!(user && visitedSlugs.has(destination.slug));
                  const globalIndex = (currentPage - 1) * itemsPerPage + index;

                    return (
                      <DestinationCard
                        key={destination.slug}
                        destination={destination}
                        onClick={() => {
                          setSelectedDestination(destination);
                          openDrawer('destination');
                        }}
                        index={globalIndex}
                        isVisited={isVisited}
                        showBadges={true}
                      />
                    );
                }}
                emptyState={
                  <div className="text-center py-20">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No destinations found
                    </p>
                  </div>
                }
              />

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
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
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Ad after grid */}
              <MultiplexAd slot="3271683710" />
            </div>
          )}
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
        onDestinationUpdate={async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          await fetchDestinations();
        }}
        onDestinationClick={async (slug: string) => {
          try {
            const supabaseClient = createClient();
            if (!supabaseClient) {
              console.error('Failed to create Supabase client');
              return;
            }
            
            const { data: destination, error } = await supabaseClient
              .from('destinations')
              .select('*')
              .eq('slug', slug)
              .single();
            
            if (error || !destination) {
              console.error('Failed to fetch destination:', error);
              return;
            }
            
            setSelectedDestination(destination as Destination);
            openDrawer('destination');
          } catch (error) {
            console.error('Error fetching destination:', error);
          }
        }}
        />
      )}
    </>
  );
}
