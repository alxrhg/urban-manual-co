# Redundant Code Review Report

**Generated:** 2025-11-24
**Branch:** `claude/review-redundant-code-01HLVRjgXdzJit9xMGCYaRPp`

## Executive Summary

This report identifies redundant, duplicate, and unused code across the Urban Manual codebase. Cleaning up these issues would remove approximately **2,400+ lines of code** and improve maintainability significantly.

---

## 🔴 CRITICAL - Immediate Action Required

### 1. Duplicate Utility Functions

#### `capitalizeCity()` - 18 Duplicate Definitions

**Centralized Export:** `lib/utils.ts:17`

**Files with redundant local definitions:**
- `src/features/detail/DestinationDrawer.tsx`
- `app/account/page.tsx`
- `app/cities/page.tsx`
- `app/destination/[slug]/page-client.tsx`
- `app/lists/page.tsx`
- `app/city/[city]/page-client.tsx`
- `app/architect/[slug]/page-client.tsx`
- `app/explore/page.tsx`
- `app/collection/[id]/page.tsx`
- `app/lists/[id]/page.tsx`
- `components/account/ProfileTab.tsx`
- `components/RecentlyViewed.tsx`
- `components/EnhancedVisitedTab.tsx`
- `components/EnhancedSavedTab.tsx`
- `components/ProfileEditor.tsx`
- `components/AddPlaceDropdown.tsx`

**Fix:** Remove local definitions and import from `lib/utils`:
```typescript
import { capitalizeCity } from '@/lib/utils';
```

#### `capitalizeCategory()` - 4+ Duplicate Definitions

**Centralized Export:** `lib/utils.ts:28`

**Files with redundant local definitions:**
- `app/page.tsx`
- `app/city/[city]/page-client.tsx`
- `app/architect/[slug]/page-client.tsx`
- `lib/search/generateSuggestions.ts`

#### `stripHtmlTags()` - 3 Implementations

**Centralized Export:** `lib/stripHtmlTags.ts`

**Duplicate implementations:**
- `app/api/fetch-google-place/route.ts` (line 6)
- `scripts/fetch-google-about.ts`

#### `CITY_TIMEZONES` Mapping - 2 Copies

**Primary location:** `lib/utils/opening-hours.ts`

**Duplicate:** `src/features/detail/DestinationDrawer.tsx` (lines 98-137)

---

### 2. Files to Delete Immediately

| File | Lines | Reason |
|------|-------|--------|
| `app/components/chat 2/` | ~354 | Entire folder is duplicate of `app/components/chat/` |
| `app/trips/[id]/page-old.tsx` | 833 | Old version, superseded by current `page.tsx` |
| `components/drawers/DrawerMount.tsx` | 130 | Legacy, superseded by `components/DrawerMount.tsx` |
| `components/drawers/AccountDrawer.tsx` | 60 | Placeholder stub only |
| `components/AccountDrawerV2.tsx` | 220 | Never imported anywhere |
| `app/admin/components/DestinationForm.tsx` | - | Duplicate of `components/admin/DestinationForm.tsx` |

---

## 🟠 HIGH - Should Fix Soon

### 3. Unused Exported Functions

#### `lib/instagram-trends.ts`
Functions exported but never imported:
- `fetchInstagramGraphData()`
- `fetchInstagramHashtags()`
- `fetchInstagramViaThirdParty()`
- `calculateInstagramEngagementScore()`

#### `lib/tiktok-trends.ts`
Functions exported but never imported:
- `fetchTikTokHashtags()`
- `fetchTikTokViaThirdParty()`
- `fetchTikTokTrendingVideos()`
- `calculateTikTokEngagementScore()`
- `calculateTikTokTrendingScore()`

#### `lib/reddit-trends.ts`
Functions exported but never imported:
- `getTrendingFromTravelSubreddits()`

**Recommendation:** Either implement usage or remove these functions entirely.

### 4. Redundant Component Wrappers

These wrapper components add no functionality and should be removed:

| Wrapper | Actual Component | Location |
|---------|------------------|----------|
| `components/account/SavedTab.tsx` | `components/EnhancedSavedTab.tsx` | 18 lines |
| `components/account/VisitedTab.tsx` | `components/EnhancedVisitedTab.tsx` | 20 lines |

**Fix:** Update imports to use `EnhancedSavedTab` and `EnhancedVisitedTab` directly.

### 5. Trip Drawer Components (Potentially Unused)

These components in `/components/trip-drawers/` are defined but never imported:
- `TripAISuggestionsDrawer.tsx` (99 lines)
- `TripAddHotelDrawer.tsx` (35 lines)
- `TripAddMealDrawer.tsx` (59 lines)
- `TripAddPlaceDrawer.tsx` (37 lines)
- `TripReorderDrawer.tsx` (28 lines)

**Recommendation:** Verify if these are planned features or can be removed.

### 6. Overlapping HTML Sanitization

Two different approaches exist:
- `lib/sanitize-html.ts` - Uses DOMPurify library
- `lib/stripHtmlTags.ts` - Uses regex patterns

**Recommendation:** Standardize on one approach and document when to use each.

---

## 🟡 MEDIUM - Technical Debt

### 7. Deprecated Files Still in Codebase

| File | Replacement |
|------|-------------|
| `lib/supabase.ts` | Use `lib/supabase/client.ts` |
| `lib/supabase-server.ts` | Use `lib/supabase/server.ts` |
| `components/GoogleAd.tsx` | Use `MultiplexAd` component |

### 8. Unimplemented TODO Functions

| File | Function | Status |
|------|----------|--------|
| `components/drawers/TripDayEditorDrawer.tsx` | `handleRemoveStop()` | TODO stub |
| `components/drawers/TripDayEditorDrawer.tsx` | `handleClearMeal()` | TODO stub |
| `components/drawers/TripDayEditorDrawer.tsx` | `handleDuplicateDay()` | TODO stub |
| `components/drawers/TripDayEditorDrawer.tsx` | `handleDeleteDay()` | TODO stub |
| `components/drawers/AISuggestionsDrawer.tsx` | `handleApplySuggestion()` | TODO stub |
| `lib/agents/tools/index.ts` | Route optimization | TODO stub |
| `lib/agents/itinerary-builder-agent.ts` | Route optimization | TODO stub |

---

## 🟡 MEDIUM - Style Redundancy

### 9. Repeated CSS Patterns

| Pattern | Count | Recommendation |
|---------|-------|----------------|
| `border border-gray-200 dark:border-gray-800` | 181 | Create `@apply` directive |
| `bg-white dark:bg-gray-900` | 97 | Create utility class |
| `dark:bg-[#1A1C1F]` (hardcoded) | 19 | Use CSS variable |
| `flex items-center gap-2` | 161 | Create `.flex-center-gap` |
| `flex items-center justify-between` | 83 | Create `.flex-between` |
| `px-4 py-2 text-sm font-medium` | 10+ | Use button variants |

### 10. Inconsistent Theme Colors

Hardcoded `#1A1C1F` appears 19 times instead of using theme variables defined in `app/globals.css`.

### 11. Border Radius Inconsistency

Mix of Tailwind classes and arbitrary values:
- `rounded-[16px]` - 14 instances
- `rounded-[20px]` - 2 instances
- `rounded-[6px]` - 1 instance

**Recommendation:** Standardize on Tailwind's built-in scale (`rounded-lg`, `rounded-xl`, `rounded-2xl`).

---

## Recommended Cleanup Order

### Phase 1: Quick Wins (< 1 hour)
1. Delete `app/components/chat 2/` folder
2. Delete `app/trips/[id]/page-old.tsx`
3. Delete `components/AccountDrawerV2.tsx`
4. Delete `components/drawers/DrawerMount.tsx`
5. Delete `components/drawers/AccountDrawer.tsx`

### Phase 2: Function Consolidation (2-3 hours)
1. Remove all local `capitalizeCity()` definitions
2. Remove all local `capitalizeCategory()` definitions
3. Remove duplicate `stripHtmlTags()` implementations
4. Remove duplicate `CITY_TIMEZONES` mapping

### Phase 3: Component Cleanup (2-3 hours)
1. Remove wrapper components (SavedTab, VisitedTab)
2. Review and remove unused trip-drawer components
3. Remove or document unused trend functions

### Phase 4: Style Consolidation (4+ hours)
1. Create utility CSS classes for repeated patterns
2. Replace hardcoded colors with theme variables
3. Standardize border-radius values

---

## Impact Summary

| Category | Lines Removed | Files Affected |
|----------|---------------|----------------|
| Duplicate files | ~1,600 | 6 |
| Duplicate functions | ~300 | 22 |
| Unused exports | ~500 | 3 |
| Wrapper components | ~40 | 2 |
| **Total** | **~2,400+** | **33+** |

---

## Notes

- This report was generated by analyzing the codebase structure, imports, and usage patterns
- Some items marked as "unused" may be planned features - verify with team before deletion
- Style consolidation requires careful testing to avoid visual regressions
