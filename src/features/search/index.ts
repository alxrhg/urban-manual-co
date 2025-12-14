/**
 * src/features/search - Search UI Module
 *
 * This module consolidates all search-related components:
 * - Search overlays and inputs
 * - Search filters and results
 * - Response sections
 *
 * Usage:
 *   import { SearchOverlay, SearchFilters, SearchInput } from '@/src/features/search'
 */

// ============================================================================
// SEARCH COMPONENTS
// ============================================================================

// Main search overlay and input
export { default as SearchOverlay } from "@/components/search/SearchOverlay";
export { SearchInput } from "@/components/navigation/SearchInput";
export { SearchInputWithIndicator } from "@/components/SearchInputWithIndicator";

// Search filters
export { SearchFiltersComponent as SearchFilters } from "@/components/SearchFilters";

// Response sections (for AI-powered search results)
export { CompactResponseSection } from "@/components/search/CompactResponseSection";

// ============================================================================
// SEARCH SERVICES
// Re-export search-related services for convenience
// ============================================================================
export { searchWithContext, hasModifiers } from "@/lib/contextual-search";

// ============================================================================
// LOCAL SEARCH COMPONENTS
// Components from src/features/search (new consolidated location)
// ============================================================================
export { CompactResponseSection as LocalCompactResponseSection } from "./CompactResponseSection";
export { default as GreetingHero } from "./GreetingHero";
export { default as SearchGridSkeleton } from "./SearchGridSkeleton";
export { SearchFiltersComponent as LocalSearchFilters } from "./SearchFilters";
