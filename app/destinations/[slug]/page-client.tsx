'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { Destination } from '@/types/destination';
import { cityCountryMap } from '@/data/cityCountryMap';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { DestinationCard } from '@/components/DestinationCard';
import { UniversalGrid } from '@/components/UniversalGrid';
import { MultiplexAd } from '@/components/GoogleAd';
import { CityClock } from '@/components/CityClock';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { useDestinationDrawer } from '@/features/shared/components/IntelligentDrawerContext';

export interface CategoryCityPageClientProps {
  initialDestinations: Destination[];
  category: string;
  city: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function capitalizeCategory(category: string): string {
  // Add plural form for display
  const plurals: Record<string, string> = {
    restaurant: 'Restaurants',
    hotel: 'Hotels',
    cafe: 'Cafes',
    bar: 'Bars',
    shop: 'Shops',
    museum: 'Museums',
  };
  const lower = category.toLowerCase();
  return plurals[lower] || category.charAt(0).toUpperCase() + category.slice(1) + 's';
}

export default function CategoryCityPageClient({
  initialDestinations,
  category,
  city,
}: CategoryCityPageClientProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [destinations] = useState<Destination[]>(initialDestinations);
  const [filteredDestinations, setFilteredDestinations] = useState<Destination[]>(initialDestinations);
  const [advancedFilters, setAdvancedFilters] = useState<{
    michelin?: boolean;
    crown?: boolean;
  }>({});
  const { openDestination: openIntelligentDrawer } = useDestinationDrawer();
  const [visitedSlugs, setVisitedSlugs] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows
  const { openDrawer } = useDrawer();

  useEffect(() => {
    if (user) {
      fetchVisitedPlaces();
    } else {
      setVisitedSlugs(new Set());
    }
  }, [user]);

  useEffect(() => {
    applyFilters(destinations, advancedFilters);
  }, [destinations, advancedFilters]);

  const applyFilters = (dests: Destination[], filters: typeof advancedFilters) => {
    let filtered = [...dests];

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

      const slugSet = new Set((data as { destination_slug: string }[])?.map(entry => entry.destination_slug) || []);
      setVisitedSlugs(slugSet);
    } catch (err) {
      console.error('Error fetching visited destinations:', err);
    }
  };

  const cityDisplayName = capitalizeCity(city);
  const categoryDisplayName = capitalizeCategory(category);
  const country = cityCountryMap[city] || '';

  const paginatedDestinations = (() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredDestinations.slice(start, end);
  })();

  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);

  return (
    <main className="w-full px-6 md:px-10 lg:px-12 py-20 min-h-screen">
      <div className="max-w-[1800px] mx-auto">
        {/* Breadcrumb navigation */}
        <nav className="mb-6 text-xs text-gray-400 dark:text-gray-500" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-black dark:hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li className="text-gray-300 dark:text-gray-600">/</li>
            <li>
              <Link
                href={`/city/${encodeURIComponent(city)}`}
                className="hover:text-black dark:hover:text-white transition-colors"
              >
                {cityDisplayName}
              </Link>
            </li>
            <li className="text-gray-300 dark:text-gray-600">/</li>
            <li className="text-gray-600 dark:text-gray-400">
              {categoryDisplayName}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-12">
          <div className="mb-8">
            {country && (
              <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                {country}
              </div>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-light text-black dark:text-white mb-1">
                  {categoryDisplayName} in {cityDisplayName}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {filteredDestinations.length} curated {filteredDestinations.length === 1 ? 'destination' : 'destinations'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <CityClock citySlug={city} />
              </div>
            </div>
          </div>

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

        {/* Destinations Grid */}
        {filteredDestinations.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No {categoryDisplayName.toLowerCase()} found in {cityDisplayName} matching your filters
            </p>
            <button
              onClick={() => setAdvancedFilters({})}
              className="mt-4 text-xs text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline"
            >
              Clear filters
            </button>
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
                      openIntelligentDrawer(destination);
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

        {/* Related Links for SEO */}
        <div className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Explore more in {cityDisplayName}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/city/${encodeURIComponent(city)}`}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              All destinations in {cityDisplayName}
            </Link>
            {category !== 'restaurant' && (
              <Link
                href={`/destinations/restaurants-${city}`}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Restaurants in {cityDisplayName}
              </Link>
            )}
            {category !== 'hotel' && (
              <Link
                href={`/destinations/hotels-${city}`}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Hotels in {cityDisplayName}
              </Link>
            )}
            {category !== 'cafe' && (
              <Link
                href={`/destinations/cafes-${city}`}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Cafes in {cityDisplayName}
              </Link>
            )}
            {category !== 'bar' && (
              <Link
                href={`/destinations/bars-${city}`}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                Bars in {cityDisplayName}
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
