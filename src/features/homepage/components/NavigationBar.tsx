'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
    <div className="mb-10">
      <div className="flex justify-between items-center">
        {/* Left side - Subtle results count */}
        <div className="flex items-center gap-4">
          <p
            className="text-[12px] text-[var(--editorial-text-tertiary)] tracking-wide"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            {filteredDestinations.length} places
          </p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[11px] text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Right side - Minimal actions */}
        <div className="flex items-center gap-6">
          {/* Create Trip - Text link style */}
          <button
            onClick={handleCreateTrip}
            disabled={creatingTrip}
            className="text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)]
                       disabled:opacity-50 transition-colors"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            {creatingTrip ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Trip'
            )}
          </button>

          {/* Filters - Minimal */}
          <SearchFiltersComponent
            filters={advancedFilters}
            onFiltersChange={handleFiltersChange}
            availableCities={cities}
            availableCategories={categories}
            fullWidthPanel={true}
            useFunnelIcon={true}
          />

          {/* Discover by Cities - Text link */}
          <Link
            href="/cities"
            className="hidden sm:block text-[13px] text-[var(--editorial-text-secondary)]
                       hover:text-[var(--editorial-text-primary)] transition-colors"
            style={{ fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
          >
            Explore Cities
          </Link>
        </div>
      </div>

      {/* Inline filter slot for SearchFiltersComponent */}
      <div id="search-filters-inline-slot" />
    </div>
  );
}
