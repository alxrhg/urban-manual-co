/**
 * src/features/inspect - Inspection & Detail View Module
 *
 * This module consolidates components for inspecting and viewing details:
 * - IntelligentDrawer system (unified context-aware drawer)
 * - Destination detail views
 * - Item detail modals and drawers
 *
 * The IntelligentDrawer is the canonical drawer system for detail inspection.
 *
 * Usage:
 *   import { IntelligentDrawer, useIntelligentDrawer, DestinationContent } from '@/src/features/inspect'
 */

// ============================================================================
// INTELLIGENT DRAWER SYSTEM
// Unified, context-aware drawer for all detail views
// ============================================================================
export { default as IntelligentDrawer } from "@/components/IntelligentDrawer/IntelligentDrawer";
export { IntelligentDrawerProvider, useIntelligentDrawer } from "@/components/IntelligentDrawer/IntelligentDrawerContext";
export { default as DrawerShell } from "@/components/IntelligentDrawer/DrawerShell";

// ============================================================================
// CONTENT COMPONENTS
// Individual content types for the IntelligentDrawer
// ============================================================================
export { default as DestinationContent } from "@/components/IntelligentDrawer/DestinationContent";
export { default as TripContent } from "@/components/IntelligentDrawer/TripContent";
export { default as TripSelectorContent } from "@/components/IntelligentDrawer/TripSelectorContent";
export { default as AddToTripContent } from "@/components/IntelligentDrawer/AddToTripContent";
export { default as SimilarContent } from "@/components/IntelligentDrawer/SimilarContent";
export { default as WhyThisContent } from "@/components/IntelligentDrawer/WhyThisContent";
export { default as AccountContent } from "@/components/IntelligentDrawer/AccountContent";
export { default as AuthContent } from "@/components/IntelligentDrawer/AuthContent";

// ============================================================================
// DESTINATION COMPONENTS
// Destination display and inspection
// ============================================================================
export { default as DestinationCard } from "@/components/DestinationCard";
export { default as DestinationCardList } from "@/components/DestinationCardList";
export { default as DestinationBadges } from "@/components/DestinationBadges";
export { default as DestinationDrawer } from "@/components/homepage/DestinationDrawer";
export { default as DestinationBox } from "@/components/trip/DestinationBox";

// ============================================================================
// LEGACY DRAWERS
// Standalone drawers for specific detail views
// ============================================================================
export { default as MapDrawer } from "@/components/MapDrawer";
export { default as ChatDrawer } from "@/components/ChatDrawer";

// ============================================================================
// MODALS
// Modal-based inspection views
// ============================================================================
export { default as VisitModal } from "@/components/VisitModal";
export { default as VisitedModal } from "@/components/VisitedModal";
export { default as SaveDestinationModal } from "@/components/SaveDestinationModal";

// ============================================================================
// DRAWER MOUNT UTILITIES
// Portal mounting for drawers and panels
// ============================================================================
export { default as DrawerMount } from "@/components/DrawerMount";
export { default as PanelMount } from "@/components/PanelMount";

// ============================================================================
// LOCAL DETAIL COMPONENTS
// Components from src/features/detail (new consolidated location)
// ============================================================================
export { default as DetailDestinationDrawer } from "@/src/features/detail/DestinationDrawer";
export { default as DetailSkeleton } from "@/src/features/detail/DetailSkeleton";
export { default as RelatedDestinations } from "@/src/features/detail/RelatedDestinations";
