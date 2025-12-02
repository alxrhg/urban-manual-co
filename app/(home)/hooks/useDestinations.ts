'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useHomepageStore, type FilterState } from '@/lib/stores/homepage-store';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';
import { isOpenNow } from '@/lib/utils/opening-hours';

/**
 * Hook for fetching and filtering destinations
 *
 * Features:
 * - Initial data hydration from SSR
 * - Background refresh
 * - Filter application
 * - Sort application
 * - Debounced search
 */

interface UseDestinationsOptions {
  initialDestinations?: Destination[];
  initialCities?: string[];
  initialCategories?: string[];
  initialTrending?: Destination[];
}

export function useDestinations(options: UseDestinationsOptions = {}) {
  const {
    initialDestinations = [],
    initialCities = [],
    initialCategories = [],
    initialTrending = [],
  } = options;

  // Store state
  const destinations = useHomepageStore((state) => state.destinations);
  const filteredDestinations = useHomepageStore((state) => state.filteredDestinations);
  const cities = useHomepageStore((state) => state.cities);
  const categories = useHomepageStore((state) => state.categories);
  const filters = useHomepageStore((state) => state.filters);
  const sortBy = useHomepageStore((state) => state.sortBy);
  const isLoading = useHomepageStore((state) => state.isLoading);
  const isSearching = useHomepageStore((state) => state.isSearching);

  // Store actions
  const setDestinations = useHomepageStore((state) => state.setDestinations);
  const setFilteredDestinations = useHomepageStore((state) => state.setFilteredDestinations);
  const setCities = useHomepageStore((state) => state.setCities);
  const setCategories = useHomepageStore((state) => state.setCategories);
  const setTrending = useHomepageStore((state) => state.setTrending);
  const setLoading = useHomepageStore((state) => state.setLoading);
  const setSearching = useHomepageStore((state) => state.setSearching);
  const setError = useHomepageStore((state) => state.setError);

  // Track initialization
  const initializedRef = useRef(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize with SSR data
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (initialDestinations.length > 0) {
      setDestinations(initialDestinations);
      setFilteredDestinations(initialDestinations);
    }
    if (initialCities.length > 0) {
      setCities(initialCities);
    }
    if (initialCategories.length > 0) {
      setCategories(initialCategories);
    }
    if (initialTrending.length > 0) {
      setTrending(initialTrending);
    }
  }, [
    initialDestinations,
    initialCities,
    initialCategories,
    initialTrending,
    setDestinations,
    setFilteredDestinations,
    setCities,
    setCategories,
    setTrending,
  ]);

  // Fetch destinations from Supabase
  const fetchDestinations = useCallback(async (filterOverrides?: Partial<FilterState>) => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      setLoading(true);
      setError(null);

      const appliedFilters = { ...filters, ...filterOverrides };

      // Build query
      let query = supabase
        .from('destinations')
        .select('*')
        .order('name', { ascending: true });

      // Apply filters
      if (appliedFilters.city) {
        query = query.eq('city', appliedFilters.city);
      }

      if (appliedFilters.category) {
        query = query.eq('category', appliedFilters.category);
      }

      if (appliedFilters.michelinOnly) {
        query = query.gt('michelin_stars', 0);
      }

      if (appliedFilters.crownOnly) {
        query = query.eq('crown', true);
      }

      if (appliedFilters.priceLevel !== null) {
        query = query.lte('price_level', appliedFilters.priceLevel);
      }

      if (appliedFilters.minRating !== null) {
        query = query.gte('rating', appliedFilters.minRating);
      }

      const { data, error } = await query.limit(1000);

      if (error) throw error;

      let results = data as Destination[];

      // Client-side filtering for complex conditions
      if (appliedFilters.searchTerm) {
        const term = appliedFilters.searchTerm.toLowerCase();
        results = results.filter((d) =>
          d.name.toLowerCase().includes(term) ||
          d.city.toLowerCase().includes(term) ||
          d.category.toLowerCase().includes(term) ||
          d.description?.toLowerCase().includes(term) ||
          d.micro_description?.toLowerCase().includes(term)
        );
      }

      if (appliedFilters.openNow) {
        results = results.filter((d) =>
          d.opening_hours_json && d.city
            ? isOpenNow(d.opening_hours_json, d.city, d.timezone_id, d.utc_offset)
            : false
        );
      }

      if (appliedFilters.tags.length > 0) {
        results = results.filter((d) =>
          d.tags?.some((tag) =>
            appliedFilters.tags.some((filterTag) =>
              tag.toLowerCase().includes(filterTag.toLowerCase())
            )
          )
        );
      }

      // Apply sorting
      results = sortDestinations(results, sortBy);

      setDestinations(data as Destination[]);
      setFilteredDestinations(results);

      // Extract unique cities and categories if not already set
      if (cities.length === 0) {
        const uniqueCities = [...new Set(data.map((d: Destination) => d.city))].sort();
        setCities(uniqueCities);
      }

      if (categories.length === 0) {
        const uniqueCategories = [...new Set(data.map((d: Destination) => d.category))].sort();
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Error fetching destinations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch destinations');
    } finally {
      setLoading(false);
    }
  }, [
    filters,
    sortBy,
    cities.length,
    categories.length,
    setDestinations,
    setFilteredDestinations,
    setCities,
    setCategories,
    setLoading,
    setError,
  ]);

  // Search with debounce
  const searchDestinations = useCallback(async (query: string) => {
    // Clear existing debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Debounce search
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);

        if (!query.trim()) {
          // Reset to all destinations with current filters
          await fetchDestinations();
          return;
        }

        const supabase = createClient();
        if (!supabase) return;

        // Use text search
        const { data, error } = await supabase
          .from('destinations')
          .select('*')
          .or(`name.ilike.%${query}%,city.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(100);

        if (error) throw error;

        let results = data as Destination[];

        // Apply other filters
        if (filters.city) {
          results = results.filter((d) => d.city === filters.city);
        }
        if (filters.category) {
          results = results.filter((d) => d.category === filters.category);
        }
        if (filters.michelinOnly) {
          results = results.filter((d) => (d.michelin_stars ?? 0) > 0);
        }
        if (filters.crownOnly) {
          results = results.filter((d) => d.crown === true);
        }

        results = sortDestinations(results, sortBy);

        setFilteredDestinations(results);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [filters, sortBy, fetchDestinations, setFilteredDestinations, setSearching, setError]);

  // AI-powered search
  const aiSearch = useCallback(async (query: string) => {
    try {
      setSearching(true);

      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('AI search failed');
      }

      const data = await response.json();
      setFilteredDestinations(data.destinations || []);
    } catch (err) {
      console.error('AI search error:', err);
      // Fall back to regular search
      await searchDestinations(query);
    } finally {
      setSearching(false);
    }
  }, [searchDestinations, setFilteredDestinations, setSearching]);

  // Apply filters to current destinations
  const applyFilters = useCallback(() => {
    let results = [...destinations];

    // Apply all filters
    if (filters.city) {
      results = results.filter((d) => d.city === filters.city);
    }

    if (filters.category) {
      results = results.filter((d) => d.category === filters.category);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      results = results.filter((d) =>
        d.name.toLowerCase().includes(term) ||
        d.city.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term)
      );
    }

    if (filters.michelinOnly) {
      results = results.filter((d) => (d.michelin_stars ?? 0) > 0);
    }

    if (filters.crownOnly) {
      results = results.filter((d) => d.crown === true);
    }

    if (filters.openNow) {
      results = results.filter((d) =>
        d.opening_hours_json && d.city
          ? isOpenNow(d.opening_hours_json, d.city, d.timezone_id, d.utc_offset)
          : false
      );
    }

    if (filters.priceLevel !== null) {
      results = results.filter((d) =>
        (d.price_level ?? 0) <= filters.priceLevel!
      );
    }

    if (filters.minRating !== null) {
      results = results.filter((d) =>
        (d.rating ?? 0) >= filters.minRating!
      );
    }

    if (filters.tags.length > 0) {
      results = results.filter((d) =>
        d.tags?.some((tag) =>
          filters.tags.some((filterTag) =>
            tag.toLowerCase().includes(filterTag.toLowerCase())
          )
        )
      );
    }

    // Apply sorting
    results = sortDestinations(results, sortBy);

    setFilteredDestinations(results);
  }, [destinations, filters, sortBy, setFilteredDestinations]);

  // Re-apply filters when they change
  useEffect(() => {
    if (destinations.length > 0) {
      applyFilters();
    }
  }, [filters, sortBy, applyFilters, destinations.length]);

  // Refresh data
  const refresh = useCallback(() => {
    return fetchDestinations();
  }, [fetchDestinations]);

  return {
    // Data
    destinations: filteredDestinations,
    allDestinations: destinations,
    cities,
    categories,

    // State
    isLoading,
    isSearching,

    // Actions
    fetchDestinations,
    searchDestinations,
    aiSearch,
    refresh,
    applyFilters,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function sortDestinations(destinations: Destination[], sortBy: string): Destination[] {
  const sorted = [...destinations];

  switch (sortBy) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));

    case 'rating':
      return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

    case 'recent':
      // Assuming we have a created_at or similar field
      return sorted.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));

    case 'distance':
      // Distance sorting requires location context
      return sorted.sort((a, b) =>
        (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
      );

    case 'default':
    default:
      // Default: crown first, then michelin, then alphabetical
      return sorted.sort((a, b) => {
        // Crown destinations first
        if (a.crown && !b.crown) return -1;
        if (!a.crown && b.crown) return 1;

        // Then by michelin stars
        const aStars = a.michelin_stars ?? 0;
        const bStars = b.michelin_stars ?? 0;
        if (aStars !== bStars) return bStars - aStars;

        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
  }
}

export default useDestinations;
