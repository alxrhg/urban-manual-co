'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Loader2, X } from 'lucide-react';
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

      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          title: 'New Trip',
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
      <div className="flex justify-between items-center">
        {/* Left side - Results count and clear filters */}
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--editorial-text-secondary)]">
            {filteredDestinations.length} destinations
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Create Trip */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg
                       bg-[var(--editorial-accent)] px-4 text-sm font-medium
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
            className="hidden sm:flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-lg
                       border border-[var(--editorial-border)] bg-[var(--editorial-bg-elevated)]
                       px-4 text-sm font-medium text-[var(--editorial-text-primary)]
                       hover:bg-[var(--editorial-border-subtle)]
                       active:scale-[0.98] transition-all duration-200"
          >
            <Globe className="h-4 w-4" />
            <span>Discover by Cities</span>
          </Link>
        </div>
      </div>

      {/* Inline filter slot for SearchFiltersComponent */}
      <div id="search-filters-inline-slot" />
    </div>
  );
}
