/**
 * src/features - Feature Modules
 *
 * This is the main entry point for all feature modules.
 * Each feature module contains related components, hooks, and utilities.
 *
 * Features:
 * - trips: Trip planning, itinerary cards, timeline views
 * - search: Search overlays, filters, and results
 * - inspect: Destination details, IntelligentDrawer system
 * - passport: User account, saved/visited places, auth
 *
 * Usage:
 *   import { trips, search, inspect, passport } from '@/src/features'
 *   // or import directly from feature:
 *   import { TripBuilder, FlightCard } from '@/src/features/trips'
 */

export * as trips from "./trips";
export * as search from "./search";
export * as inspect from "./inspect";
export * as passport from "./passport";
