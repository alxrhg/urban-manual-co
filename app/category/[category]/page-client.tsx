'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { MapPin, SlidersHorizontal, X } from 'lucide-react';
import { useDrawer } from '@/contexts/DrawerContext';
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';
import { useAuth } from '@/contexts/AuthContext';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import {
  BrowseToolbar,
  type SortOption,
  type ViewMode,
  BrowseFilterSidebar,
  type BrowseFilters,
  DestinationListItem,
  CuratedCollections,
  SearchWithinResults,
} from '@/components/browse';

interface CategoryPageClientProps {
  category: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CategoryPageClient({ category }: CategoryPageClientProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();
  const [cities, setCities] = useState<string[]>([]);
  const { openDrawer } = useDrawer();
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // New browse features state
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchWithin, setSearchWithin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCity, setSelectedCity] = useState('');
  const [browseFilters, setBrowseFilters] = useState<BrowseFilters>({
    categories: [],
    minRating: null,
    priceLevel: null,
    special: [],
    styles: [],
  });

  const itemsPerPage = useItemsPerPage(4);

  const categoryName = category.split('-').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  useEffect(() => {
    fetchDestinations();
  }, [category]);

  useEffect(() => {
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [destinations, selectedCity, browseFilters]);

  async function fetchDestinations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('destinations')
        .select('id, slug, name, city, neighborhood, category, micro_description, description, image, image_thumbnail, michelin_stars, crown, rating, tags, price_level, saves_count, views_count, user_ratings_total, created_at')
        .ilike('category', categoryName);

      if (error) throw error;

      setDestinations(data || []);

      // Extract unique cities
      const uniqueCities = Array.from(new Set((data || []).map(d => d.city)));
      setCities(uniqueCities.sort());
    } catch (error) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVisitedPlaces() {
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
  }

  function applyFilters() {
    let filtered = [...destinations];

    if (selectedCity) {
      filtered = filtered.filter(d => d.city === selectedCity);
    }

    if (browseFilters.minRating !== null) {
      filtered = filtered.filter(d => d.rating && d.rating >= browseFilters.minRating!);
    }

    if (browseFilters.priceLevel && browseFilters.priceLevel.length > 0) {
      filtered = filtered.filter(d =>
        d.price_level && browseFilters.priceLevel!.includes(d.price_level)
      );
    }

    if (browseFilters.special.length > 0) {
      filtered = filtered.filter(d => {
        return browseFilters.special.some(special => {
          if (special === 'michelin') return d.michelin_stars && d.michelin_stars > 0;
          if (special === 'crown') return d.crown;
          if (special === 'trending') return (d.saves_count || 0) > 10;
          if (special === 'new') {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return d.created_at && new Date(d.created_at) > thirtyDaysAgo;
          }
          return false;
        });
      });
    }

    setFilteredDestinations(filtered);
    setCurrentPage(1);
  }

  // Apply sorting and search within results
  const sortedAndSearchedDestinations = useMemo(() => {
    let result = [...filteredDestinations];

    // Apply search within results
    if (searchWithin.trim()) {
      const searchLower = searchWithin.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        (d.micro_description && d.micro_description.toLowerCase().includes(searchLower)) ||
        (d.city && d.city.toLowerCase().includes(searchLower)) ||
        (d.neighborhood && d.neighborhood.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.saves_count || 0) - (a.saves_count || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        case 'price_asc':
          return (a.price_level || 0) - (b.price_level || 0);
        case 'price_desc':
          return (b.price_level || 0) - (a.price_level || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [filteredDestinations, searchWithin, sortBy]);

  // City counts for filter
  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach(d => {
      if (d.city) {
        const city = capitalizeCity(d.city);
        counts.set(city, (counts.get(city) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [destinations]);

  // Handle collection click
  const handleCollectionClick = useCallback((collectionId: string) => {
    if (collectionId === 'michelin') {
      setBrowseFilters(prev => ({ ...prev, special: ['michelin'] }));
    } else if (collectionId === 'crown') {
      setBrowseFilters(prev => ({ ...prev, special: ['crown'] }));
    } else if (collectionId === 'top-rated') {
      setBrowseFilters(prev => ({ ...prev, minRating: 4.5 }));
    } else if (collectionId === 'popular') {
      setSortBy('popularity');
    }
    setCurrentPage(1);
  }, []);

  const paginatedDestinations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedAndSearchedDestinations.slice(start, end);
  }, [sortedAndSearchedDestinations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedAndSearchedDestinations.length / itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading destinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <main className="w-full px-6 md:px-10 lg:px-12 py-8">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="mb-6 text-xs text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-light text-black dark:text-white mb-1">{categoryName}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {sortedAndSearchedDestinations.length} {sortedAndSearchedDestinations.length === 1 ? 'destination' : 'destinations'}
            </p>
          </div>

          {/* City Filter Tabs */}
          {cities.length > 1 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
                <button
                  onClick={() => {
                    setSelectedCity('');
                    setCurrentPage(1);
                  }}
                  className={`transition-all duration-200 ease-out ${
                    !selectedCity
                      ? 'font-medium text-black dark:text-white'
                      : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                  }`}
                >
                  All Cities
                </button>
                {cities.map(city => (
                  <button
                    key={city}
                    onClick={() => {
                      setSelectedCity(city);
                      setCurrentPage(1);
                    }}
                    className={`transition-all duration-200 ease-out ${
                      selectedCity === city
                        ? 'font-medium text-black dark:text-white'
                        : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
                    }`}
                  >
                    {capitalizeCity(city)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Curated Collections */}
          {destinations.length > 0 && (
            <CuratedCollections
              destinations={destinations}
              onCollectionClick={handleCollectionClick}
              onDestinationClick={(dest) => {
                openIntelligentDrawer(dest);
                openDrawer('destination');
              }}
              className="mb-10"
            />
          )}

          {/* Browse Toolbar */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Within Results */}
              <div className="w-full lg:w-80">
                <SearchWithinResults
                  value={searchWithin}
                  onChange={(value) => {
                    setSearchWithin(value);
                    setCurrentPage(1);
                  }}
                  placeholder={`Search within ${sortedAndSearchedDestinations.length} results...`}
                  resultCount={searchWithin ? sortedAndSearchedDestinations.length : undefined}
                />
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border transition-all ${
                    showFilters
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">More Filters</span>
                </button>

                <BrowseToolbar
                  sortBy={sortBy}
                  onSortChange={(sort) => {
                    setSortBy(sort);
                    setCurrentPage(1);
                  }}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  resultCount={sortedAndSearchedDestinations.length}
                />
              </div>
            </div>
          </div>

          {/* Main Content Area with Optional Sidebar */}
          <div className="flex gap-8">
            {/* Filter Sidebar */}
            {showFilters && (
              <div className="hidden lg:block w-56 flex-shrink-0">
                <div className="sticky top-24">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <BrowseFilterSidebar
                    filters={browseFilters}
                    onFiltersChange={(filters) => {
                      setBrowseFilters(filters);
                      setCurrentPage(1);
                    }}
                    availableCategories={cityCounts}
                    totalCount={destinations.length}
                    filteredCount={sortedAndSearchedDestinations.length}
                  />
                </div>
              </div>
            )}

            {/* Destinations Grid/List */}
            <div className="flex-1 min-w-0">
              {sortedAndSearchedDestinations.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchWithin
                      ? `No destinations found matching "${searchWithin}"`
                      : 'No destinations found matching your filters.'}
                  </p>
                  {(searchWithin || browseFilters.minRating || browseFilters.special.length > 0 || selectedCity) && (
                    <button
                      onClick={() => {
                        setSearchWithin('');
                        setBrowseFilters({
                          categories: [],
                          minRating: null,
                          priceLevel: null,
                          special: [],
                          styles: [],
                        });
                        setSelectedCity('');
                      }}
                      className="mt-4 text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Grid View */}
                  {viewMode === 'grid' && (
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
                              openIntelligentDrawer(destination);
                              openDrawer('destination');
                            }}
                            index={globalIndex}
                            isVisited={isVisited}
                            showBadges={true}
                            showSocialProof={true}
                            showHoverDetails={true}
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
                  )}

                  {/* List View */}
                  {viewMode === 'list' && (
                    <div className="space-y-4">
                      {paginatedDestinations.map((destination, index) => {
                        const isVisited = !!(user && visitedSlugs.has(destination.slug));
                        return (
                          <DestinationListItem
                            key={destination.slug}
                            destination={destination}
                            onClick={() => {
                              openIntelligentDrawer(destination);
                              openDrawer('destination');
                            }}
                            index={index}
                            isVisited={isVisited}
                          />
                        );
                      })}
                    </div>
                  )}

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
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
