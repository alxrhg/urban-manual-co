import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Destination } from '@/types/destination';

/**
 * Homepage Store - Unified state management for the homepage
 *
 * Features:
 * - Filter state (city, category, search)
 * - View mode (grid/map/split)
 * - Pagination
 * - Sort options
 * - URL sync for filters
 */

// ============================================================================
// Types
// ============================================================================

export type ViewMode = 'grid' | 'map' | 'split';

export type SortOption = 'default' | 'recent' | 'rating' | 'name' | 'distance';

export interface FilterState {
  city: string;
  category: string;
  searchTerm: string;
  michelinOnly: boolean;
  crownOnly: boolean;
  openNow: boolean;
  priceLevel: number | null;
  minRating: number | null;
  tags: string[];
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

// ============================================================================
// Store State
// ============================================================================

interface HomepageState {
  // Data
  destinations: Destination[];
  filteredDestinations: Destination[];
  cities: string[];
  categories: string[];
  trendingDestinations: Destination[];

  // UI State
  viewMode: ViewMode;
  sortBy: SortOption;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  // Filters
  filters: FilterState;
  activeFilterCount: number;

  // Pagination
  pagination: PaginationState;

  // Selected state
  selectedDestination: Destination | null;
  hoveredDestination: Destination | null;

  // User state
  visitedSlugs: Set<string>;
  savedSlugs: Set<string>;

  // Feature flags
  isAIEnabled: boolean;
  showFilters: boolean;

  // ============================================================================
  // Actions
  // ============================================================================

  // Data actions
  setDestinations: (destinations: Destination[]) => void;
  setFilteredDestinations: (destinations: Destination[]) => void;
  setCities: (cities: string[]) => void;
  setCategories: (categories: string[]) => void;
  setTrending: (destinations: Destination[]) => void;

  // UI actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortOption) => void;
  setLoading: (loading: boolean) => void;
  setSearching: (searching: boolean) => void;
  setError: (error: string | null) => void;
  toggleFilters: () => void;

  // Filter actions
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof FilterState) => void;

  // Pagination actions
  setPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Selection actions
  selectDestination: (destination: Destination | null) => void;
  hoverDestination: (destination: Destination | null) => void;

  // User data actions
  markVisited: (slug: string) => void;
  markSaved: (slug: string) => void;
  removeSaved: (slug: string) => void;
  setVisitedSlugs: (slugs: string[]) => void;
  setSavedSlugs: (slugs: string[]) => void;

  // Computed getters
  getPagedDestinations: () => Destination[];
  getTotalPages: () => number;
}

// ============================================================================
// Initial State
// ============================================================================

const initialFilters: FilterState = {
  city: '',
  category: '',
  searchTerm: '',
  michelinOnly: false,
  crownOnly: false,
  openNow: false,
  priceLevel: null,
  minRating: null,
  tags: [],
};

const initialPagination: PaginationState = {
  currentPage: 1,
  itemsPerPage: 24,
  totalItems: 0,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useHomepageStore = create<HomepageState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      destinations: [],
      filteredDestinations: [],
      cities: [],
      categories: [],
      trendingDestinations: [],

      viewMode: 'grid',
      sortBy: 'default',
      isLoading: false,
      isSearching: false,
      error: null,

      filters: initialFilters,
      activeFilterCount: 0,

      pagination: initialPagination,

      selectedDestination: null,
      hoveredDestination: null,

      visitedSlugs: new Set(),
      savedSlugs: new Set(),

      isAIEnabled: true,
      showFilters: false,

      // ============================================================================
      // Data Actions
      // ============================================================================

      setDestinations: (destinations) => {
        set((state) => {
          state.destinations = destinations;
          state.pagination.totalItems = destinations.length;
        });
      },

      setFilteredDestinations: (destinations) => {
        set((state) => {
          state.filteredDestinations = destinations;
          state.pagination.totalItems = destinations.length;
          // Reset to page 1 when filtered results change
          state.pagination.currentPage = 1;
        });
      },

      setCities: (cities) => {
        set((state) => {
          state.cities = cities;
        });
      },

      setCategories: (categories) => {
        set((state) => {
          state.categories = categories;
        });
      },

      setTrending: (destinations) => {
        set((state) => {
          state.trendingDestinations = destinations;
        });
      },

      // ============================================================================
      // UI Actions
      // ============================================================================

      setViewMode: (mode) => {
        set((state) => {
          state.viewMode = mode;
        });
      },

      setSortBy: (sort) => {
        set((state) => {
          state.sortBy = sort;
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setSearching: (searching) => {
        set((state) => {
          state.isSearching = searching;
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      toggleFilters: () => {
        set((state) => {
          state.showFilters = !state.showFilters;
        });
      },

      // ============================================================================
      // Filter Actions
      // ============================================================================

      setFilter: (key, value) => {
        set((state) => {
          state.filters[key] = value;
          state.activeFilterCount = calculateActiveFilters(state.filters);
          state.pagination.currentPage = 1;
        });
      },

      setFilters: (filters) => {
        set((state) => {
          state.filters = { ...state.filters, ...filters };
          state.activeFilterCount = calculateActiveFilters(state.filters);
          state.pagination.currentPage = 1;
        });
      },

      clearFilters: () => {
        set((state) => {
          state.filters = { ...initialFilters };
          state.activeFilterCount = 0;
          state.pagination.currentPage = 1;
        });
      },

      clearFilter: (key) => {
        set((state) => {
          if (key === 'tags') {
            state.filters.tags = [];
          } else if (typeof initialFilters[key] === 'boolean') {
            (state.filters as any)[key] = false;
          } else if (typeof initialFilters[key] === 'number') {
            (state.filters as any)[key] = null;
          } else {
            (state.filters as any)[key] = '';
          }
          state.activeFilterCount = calculateActiveFilters(state.filters);
        });
      },

      // ============================================================================
      // Pagination Actions
      // ============================================================================

      setPage: (page) => {
        set((state) => {
          const totalPages = Math.ceil(state.pagination.totalItems / state.pagination.itemsPerPage);
          state.pagination.currentPage = Math.max(1, Math.min(page, totalPages));
        });
      },

      setItemsPerPage: (count) => {
        set((state) => {
          state.pagination.itemsPerPage = count;
          state.pagination.currentPage = 1;
        });
      },

      nextPage: () => {
        const { currentPage, totalItems, itemsPerPage } = get().pagination;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (currentPage < totalPages) {
          set((state) => {
            state.pagination.currentPage = currentPage + 1;
          });
        }
      },

      prevPage: () => {
        const { currentPage } = get().pagination;
        if (currentPage > 1) {
          set((state) => {
            state.pagination.currentPage = currentPage - 1;
          });
        }
      },

      // ============================================================================
      // Selection Actions
      // ============================================================================

      selectDestination: (destination) => {
        set((state) => {
          state.selectedDestination = destination;
        });
      },

      hoverDestination: (destination) => {
        set((state) => {
          state.hoveredDestination = destination;
        });
      },

      // ============================================================================
      // User Data Actions
      // ============================================================================

      markVisited: (slug) => {
        set((state) => {
          state.visitedSlugs.add(slug);
        });
      },

      markSaved: (slug) => {
        set((state) => {
          state.savedSlugs.add(slug);
        });
      },

      removeSaved: (slug) => {
        set((state) => {
          state.savedSlugs.delete(slug);
        });
      },

      setVisitedSlugs: (slugs) => {
        set((state) => {
          state.visitedSlugs = new Set(slugs);
        });
      },

      setSavedSlugs: (slugs) => {
        set((state) => {
          state.savedSlugs = new Set(slugs);
        });
      },

      // ============================================================================
      // Computed Getters
      // ============================================================================

      getPagedDestinations: () => {
        const { filteredDestinations, pagination } = get();
        const { currentPage, itemsPerPage } = pagination;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDestinations.slice(startIndex, startIndex + itemsPerPage);
      },

      getTotalPages: () => {
        const { pagination } = get();
        return Math.ceil(pagination.totalItems / pagination.itemsPerPage);
      },
    }))
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

function calculateActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.city) count++;
  if (filters.category) count++;
  if (filters.searchTerm) count++;
  if (filters.michelinOnly) count++;
  if (filters.crownOnly) count++;
  if (filters.openNow) count++;
  if (filters.priceLevel !== null) count++;
  if (filters.minRating !== null) count++;
  if (filters.tags.length > 0) count++;
  return count;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectFilters = (state: HomepageState) => state.filters;
export const selectPagination = (state: HomepageState) => state.pagination;
export const selectViewMode = (state: HomepageState) => state.viewMode;
export const selectDestinations = (state: HomepageState) => state.filteredDestinations;
export const selectIsLoading = (state: HomepageState) => state.isLoading || state.isSearching;
export const selectSelectedDestination = (state: HomepageState) => state.selectedDestination;

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook for filter state and actions
 */
export function useFilters() {
  return useHomepageStore((state) => ({
    filters: state.filters,
    activeCount: state.activeFilterCount,
    showFilters: state.showFilters,
    setFilter: state.setFilter,
    setFilters: state.setFilters,
    clearFilters: state.clearFilters,
    clearFilter: state.clearFilter,
    toggleFilters: state.toggleFilters,
  }));
}

/**
 * Hook for pagination state and actions
 */
export function usePagination() {
  return useHomepageStore((state) => ({
    ...state.pagination,
    totalPages: state.getTotalPages(),
    setPage: state.setPage,
    setItemsPerPage: state.setItemsPerPage,
    nextPage: state.nextPage,
    prevPage: state.prevPage,
  }));
}

/**
 * Hook for view mode
 */
export function useViewMode() {
  return useHomepageStore((state) => ({
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
  }));
}

/**
 * Hook for destination selection
 */
export function useDestinationSelection() {
  return useHomepageStore((state) => ({
    selectedDestination: state.selectedDestination,
    hoveredDestination: state.hoveredDestination,
    selectDestination: state.selectDestination,
    hoverDestination: state.hoverDestination,
  }));
}
