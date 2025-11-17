# Removal Review - Past Week
**Date:** November 16, 2025  
**Review Period:** November 9-16, 2025

## Summary

This document reviews all removals and deletions from the past week to identify features, components, or functionality that should potentially be restored.

---

## ✅ Already Restored

### 1. AccountDrawer and Related Drawer Components
**Removed:** November 15, 2025 (commit 3bd2c88)  
**Restored:** November 15, 2025 (commit 931ae1e)  
**Status:** ✅ **RESTORED** - These components are back in the codebase

**Files:**
- `components/AccountDrawer.tsx` ✅ Restored
- `components/SavedPlacesDrawer.tsx` ✅ Restored  
- `components/SettingsDrawer.tsx` ✅ Restored
- `components/TripsDrawer.tsx` ✅ Restored
- `components/VisitedPlacesDrawer.tsx` ✅ Restored

**Decision:** No action needed - already restored.

---

## 🔍 Items to Review

### 2. Crowding Indicators API
**Removed:** November 13, 2025 (commit 6f910c4)  
**File:** `app/api/realtime/aggregate-crowding/route.ts`  
**Status:** ✅ **FULLY REMOVED** (per user request)

**Context:**
- The crowding aggregation API endpoint was removed
- User requested complete removal as it wasn't working
- Removed `checkCrowdingIntelligence` function from realtime service
- Removed crowding adjustments from intelligence flow

**Decision:**
- ✅ **REMOVED** - User confirmed it's not working and should be removed
- All crowding intelligence code has been cleaned up

---

### 3. Trip Budget Feature
**Removed:** November 12, 2025 (commit fef3231)  
**Status:** ✅ **COMPLETELY REMOVED** (per user request)

**Context:**
- User requested complete removal of trip budget feature
- Budget tracking was not desired functionality

**Removal Actions:**
- ✅ Deleted `components/TripBudgetTracker.tsx` component
- ✅ Removed `totalBudget` state from `TripPlanner.tsx`
- ✅ Removed `budget` field from `DayItinerary` interface
- ✅ Removed budget input field from trip creation UI
- ✅ Removed budget references from `AddToTripModal.tsx`
- ✅ Cleaned up all budget-related code

**Note:** Budget references still exist in other parts of the codebase (intelligence APIs, search filters) but those are for search/query preferences, not trip budget tracking.

---

### 4. /itinerary Page
**Removed:** November 14, 2025 (commit 09cc9c2)  
**File:** `app/itinerary/page.tsx`  
**Status:** ✅ **OKAY TO REMOVE**

**Context:**
- The standalone `/itinerary` page was removed
- Navigation link was also removed from Header
- However, trip itinerary functionality still exists:
  - `app/trips/[id]/page.tsx` - Trip detail page with itinerary
  - `components/TripPlanner.tsx` - Full trip planning component
  - `app/api/intelligence/itinerary/generate/route.ts` - Itinerary generation API
  - `app/api/agents/itinerary-builder/route.ts` - Itinerary builder agent

**Impact:**
- **LOW** - Functionality still exists elsewhere
- The removal appears intentional - consolidating itinerary features into trip pages

**Recommendation:**
- ✅ **NO ACTION** - This was likely a consolidation, not a feature removal

---

## ✅ Intentional Removals (No Action Needed)

### 5. Payload CMS → Sanity CMS Migration
**Removed:** November 15, 2025 (commits e2a6149, 72663e3)  
**Status:** ✅ **INTENTIONAL MIGRATION**

**Files Removed:**
- `app/api/payload/[...slug]/route.ts`
- `app/api/payload/auth/route.ts`
- `app/api/payload/import-supabase/route.ts`
- `app/api/payload/sync-supabase/route.ts`
- `app/payload/[[...segments]]/page.tsx`
- `middleware-payload.ts`
- `payload.config.ts`
- `scripts/import-destinations-to-payload.ts`

**Context:**
- Migrated from Payload CMS to Sanity CMS
- This is a technology migration, not a feature removal
- Sanity CMS functionality should replace Payload

**Recommendation:**
- ✅ **NO ACTION** - Intentional migration

---

### 6. Capacitor iOS App
**Removed:** November 14, 2025 (commit 0879739)  
**Status:** ✅ **INTENTIONAL REPLACEMENT**

**Context:**
- Removed Capacitor-based iOS app
- Kept only native Swift app (`ios-app/`)
- This is a technology stack decision

**Recommendation:**
- ✅ **NO ACTION** - Intentional replacement with native app

---

### 7. Asimov Integration
**Removed:** November 13, 2025 (commit db6deb7)  
**Status:** ✅ **INTENTIONAL REMOVAL**

**Files Removed:**
- `app/api/asimov/sync/route.ts`
- `lib/search/asimov-sync.ts`
- `lib/search/asimov.ts`
- `scripts/sync-asimov.ts`
- `scripts/sync-destinations-to-asimov.ts`
- `supabase/functions/sync-asimov/index.ts`

**Context:**
- Asimov was a third-party search service
- Removed in favor of simpler fallback to keyword search
- Simplification of search architecture

**Recommendation:**
- ✅ **NO ACTION** - Intentional simplification

---

### 8. TaxonomyFilters Component
**Removed:** November 10, 2025 (commit 06714ce)  
**File:** `components/TaxonomyFilters.tsx`  
**Status:** ✅ **DESIGN SYSTEM REVERT**

**Context:**
- Removed as part of design system revert
- Commit message: "Revert design system changes"
- Part of larger design system rollback

**Recommendation:**
- ✅ **NO ACTION** - Part of intentional design revert

---

### 9. SimpleFooter Component
**Removed:** November 15, 2025 (commit c093370)  
**File:** `components/SimpleFooter.tsx`  
**Status:** ✅ **REDESIGN**

**Context:**
- Removed as part of footer redesign
- New footer design implemented with design system standards
- This is a redesign, not a feature removal

**Recommendation:**
- ✅ **NO ACTION** - Intentional redesign

---

## 📊 Summary & Recommendations

### ✅ Removed Per User Request:
1. **Trip Budget Feature** - Completely removed
   - ✅ Deleted `TripBudgetTracker.tsx` component
   - ✅ Removed budget state and UI from `TripPlanner.tsx`
   - ✅ Removed budget field from `DayItinerary` interface
   - ✅ Removed budget references from `AddToTripModal.tsx`
   - ✅ Cleaned up all budget-related code

2. **Crowding Indicators API** - Removed
   - ✅ Removed `checkCrowdingIntelligence` function from `services/intelligence/realtime.ts`
   - ✅ Removed crowding adjustments from real-time intelligence flow
   - Note: API endpoint was already removed, now fully cleaned up

### No Action Needed:
- AccountDrawer components (already restored)
- /itinerary page (functionality exists elsewhere)
- Payload CMS (migrated to Sanity)
- Capacitor iOS app (replaced with native)
- Asimov integration (intentional simplification)
- TaxonomyFilters (design system revert)
- SimpleFooter (redesign)

---

## Cleanup Summary

### Completed Removals (November 16, 2025):
1. ✅ **Trip Budget Feature** - Completely removed
   - Deleted `TripBudgetTracker.tsx` component
   - Removed all budget-related code from trip planning components
   - Cleaned up budget state and UI elements

2. ✅ **Crowding Indicators** - Fully removed
   - Removed `checkCrowdingIntelligence` function
   - Removed crowding adjustments from real-time intelligence flow
   - API endpoint was already removed, now fully cleaned up

### No Further Action Needed:
- All requested removals have been completed
- Codebase cleaned up and ready

