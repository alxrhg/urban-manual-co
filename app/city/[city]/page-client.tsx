'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react';

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

/**
 * Props for the CityPageClient component
 * Initial data is fetched server-side for faster loading
 */
export interface CityPageClientProps {
  initialDestinations?: Destination[];
  initialCategories?: string[];
}

// IntelligentDrawer for destination details
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  // Skip loading state if we have SSR data
  const [loading, setLoading] = useState(!hasSSRData);
  // Drawer now handled by IntelligentDrawer
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);

  // New browse features state
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchWithin, setSearchWithin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [browseFilters, setBrowseFilters] = useState<BrowseFilters>({
    categories: [],
    minRating: null,
    priceLevel: null,
    special: [],
    styles: [],
  });

  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows

  const { openDrawer, isDrawerOpen: isDrawerTypeOpen, closeDrawer } = useDrawer();
  const { openDrawer: openGlobalDrawer } = useDrawerStore();

  const handleAdminEdit = (destination: Destination) => {
    if (!isAdmin) return;
    // Open destination drawer - editing happens inline
    openIntelligentDrawer(destination);
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
          'id, slug, name, city, neighborhood, category, micro_description, description, content, image, image_thumbnail, michelin_stars, crown, opening_hours_json, rating, tags, price_level, saves_count, views_count, user_ratings_total, created_at'
        )
        .eq('city', citySlug)
        .order('name');

      if (error) throw error;

      const results = (data || []) as any[];
      setDestinations(results);

      // Count destinations per category (case-insensitive) and only show categories with at least 2 destinations
      const categoryCounts = new Map<string, number>();
      const categoryOriginalCase = new Map<string, string>(); // Track original case
      results.forEach((d: any) => {
        if (d.category) {
          const categoryLower = d.category.toLowerCase();
          // Use lowercase for counting, but preserve original case
          if (!categoryOriginalCase.has(categoryLower)) {
            categoryOriginalCase.set(categoryLower, d.category);
          }
          categoryCounts.set(categoryLower, (categoryCounts.get(categoryLower) || 0) + 1);
        }
      });

      // Filter out quiet categories (categories with less than 2 destinations)
      const activeCategories = Array.from(categoryCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([categoryLower, _]) => categoryOriginalCase.get(categoryLower) || categoryLower);

      setCategories(activeCategories);

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

  // Apply sorting and search within results
  const sortedAndSearchedDestinations = useMemo(() => {
    let result = [...filteredDestinations];

    // Apply search within results
    if (searchWithin.trim()) {
      const searchLower = searchWithin.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(searchLower) ||
        (d.micro_description && d.micro_description.toLowerCase().includes(searchLower)) ||
        (d.category && d.category.toLowerCase().includes(searchLower)) ||
        (d.neighborhood && d.neighborhood.toLowerCase().includes(searchLower))
      );
    }

    // Apply browse filters
    if (browseFilters.categories.length > 0) {
      result = result.filter(d =>
        d.category && browseFilters.categories.some(
          cat => cat.toLowerCase() === d.category?.toLowerCase()
        )
      );
    }

    if (browseFilters.minRating !== null) {
      result = result.filter(d => d.rating && d.rating >= browseFilters.minRating!);
    }

    if (browseFilters.priceLevel && browseFilters.priceLevel.length > 0) {
      result = result.filter(d =>
        d.price_level && browseFilters.priceLevel!.includes(d.price_level)
      );
    }

    if (browseFilters.special.length > 0) {
      result = result.filter(d => {
        return browseFilters.special.some(special => {
          if (special === 'michelin') return d.michelin_stars && d.michelin_stars > 0;
          if (special === 'crown') return d.crown;
          if (special === 'trending') return (d.saves_count || 0) > 10;
          if (special === 'new') {
            // Consider "new" as added in the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return d.created_at && new Date(d.created_at) > thirtyDaysAgo;
          }
          return false;
        });
      });
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
  }, [filteredDestinations, searchWithin, sortBy, browseFilters]);

  // Category counts for filter sidebar
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    destinations.forEach(d => {
      if (d.category) {
        const cat = d.category.charAt(0).toUpperCase() + d.category.slice(1).toLowerCase();
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [destinations]);

  // Handle collection click - filter to show only collection items
  const handleCollectionClick = useCallback((collectionId: string, collectionDestinations: Destination[]) => {
    if (collectionId === 'michelin') {
      setAdvancedFilters(prev => ({ ...prev, michelin: true, crown: false }));
    } else if (collectionId === 'crown') {
      setAdvancedFilters(prev => ({ ...prev, crown: true, michelin: false }));
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
                    src="/michelin-star.svg"
                    alt="Michelin star"
                    className="h-3 w-3"
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

          {/* Browse Toolbar - Sort, View Toggle, Search */}
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

              {/* Toolbar with Sort and View Toggle */}
              <div className="flex items-center gap-4">
                {/* Filter Toggle Button */}
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
          <div className={`flex gap-8 ${showFilters ? '' : ''}`}>
            {/* Filter Sidebar - Collapsible */}
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
                    availableCategories={categoryCounts}
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
                      : `No destinations found in ${cityDisplayName}`}
                  </p>
                  {(searchWithin || browseFilters.categories.length > 0 || browseFilters.minRating || browseFilters.special.length > 0) && (
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
                        setAdvancedFilters({});
                        setSelectedCategory('');
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

                  {/* Ad after grid */}
                  <MultiplexAd slot="3271683710" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Destination Drawer - now handled by IntelligentDrawer in layout.tsx */}
    </>
  );
}
