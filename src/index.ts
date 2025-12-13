/**
 * src - Consolidated UI System
 *
 * This is the main entry point for the consolidated Urban Manual UI system.
 *
 * Structure:
 * - src/ui: Shared UI primitives and design system components
 * - src/features: Feature-specific modules
 *   - src/features/trips: Trip planning and itinerary
 *   - src/features/search: Search functionality
 *   - src/features/inspect: Detail views and IntelligentDrawer
 *   - src/features/passport: User account and auth
 *
 * Usage:
 *   // Import UI primitives
 *   import { Button, Card, Input } from '@/src/ui'
 *
 *   // Import from feature modules
 *   import { TripBuilder, FlightCard } from '@/src/features/trips'
 *   import { SearchOverlay } from '@/src/features/search'
 *   import { IntelligentDrawer } from '@/src/features/inspect'
 *   import { AccountDrawer } from '@/src/features/passport'
 *
 * Migration Guide:
 * The legacy component paths still work for backwards compatibility:
 *   @/components/ui/* -> @/src/ui
 *   @/components/trip/* -> @/src/features/trips
 *   @/components/trips/* -> @/src/features/trips
 *   @/components/drawers/* -> @/src/features/trips or @/src/features/inspect
 *   @/components/IntelligentDrawer/* -> @/src/features/inspect
 *   @/components/search/* -> @/src/features/search
 */

// Re-export all UI primitives
export * from "./ui";

// Re-export feature modules
export * from "./features";
