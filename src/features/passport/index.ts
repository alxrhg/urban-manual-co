/**
 * src/features/passport - User Passport & Account Module
 *
 * This module consolidates all user account-related components:
 * - Account management and profile
 * - Saved and visited places
 * - Authentication flows
 * - User preferences and settings
 *
 * "Passport" represents the user's travel identity and history.
 *
 * Usage:
 *   import { AccountDrawer, SavedPlacesDrawer, LoginModal } from '@/src/features/passport'
 */

// ============================================================================
// ACCOUNT COMPONENTS
// Primary user account and profile management
// ============================================================================

// Account drawer (canonical version from root components)
export { AccountDrawer } from "@/components/AccountDrawer";

// Settings drawer
export { SettingsDrawer } from "@/components/SettingsDrawer";

// ============================================================================
// AUTHENTICATION
// Login and auth-related components
// ============================================================================
export { LoginDrawer } from "@/components/LoginDrawer";
export { LoginModal } from "@/components/LoginModal";

// ============================================================================
// SAVED & VISITED PLACES
// User's place collections
// ============================================================================
export { SavedPlacesDrawer } from "@/components/SavedPlacesDrawer";
export { VisitedPlacesDrawer } from "@/components/VisitedPlacesDrawer";

// ============================================================================
// TRIPS OVERVIEW
// User's trip management
// ============================================================================
export { TripsDrawer } from "@/components/TripsDrawer";

// ============================================================================
// REPORTING & FEEDBACK
// User feedback components
// ============================================================================
export { ReportIssueModal } from "@/components/ReportIssueModal";

// ============================================================================
// AUTH CONTEXT
// Re-export auth context for convenience
// ============================================================================
export { AuthProvider, useAuth } from "@/contexts/AuthContext";
