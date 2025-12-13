/**
 * Universal ActionPatch model for deterministic refinement suggestions
 *
 * This model provides a structured way to represent follow-up suggestions
 * across all surfaces (homepage, drawer, trip planner) in a deterministic way.
 *
 * Instead of string-based suggestions that require NLU parsing, ActionPatch
 * provides structured patches that can be applied directly to state.
 */

// ============================================
// PATCH OPERATION TYPES
// ============================================

/**
 * Filter operations that can be applied to search state
 */
export interface FilterPatch {
  /** City to filter by (e.g., "Tokyo", "New York") */
  city?: string | null;
  /** Category to filter by (e.g., "restaurant", "hotel", "bar") */
  category?: string | null;
  /** Neighborhood/district to filter by */
  neighborhood?: string | null;
  /** Minimum price level (1-4) */
  priceMin?: number | null;
  /** Maximum price level (1-4) */
  priceMax?: number | null;
  /** Filter to Michelin-starred only */
  michelin?: boolean;
  /** Occasion context (e.g., "date", "business", "anniversary") */
  occasion?: string | null;
  /** Vibe/atmosphere tags to filter by */
  vibes?: string[];
  /** Filter to currently open places */
  openNow?: boolean;
  /** Cuisine type (e.g., "japanese", "italian") */
  cuisine?: string | null;
  /** Rating minimum threshold */
  ratingMin?: number | null;
  /** Time of day context */
  timeContext?: 'breakfast' | 'lunch' | 'dinner' | 'late_night' | null;
}

/**
 * Query modifications to apply
 */
export interface QueryPatch {
  /** Set/replace the search query text */
  set?: string;
  /** Append text to existing query */
  append?: string;
  /** Clear the query */
  clear?: boolean;
}

/**
 * Intent modifications to trigger specific behaviors
 */
export interface IntentPatch {
  /** Switch to a different intent mode */
  mode?: 'search' | 'recommendation' | 'discovery' | 'comparison' | 'more_like_this' | 'itinerary' | 'clarification';
  /** Reference destination for "more like this" */
  referenceSlug?: string;
  /** Itinerary duration for planning mode */
  itineraryDuration?: 'half_day' | 'full_day' | 'multi_day';
  /** Social context */
  socialContext?: 'solo' | 'date' | 'group' | 'business' | 'family';
}

/**
 * Trip-specific operations for the trip planner
 */
export interface TripPatch {
  /** Add a destination to the trip */
  addDestination?: {
    slug: string;
    day?: number;
    time?: string;
  };
  /** Remove a destination from the trip */
  removeDestination?: {
    slug?: string;
    itemId?: string;
  };
  /** Move to a different day */
  moveToDay?: {
    itemId: string;
    targetDay: number;
  };
  /** Change trip dates */
  setDates?: {
    startDate?: string;
    endDate?: string;
  };
  /** Add a new day to the trip */
  addDay?: boolean;
  /** Set trip destination cities */
  setDestinations?: string[];
}

/**
 * Navigation patches for drawer/modal state
 */
export interface NavigationPatch {
  /** Open a destination drawer */
  openDrawer?: {
    type: 'destination' | 'trip' | 'search';
    slug?: string;
    tripId?: string;
  };
  /** Close any open drawer */
  closeDrawer?: boolean;
  /** Navigate to a different page */
  navigateTo?: string;
}

// ============================================
// MAIN ACTION PATCH TYPE
// ============================================

/**
 * The primary structured patch object describing what changes to apply
 */
export interface ActionPatchData {
  /** Filter modifications to apply */
  filters?: FilterPatch;
  /** Query text modifications */
  query?: QueryPatch;
  /** Intent/mode modifications */
  intent?: IntentPatch;
  /** Trip-specific modifications */
  trip?: TripPatch;
  /** Navigation/UI modifications */
  navigation?: NavigationPatch;
  /** Clear all current filters */
  clearFilters?: boolean;
  /** Reset to initial state */
  reset?: boolean;
}

/**
 * Reason categories explaining why a suggestion is being made
 */
export type ActionPatchReasonType =
  | 'refine' // Narrow down current results
  | 'expand' // Broaden the search
  | 'related' // Contextually related suggestion
  | 'personalized' // Based on user preferences/history
  | 'popular' // Frequently used or trending
  | 'contextual' // Based on conversation context
  | 'clarification' // Needs more information
  | 'alternative'; // Different approach to same goal

/**
 * Icon types for visual representation
 */
export type ActionPatchIcon =
  | 'location'
  | 'time'
  | 'price'
  | 'rating'
  | 'category'
  | 'cuisine'
  | 'vibe'
  | 'trip'
  | 'search'
  | 'filter'
  | 'michelin'
  | 'default';

/**
 * Universal ActionPatch model
 *
 * Every follow-up suggestion across the app uses this structure:
 * - label: Human-readable text shown to the user
 * - patch: Structured data describing what changes to apply
 * - reason: Why this suggestion is being made (for UI hints and debugging)
 *
 * @example
 * // Filter refinement
 * {
 *   label: "Show Michelin-starred only",
 *   patch: { filters: { michelin: true } },
 *   reason: { type: "refine", text: "Results include Michelin restaurants" }
 * }
 *
 * @example
 * // City clarification
 * {
 *   label: "Tokyo",
 *   patch: { filters: { city: "Tokyo" }, query: { set: "restaurants in Tokyo" } },
 *   reason: { type: "clarification", text: "Specify city for better results" }
 * }
 *
 * @example
 * // Trip action
 * {
 *   label: "Add to Day 2",
 *   patch: { trip: { addDestination: { slug: "sake-bar-tokyo", day: 2 } } },
 *   reason: { type: "contextual", text: "Add to your Tokyo trip" }
 * }
 */
export interface ActionPatch {
  /** Human-readable label shown to the user */
  label: string;
  /** Structured patch data describing what changes to apply */
  patch: ActionPatchData;
  /** Reason/context for this suggestion */
  reason: {
    /** Category of reason */
    type: ActionPatchReasonType;
    /** Optional detailed explanation */
    text?: string;
  };
  /** Optional icon for visual representation */
  icon?: ActionPatchIcon;
  /** Optional priority for sorting (higher = more important) */
  priority?: number;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Result of applying a patch - useful for tracking what changed
 */
export interface PatchApplicationResult {
  /** Whether the patch was successfully applied */
  success: boolean;
  /** Description of what changed */
  changes: string[];
  /** New state after applying patch (generic for flexibility) */
  newState?: Record<string, unknown>;
  /** Any errors that occurred */
  errors?: string[];
}

/**
 * Configuration for patch application behavior
 */
export interface PatchApplicationConfig {
  /** Whether to merge with existing state or replace */
  mergeMode?: 'merge' | 'replace';
  /** Whether to validate the patch before applying */
  validate?: boolean;
  /** Whether to track changes for undo */
  trackChanges?: boolean;
}

// ============================================
// UTILITY TYPE GUARDS
// ============================================

/**
 * Type guard to check if an object is a valid ActionPatch
 */
export function isActionPatch(obj: unknown): obj is ActionPatch {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.label === 'string' &&
    candidate.patch !== undefined &&
    typeof candidate.patch === 'object' &&
    candidate.reason !== undefined &&
    typeof candidate.reason === 'object' &&
    typeof (candidate.reason as Record<string, unknown>).type === 'string'
  );
}

/**
 * Type guard to check if patch has filter operations
 */
export function hasFilterPatch(patch: ActionPatchData): patch is ActionPatchData & { filters: FilterPatch } {
  return patch.filters !== undefined && Object.keys(patch.filters).length > 0;
}

/**
 * Type guard to check if patch has query operations
 */
export function hasQueryPatch(patch: ActionPatchData): patch is ActionPatchData & { query: QueryPatch } {
  return patch.query !== undefined && Object.keys(patch.query).length > 0;
}

/**
 * Type guard to check if patch has trip operations
 */
export function hasTripPatch(patch: ActionPatchData): patch is ActionPatchData & { trip: TripPatch } {
  return patch.trip !== undefined && Object.keys(patch.trip).length > 0;
}

/**
 * Type guard to check if patch has navigation operations
 */
export function hasNavigationPatch(patch: ActionPatchData): patch is ActionPatchData & { navigation: NavigationPatch } {
  return patch.navigation !== undefined && Object.keys(patch.navigation).length > 0;
}
