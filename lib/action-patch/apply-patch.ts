/**
 * Utility functions for applying ActionPatch operations to state
 *
 * This module provides deterministic patch application that can be used
 * across different surfaces (homepage, drawer, trip planner).
 */

import {
  ActionPatch,
  ActionPatchData,
  FilterPatch,
  QueryPatch,
  PatchApplicationResult,
  PatchApplicationConfig,
  hasFilterPatch,
  hasQueryPatch,
  hasTripPatch,
  hasNavigationPatch,
} from '@/types/action-patch';

// ============================================
// FILTER STATE TYPE
// ============================================

/**
 * Common search/filter state structure used across the app
 */
export interface SearchState {
  query: string;
  filters: {
    city?: string | null;
    category?: string | null;
    neighborhood?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    michelin?: boolean;
    occasion?: string | null;
    vibes?: string[];
    openNow?: boolean;
    cuisine?: string | null;
    ratingMin?: number | null;
    timeContext?: 'breakfast' | 'lunch' | 'dinner' | 'late_night' | null;
  };
  intent?: string;
}

/**
 * Create a default/empty search state
 */
export function createEmptySearchState(): SearchState {
  return {
    query: '',
    filters: {
      city: null,
      category: null,
      neighborhood: null,
      priceMin: null,
      priceMax: null,
      michelin: false,
      occasion: null,
      vibes: [],
      openNow: false,
      cuisine: null,
      ratingMin: null,
      timeContext: null,
    },
  };
}

// ============================================
// CORE PATCH APPLICATION
// ============================================

/**
 * Apply filter patches to existing filter state
 */
export function applyFilterPatch(
  currentFilters: SearchState['filters'],
  filterPatch: FilterPatch,
  config: PatchApplicationConfig = {}
): { filters: SearchState['filters']; changes: string[] } {
  const { mergeMode = 'merge' } = config;
  const changes: string[] = [];

  // Start with current filters or empty object based on mode
  const newFilters: SearchState['filters'] =
    mergeMode === 'replace' ? {} : { ...currentFilters };

  // Apply each filter patch
  if (filterPatch.city !== undefined) {
    if (filterPatch.city !== currentFilters.city) {
      newFilters.city = filterPatch.city;
      changes.push(filterPatch.city ? `Set city to ${filterPatch.city}` : 'Cleared city filter');
    }
  }

  if (filterPatch.category !== undefined) {
    if (filterPatch.category !== currentFilters.category) {
      newFilters.category = filterPatch.category;
      changes.push(filterPatch.category ? `Set category to ${filterPatch.category}` : 'Cleared category filter');
    }
  }

  if (filterPatch.neighborhood !== undefined) {
    if (filterPatch.neighborhood !== currentFilters.neighborhood) {
      newFilters.neighborhood = filterPatch.neighborhood;
      changes.push(filterPatch.neighborhood ? `Set neighborhood to ${filterPatch.neighborhood}` : 'Cleared neighborhood filter');
    }
  }

  if (filterPatch.priceMin !== undefined) {
    if (filterPatch.priceMin !== currentFilters.priceMin) {
      newFilters.priceMin = filterPatch.priceMin;
      changes.push(filterPatch.priceMin ? `Set minimum price level to ${filterPatch.priceMin}` : 'Cleared minimum price filter');
    }
  }

  if (filterPatch.priceMax !== undefined) {
    if (filterPatch.priceMax !== currentFilters.priceMax) {
      newFilters.priceMax = filterPatch.priceMax;
      changes.push(filterPatch.priceMax ? `Set maximum price level to ${filterPatch.priceMax}` : 'Cleared maximum price filter');
    }
  }

  if (filterPatch.michelin !== undefined) {
    if (filterPatch.michelin !== currentFilters.michelin) {
      newFilters.michelin = filterPatch.michelin;
      changes.push(filterPatch.michelin ? 'Enabled Michelin filter' : 'Disabled Michelin filter');
    }
  }

  if (filterPatch.occasion !== undefined) {
    if (filterPatch.occasion !== currentFilters.occasion) {
      newFilters.occasion = filterPatch.occasion;
      changes.push(filterPatch.occasion ? `Set occasion to ${filterPatch.occasion}` : 'Cleared occasion filter');
    }
  }

  if (filterPatch.vibes !== undefined) {
    const currentVibes = currentFilters.vibes || [];
    const newVibes = filterPatch.vibes;
    if (JSON.stringify(currentVibes.sort()) !== JSON.stringify(newVibes.sort())) {
      newFilters.vibes = newVibes;
      changes.push(newVibes.length ? `Set vibes to ${newVibes.join(', ')}` : 'Cleared vibe filters');
    }
  }

  if (filterPatch.openNow !== undefined) {
    if (filterPatch.openNow !== currentFilters.openNow) {
      newFilters.openNow = filterPatch.openNow;
      changes.push(filterPatch.openNow ? 'Filtering to open now' : 'Removed open now filter');
    }
  }

  if (filterPatch.cuisine !== undefined) {
    if (filterPatch.cuisine !== currentFilters.cuisine) {
      newFilters.cuisine = filterPatch.cuisine;
      changes.push(filterPatch.cuisine ? `Set cuisine to ${filterPatch.cuisine}` : 'Cleared cuisine filter');
    }
  }

  if (filterPatch.ratingMin !== undefined) {
    if (filterPatch.ratingMin !== currentFilters.ratingMin) {
      newFilters.ratingMin = filterPatch.ratingMin;
      changes.push(filterPatch.ratingMin ? `Set minimum rating to ${filterPatch.ratingMin}` : 'Cleared rating filter');
    }
  }

  if (filterPatch.timeContext !== undefined) {
    if (filterPatch.timeContext !== currentFilters.timeContext) {
      newFilters.timeContext = filterPatch.timeContext;
      changes.push(filterPatch.timeContext ? `Set time context to ${filterPatch.timeContext}` : 'Cleared time context');
    }
  }

  return { filters: newFilters, changes };
}

/**
 * Apply query patches to existing query string
 */
export function applyQueryPatch(
  currentQuery: string,
  queryPatch: QueryPatch
): { query: string; changes: string[] } {
  const changes: string[] = [];
  let newQuery = currentQuery;

  if (queryPatch.clear) {
    newQuery = '';
    changes.push('Cleared query');
  } else if (queryPatch.set !== undefined) {
    newQuery = queryPatch.set;
    changes.push(`Set query to "${queryPatch.set}"`);
  } else if (queryPatch.append) {
    newQuery = currentQuery ? `${currentQuery} ${queryPatch.append}` : queryPatch.append;
    changes.push(`Appended "${queryPatch.append}" to query`);
  }

  return { query: newQuery, changes };
}

/**
 * Result type for applying patch to SearchState
 */
export interface SearchStatePatchResult {
  success: boolean;
  changes: string[];
  newState: SearchState;
  errors?: string[];
}

/**
 * Apply a full ActionPatch to SearchState
 */
export function applyPatchToSearchState(
  currentState: SearchState,
  patch: ActionPatchData,
  config: PatchApplicationConfig = {}
): SearchStatePatchResult {
  const allChanges: string[] = [];
  const errors: string[] = [];
  let newState = { ...currentState };

  try {
    // Handle reset
    if (patch.reset) {
      newState = createEmptySearchState();
      allChanges.push('Reset to initial state');
      return { success: true, changes: allChanges, newState };
    }

    // Handle clearFilters
    if (patch.clearFilters) {
      newState.filters = createEmptySearchState().filters;
      allChanges.push('Cleared all filters');
    }

    // Apply filter patches
    if (hasFilterPatch(patch)) {
      const { filters, changes } = applyFilterPatch(newState.filters, patch.filters, config);
      newState.filters = filters;
      allChanges.push(...changes);
    }

    // Apply query patches
    if (hasQueryPatch(patch)) {
      const { query, changes } = applyQueryPatch(newState.query, patch.query);
      newState.query = query;
      allChanges.push(...changes);
    }

    // Apply intent patches
    if (patch.intent) {
      if (patch.intent.mode) {
        newState.intent = patch.intent.mode;
        allChanges.push(`Set intent to ${patch.intent.mode}`);
      }
    }

    return {
      success: true,
      changes: allChanges,
      newState,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error applying patch');
    return {
      success: false,
      changes: allChanges,
      newState: currentState,
      errors,
    };
  }
}

// ============================================
// PATCH TO QUERY STRING CONVERSION
// ============================================

/**
 * Convert an ActionPatch to URL query parameters
 * Useful for navigation and sharing
 */
export function patchToQueryParams(patch: ActionPatchData): URLSearchParams {
  const params = new URLSearchParams();

  if (hasFilterPatch(patch)) {
    const { filters } = patch;
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);
    if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
    if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
    if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
    if (filters.michelin) params.set('michelin', 'true');
    if (filters.occasion) params.set('occasion', filters.occasion);
    if (filters.vibes?.length) params.set('vibes', filters.vibes.join(','));
    if (filters.openNow) params.set('openNow', 'true');
    if (filters.cuisine) params.set('cuisine', filters.cuisine);
    if (filters.ratingMin) params.set('ratingMin', String(filters.ratingMin));
    if (filters.timeContext) params.set('timeContext', filters.timeContext);
  }

  if (hasQueryPatch(patch) && patch.query.set) {
    params.set('q', patch.query.set);
  }

  if (patch.intent?.mode) {
    params.set('intent', patch.intent.mode);
  }

  return params;
}

/**
 * Parse URL query parameters into an ActionPatchData
 */
export function queryParamsToPatch(params: URLSearchParams): ActionPatchData {
  const patch: ActionPatchData = {};
  const filters: FilterPatch = {};

  const city = params.get('city');
  if (city) filters.city = city;

  const category = params.get('category');
  if (category) filters.category = category;

  const neighborhood = params.get('neighborhood');
  if (neighborhood) filters.neighborhood = neighborhood;

  const priceMin = params.get('priceMin');
  if (priceMin) filters.priceMin = parseInt(priceMin, 10);

  const priceMax = params.get('priceMax');
  if (priceMax) filters.priceMax = parseInt(priceMax, 10);

  if (params.get('michelin') === 'true') filters.michelin = true;

  const occasion = params.get('occasion');
  if (occasion) filters.occasion = occasion;

  const vibes = params.get('vibes');
  if (vibes) filters.vibes = vibes.split(',');

  if (params.get('openNow') === 'true') filters.openNow = true;

  const cuisine = params.get('cuisine');
  if (cuisine) filters.cuisine = cuisine;

  const ratingMin = params.get('ratingMin');
  if (ratingMin) filters.ratingMin = parseFloat(ratingMin);

  const timeContext = params.get('timeContext');
  if (timeContext && ['breakfast', 'lunch', 'dinner', 'late_night'].includes(timeContext)) {
    filters.timeContext = timeContext as FilterPatch['timeContext'];
  }

  if (Object.keys(filters).length > 0) {
    patch.filters = filters;
  }

  const query = params.get('q');
  if (query) {
    patch.query = { set: query };
  }

  const intent = params.get('intent');
  if (intent) {
    patch.intent = { mode: intent as 'search' | 'recommendation' | 'discovery' };
  }

  return patch;
}

// ============================================
// PATCH BUILDERS (Convenience functions)
// ============================================

/**
 * Create a filter-only ActionPatch
 */
export function createFilterPatch(
  label: string,
  filters: FilterPatch,
  reason: ActionPatch['reason'],
  icon?: ActionPatch['icon']
): ActionPatch {
  return {
    label,
    patch: { filters },
    reason,
    icon,
  };
}

/**
 * Create a city filter ActionPatch
 */
export function createCityPatch(city: string, reasonText?: string): ActionPatch {
  return {
    label: city,
    patch: {
      filters: { city },
    },
    reason: {
      type: 'clarification',
      text: reasonText || 'Filter results by city',
    },
    icon: 'location',
  };
}

/**
 * Create a category filter ActionPatch
 */
export function createCategoryPatch(category: string, city?: string): ActionPatch {
  const label = city ? `${capitalize(category)}s in ${city}` : capitalize(category) + 's';
  return {
    label,
    patch: {
      filters: { category, ...(city && { city }) },
    },
    reason: {
      type: 'refine',
      text: `Show ${category}s`,
    },
    icon: 'category',
  };
}

/**
 * Create a Michelin filter ActionPatch
 */
export function createMichelinPatch(enable: boolean = true): ActionPatch {
  return {
    label: enable ? 'Michelin-starred only' : 'Include all ratings',
    patch: {
      filters: { michelin: enable },
    },
    reason: {
      type: 'refine',
      text: enable ? 'Filter to Michelin-starred restaurants' : 'Remove Michelin filter',
    },
    icon: 'michelin',
  };
}

/**
 * Create a price filter ActionPatch
 */
export function createPricePatch(
  priceLevel: 'budget' | 'mid' | 'upscale',
  label?: string
): ActionPatch {
  const priceMap = {
    budget: { priceMax: 2 },
    mid: { priceMin: 2, priceMax: 3 },
    upscale: { priceMin: 3 },
  };

  const defaultLabels = {
    budget: 'Budget-friendly',
    mid: 'Mid-range',
    upscale: 'Upscale',
  };

  return {
    label: label || defaultLabels[priceLevel],
    patch: {
      filters: priceMap[priceLevel],
    },
    reason: {
      type: 'refine',
      text: `Filter by price level`,
    },
    icon: 'price',
  };
}

/**
 * Create an "open now" filter ActionPatch
 */
export function createOpenNowPatch(): ActionPatch {
  return {
    label: 'Open now',
    patch: {
      filters: { openNow: true },
    },
    reason: {
      type: 'refine',
      text: 'Show only currently open places',
    },
    icon: 'time',
  };
}

/**
 * Create a vibe filter ActionPatch
 */
export function createVibePatch(vibes: string[], label?: string): ActionPatch {
  return {
    label: label || vibes.map(v => capitalize(v)).join(', '),
    patch: {
      filters: { vibes },
    },
    reason: {
      type: 'refine',
      text: `Filter by atmosphere: ${vibes.join(', ')}`,
    },
    icon: 'vibe',
  };
}

/**
 * Create an itinerary mode ActionPatch
 */
export function createItineraryPatch(
  city: string,
  duration: 'half_day' | 'full_day' | 'multi_day' = 'full_day'
): ActionPatch {
  const durationLabels = {
    half_day: 'half day',
    full_day: 'day',
    multi_day: 'multi-day trip',
  };

  return {
    label: `Plan my ${durationLabels[duration]} in ${city}`,
    patch: {
      filters: { city },
      intent: { mode: 'itinerary', itineraryDuration: duration },
    },
    reason: {
      type: 'expand',
      text: 'Create an itinerary',
    },
    icon: 'trip',
  };
}

/**
 * Create a "more like this" ActionPatch
 */
export function createMoreLikeThisPatch(destinationName: string, destinationSlug: string): ActionPatch {
  return {
    label: `More like ${destinationName}`,
    patch: {
      intent: { mode: 'more_like_this', referenceSlug: destinationSlug },
    },
    reason: {
      type: 'related',
      text: `Find similar places to ${destinationName}`,
    },
    icon: 'search',
  };
}

/**
 * Create a reset/clear ActionPatch
 */
export function createResetPatch(): ActionPatch {
  return {
    label: 'Clear all filters',
    patch: {
      clearFilters: true,
    },
    reason: {
      type: 'expand',
      text: 'Remove all filters and start fresh',
    },
    icon: 'filter',
  };
}

// ============================================
// HELPERS
// ============================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
