'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Loader2, X, Star, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useHomepageData } from './HomepageDataProvider';
import { SearchFiltersComponent, SearchFilters } from '@/src/features/search/SearchFilters';

/**
 * Navigation Bar Component - Apple Design System
 *
 * Clean, minimal navigation with action buttons and inline filters.
 */
export default function NavigationBar() {
  const router = useRouter();
  const { user } = useAuth();
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

  // Handle create trip
  const handleCreateTrip = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setCreatingTrip(true);
      const supabase = createClient();
      if (!supabase) return;

      // Generate a more descriptive default title with date
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const defaultTitle = `${monthNames[now.getMonth()]} ${now.getFullYear()} Trip`;

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: defaultTitle,
          status: 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      if (data) router.push(`/trips/${data.id}`);
    } catch (err) {
      console.error('Error creating trip:', err);
    } finally {
      setCreatingTrip(false);
    }
  }, [user, router]);

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
      {/* Mobile: Stacked layout with better spacing, Desktop: Side by side */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        {/* Left side - Results count and clear filters */}
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-[var(--editorial-text-secondary)]">
            {filteredDestinations.length} destinations
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[12px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Right side - Actions (wrapped on mobile, scrollable) */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Filters - Always visible, comes first for quick access */}
          <SearchFiltersComponent
            filters={advancedFilters}
            onFiltersChange={handleFiltersChange}
            availableCities={cities}
            availableCategories={categories}
            fullWidthPanel={true}
            useFunnelIcon={true}
          />

          {/* Create Trip - Compact on mobile */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg
                       bg-[var(--editorial-accent)] px-3 sm:px-4 text-[13px] font-medium
                       text-white
                       disabled:opacity-50 hover:bg-[var(--editorial-accent-hover)]
                       active:scale-[0.98] transition-all duration-200"
          >
            {creatingTrip ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {creatingTrip ? 'Creating...' : 'Create Trip'}
            </span>
          </button>

          {/* Discover by Cities - Hidden on small screens, visible on md+ */}
          <Link
            href="/cities"
            className="hidden md:flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg
                       border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)]
                       px-4 text-[13px] font-medium text-[var(--editorial-text-primary)]
                       hover:bg-[var(--editorial-border-subtle)]
                       active:scale-[0.98] transition-all duration-200"
          >
            <Globe className="h-4 w-4" />
            <span>Discover by Cities</span>
          </Link>
        </div>
      </div>

      {/* Quick Filter Chips - Always Visible */}
      <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
        {/* Active filter badges */}
        {selectedCity && (
          <button
            onClick={() => setSelectedCity('')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--editorial-accent)]/10 border border-[var(--editorial-accent)]/20 rounded-full text-xs font-medium text-[var(--editorial-accent)] whitespace-nowrap hover:bg-[var(--editorial-accent)]/20 transition-colors"
          >
            <MapPin className="w-3 h-3" />
            {selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1).replace(/-/g, ' ')}
            <X className="w-3 h-3" />
          </button>
        )}
        {michelinOnly && (
          <button
            onClick={() => setMichelinOnly(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--editorial-accent)]/10 border border-[var(--editorial-accent)]/20 rounded-full text-xs font-medium text-[var(--editorial-accent)] whitespace-nowrap hover:bg-[var(--editorial-accent)]/20 transition-colors"
          >
            <Star className="w-3 h-3" />
            Michelin
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Quick filter suggestions when no filters active */}
        {!hasFilters && (
          <>
            <span className="text-[11px] text-[var(--editorial-text-tertiary)] uppercase tracking-wider font-medium mr-1">
              Quick filters:
            </span>
            <button
              onClick={() => setMichelinOnly(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Star className="w-3 h-3" />
              Michelin
            </button>
            <button
              onClick={() => handleFiltersChange({ ...advancedFilters, openNow: true })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="w-3 h-3" />
              Open Now
            </button>
            <button
              onClick={() => handleFiltersChange({ ...advancedFilters, minRating: 4.5 })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              4.5+ Rating
            </button>
          </>
        )}
      </div>

      {/* Inline filter slot for SearchFiltersComponent */}
      <div id="search-filters-inline-slot" />
    </div>
  );
}
