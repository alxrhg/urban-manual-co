'use client';

import { useState, useCallback } from 'react';
import { Plus, Globe, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { useHomepageData } from './HomepageDataProvider';
import { SearchFiltersComponent, SearchFilters } from '@/src/features/search/SearchFilters';

/**
 * Navigation Bar Component - Apple Design System
 *
 * Clean, minimal navigation with action buttons and inline filters.
 */
export default function NavigationBar() {
  const { user } = useAuth();
  const { startTrip, openModal } = useTripBuilder();
  const { openDrawer } = useDrawer();
  const {
    selectedCity,
    selectedCategory,
    searchTerm,
    clearFilters,
    filteredDestinations,
    cities,
    categories,
    michelinOnly,
    crownOnly,
    setMichelinOnly,
    setCrownOnly,
    setSelectedCity,
    setSelectedCategory,
  } = useHomepageData();
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<SearchFilters>({});

  const hasFilters = selectedCity || selectedCategory || searchTerm || michelinOnly || crownOnly;

  // Handle create trip - now uses unified trip planner modal
  const handleCreateTrip = useCallback(async () => {
    if (!user) {
      // Open login drawer for unauthenticated users
      openDrawer('login');
      return;
    }

    try {
      setCreatingTrip(true);
      // Start a new trip using the context
      startTrip('New Trip', 1);
      // Open the modal in editor mode
      openModal('editor');
    } finally {
      setCreatingTrip(false);
    }
  }, [user, startTrip, openModal, openDrawer]);

  // Handle filter changes from SearchFiltersComponent
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setAdvancedFilters(newFilters);

    // Sync with context
    if (newFilters.michelin !== undefined) {
      setMichelinOnly(!!newFilters.michelin);
    }
    if (newFilters.city !== undefined) {
      setSelectedCity(newFilters.city || '');
    }
    if (newFilters.category !== undefined) {
      setSelectedCategory(newFilters.category || '');
    }
  }, [setMichelinOnly, setSelectedCity, setSelectedCategory]);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        {/* Left side - Results count and clear filters */}
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {filteredDestinations.length} destinations
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          {/* Create Trip */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-[42px] sm:h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       bg-gray-900 dark:bg-white px-3 sm:px-4 text-[14px] sm:text-[13px] font-medium
                       text-white dark:text-gray-900
                       disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-100
                       active:scale-[0.98] transition-all duration-200"
          >
            {creatingTrip ? (
              <Loader2 className="h-4 w-4 sm:h-[15px] sm:w-[15px] animate-spin" />
            ) : (
              <Plus className="h-4 w-4 sm:h-[15px] sm:w-[15px]" />
            )}
            <span className="hidden sm:inline">
              {creatingTrip ? 'Creating...' : 'Create Trip'}
            </span>
          </button>

          {/* Filters */}
          <SearchFiltersComponent
            filters={advancedFilters}
            onFiltersChange={handleFiltersChange}
            availableCities={cities}
            availableCategories={categories}
            fullWidthPanel={true}
            useFunnelIcon={true}
          />

          {/* Discover by Cities */}
          <Link
            href="/cities"
            className="hidden sm:flex h-[38px] flex-shrink-0 items-center justify-center gap-2 rounded-full
                       border border-gray-200/80 dark:border-white/[0.12] bg-white dark:bg-white/[0.06]
                       px-4 text-[13px] font-medium text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-white/[0.1]
                       active:scale-[0.98] transition-all duration-200"
          >
            <Globe className="h-[15px] w-[15px]" />
            <span>Discover by Cities</span>
          </Link>
        </div>
      </div>

      {/* Inline filter slot for SearchFiltersComponent */}
      <div id="search-filters-inline-slot" />
    </div>
  );
}
