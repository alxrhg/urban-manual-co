/**
 * Action Patch Module
 *
 * Universal ActionPatch model for deterministic refinement suggestions.
 * Re-exports types and utilities for applying patches across surfaces.
 */

// Re-export types
export type {
  ActionPatch,
  ActionPatchData,
  ActionPatchReasonType,
  ActionPatchIcon,
  FilterPatch,
  QueryPatch,
  IntentPatch,
  TripPatch,
  NavigationPatch,
  PatchApplicationResult,
  PatchApplicationConfig,
} from '@/types/action-patch';

// Re-export type guards
export {
  isActionPatch,
  hasFilterPatch,
  hasQueryPatch,
  hasTripPatch,
  hasNavigationPatch,
} from '@/types/action-patch';

// Re-export application utilities
export {
  type SearchState,
  type SearchStatePatchResult,
  createEmptySearchState,
  applyFilterPatch,
  applyQueryPatch,
  applyPatchToSearchState,
  patchToQueryParams,
  queryParamsToPatch,
} from './apply-patch';

// Re-export patch builders
export {
  createFilterPatch,
  createCityPatch,
  createCategoryPatch,
  createMichelinPatch,
  createPricePatch,
  createOpenNowPatch,
  createVibePatch,
  createItineraryPatch,
  createMoreLikeThisPatch,
  createResetPatch,
} from './apply-patch';
