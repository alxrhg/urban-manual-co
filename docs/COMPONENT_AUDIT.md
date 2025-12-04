# Component Consistency Audit

**Date**: 2025-12-04
**Updated**: 2025-12-04
**Scope**: Full UI component system audit for Urban Manual

---

## Implementation Status

The following improvements have been implemented:

| Phase | Task | Status |
|-------|------|--------|
| 1 | Migrate DrawerContext to drawer-store | ✅ Completed |
| 2a | Consolidate Button components | ✅ Completed |
| 2b | Consolidate Loading states | ✅ Completed |
| 3a | Add size variants to Input/Avatar | ✅ Completed |
| 3b | Deprecate TripInput | ✅ Completed |

### Changes Made

**Drawer State Management:**
- Enhanced `lib/stores/drawer-store.ts` with history stack, goBack, and data passing
- `contexts/DrawerContext.tsx` now wraps drawer-store for backward compatibility
- Added helper functions in `lib/drawer.ts`

**Button Consolidation:**
- Added variants: `pill-primary`, `pill-active`, `danger`, `danger-outline`
- Added `pill` size variant
- `UMPillButton` now wraps Button (deprecated)
- `TripButton` marked deprecated with migration guide

**Loading States:**
- Created unified exports at `components/ui/loading/index.ts`

**Size Variants:**
- `Input`: Added `inputSize` prop (sm, default, lg)
- `Avatar`: Added `size` prop (xs, sm, default, lg, xl, 2xl)
- `TripInput` marked deprecated

---

## Executive Summary

This audit examined 120+ React components across the Urban Manual codebase to assess consistency, identify duplications, and propose standardization improvements. Overall, the codebase demonstrates **good architectural foundations** with Radix UI primitives and CVA (class-variance-authority) for variant management, but there are **opportunities for consolidation** in specific areas.

### Key Findings

| Category | Components | Issues Found | Priority |
|----------|------------|--------------|----------|
| Buttons | 6 variants | Sizing inconsistencies | Medium |
| Cards | 35+ variants | Background color variations | Low |
| Inputs | 15+ components | Generally consistent | Low |
| Modals/Drawers | 20+ implementations | Dual state management | High |
| Loading States | 30+ skeletons | Scattered definitions | Medium |
| Badges | 5 components | Good consistency | Low |

---

## 1. Button Components

### Current Inventory

| Component | Location | Variants | Sizes |
|-----------|----------|----------|-------|
| Button | `components/ui/button.tsx` | 9 (default, destructive, outline, secondary, ghost, muted, subtle, pill, link) | 7 (default, sm, lg, xs, icon, icon-sm, icon-lg) |
| TripButton | `components/trip/ui/trip-button.tsx` | 8 (primary, secondary, ghost, danger, dangerOutline, pill, pillActive, icon) | 4 (default, sm, lg, icon) |
| UMPillButton | `components/ui/UMPillButton.tsx` | 2 (default, primary) | 1 (fixed h-44px) |
| FollowButton | `components/FollowButton.tsx` | Dynamic (uses Button) | 4 |
| FollowCityButton | `components/FollowCityButton.tsx` | 2 (default, compact) | 2 |
| FilterButton | `components/navigation/FilterButton.tsx` | 1 | 1 |

### Inconsistencies Identified

1. **Height variations**:
   - Button: `h-11` (44px) and `h-12` (48px)
   - TripButton: Uses `py-*` padding instead of fixed height
   - UMPillButton: Fixed `h-[44px]`

2. **Border radius**:
   - Button: `rounded-xl`, `rounded-2xl`
   - TripButton: `rounded-full`
   - UMPillButton: `rounded-3xl`

3. **Duplicate "pill" concepts**:
   - Button has `pill` variant
   - TripButton has `pill` and `pillActive` variants
   - UMPillButton is a separate component

### Recommendations

```
[ ] CONSOLIDATE: Merge UMPillButton into Button as a "pill" size variant
[ ] STANDARDIZE: Use consistent heights (h-10, h-11, h-12 for sm, default, lg)
[ ] STANDARDIZE: Use consistent border-radius (rounded-xl for default, rounded-full for pill)
[ ] DEPRECATE: TripButton in favor of main Button component
```

---

## 2. Card Components

### Current Inventory

| Category | Components | Location |
|----------|------------|----------|
| Base | Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter | `components/ui/card.tsx` |
| Style Tokens | CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META | `components/CardStyles.ts` |
| Destination | DestinationCard, LovablyDestinationCard, HorizontalDestinationCard | `components/*.tsx` |
| Trip | PlaceCard, FlightStatusCard, LodgingCard, TripItemCard, ActivityCard, EventCard, MealCard, TransportCard | `components/trips/*.tsx` |
| Trip V2 | MinimalActivityCard, CustomCard, TimeBlockCard | `components/trip/cards/*.tsx` |
| Planner | TimeBlockCard | `components/planner/TimeBlockCard.tsx` |
| Admin | MetricCard | `components/admin/analytics/MetricCard.tsx` |
| Utility | SharingCard, ContextCards | `components/*.tsx` |

### Consistent Patterns (Good)

- **Border radius**: `rounded-2xl` used consistently across 90% of cards
- **Border colors**: `border-gray-200 dark:border-gray-800` standard
- **Hover states**: `hover:scale-[1.01]` with `active:scale-[0.98]`
- **Transitions**: `duration-300` with `ease-out`

### Inconsistencies Identified

1. **Background colors**:
   - Main cards: `bg-white dark:bg-gray-900`
   - Trip cards: `bg-stone-100 dark:bg-gray-800/50`
   - Activity cards: Type-specific colors (indigo, cyan, pink, etc.)

2. **Padding**:
   - Base card: `px-6`
   - Trip cards: `p-4`
   - Compact cards: `p-3`

3. **Duplicate TimeBlockCard**:
   - `components/planner/TimeBlockCard.tsx` (older)
   - `components/trip/TimeBlockCard.tsx` (newer, more features)

### Recommendations

```
[ ] DOCUMENT: Add CardStyles.ts tokens for trip cards (TRIP_CARD_BG, etc.)
[ ] CONSOLIDATE: Merge TimeBlockCard implementations
[ ] CREATE: Card size variants (compact, default, large) in base card
```

---

## 3. Input Components

### Current Inventory

| Component | Location | Purpose |
|-----------|----------|---------|
| Input | `components/ui/input.tsx` | Base text input |
| Textarea | `components/ui/textarea.tsx` | Multi-line input |
| Select | `components/ui/select.tsx` | Dropdown select (Radix) |
| Checkbox | `components/ui/checkbox.tsx` | Boolean toggle |
| RadioGroup | `components/ui/radio-group.tsx` | Single-select options |
| Switch | `components/ui/switch.tsx` | On/off toggle |
| Label | `components/ui/label.tsx` | Form labels |
| FormField | `components/ui/form-field.tsx` | Input with validation |
| TripInput | `components/trip/ui/trip-input.tsx` | Trip-specific input |
| SearchInput | `components/navigation/SearchInput.tsx` | Search with clear button |
| GooglePlacesAutocomplete | `components/GooglePlacesAutocomplete.tsx` | Places API input |
| HotelAutocompleteInput | `components/HotelAutocompleteInput.tsx` | Hotel search |
| ArchitectTagInput | `components/ArchitectTagInput.tsx` | Tag/multi-select |

### Consistent Patterns (Good)

- **Focus states**: `focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white`
- **Border**: `border-gray-200 dark:border-gray-800`
- **Disabled**: `disabled:cursor-not-allowed disabled:opacity-50`
- **Border radius**: `rounded-2xl` consistent

### Inconsistencies Identified

1. **TripInput duplicates Input**:
   - Same styling, different component
   - Has `search` variant that overlaps with SearchInput

2. **Validation patterns**:
   - FormField has built-in validation with 10 validators
   - Some forms use inline validation (DestinationForm)
   - No centralized form validation hook

3. **Size variants missing**:
   - SearchInput has 3 sizes (sm, md, lg)
   - Input has no size variants

### Recommendations

```
[ ] DEPRECATE: TripInput in favor of Input with variant prop
[ ] ADD: Size variants to base Input component
[ ] STANDARDIZE: Use FormField validators consistently across forms
[ ] CREATE: useFormValidation hook for complex forms
```

---

## 4. Modal/Drawer Components

### Current Inventory

| Component | Location | Type |
|-----------|----------|------|
| Drawer | `components/ui/Drawer.tsx` | Side/bottom sheet |
| Dialog | `components/ui/dialog.tsx` | Centered modal |
| AlertDialog | `components/ui/alert-dialog.tsx` | Confirmation dialog |
| ConfirmationDialog | `components/ui/confirmation-dialog.tsx` | Custom confirmation |
| DrawerHeader | `components/ui/DrawerHeader.tsx` | Drawer header |
| DrawerSection | `components/ui/DrawerSection.tsx` | Content section |
| DrawerActionBar | `components/ui/DrawerActionBar.tsx` | Footer actions |
| DrawerMount | `components/DrawerMount.tsx` | Global drawer renderer |
| PanelMount | `components/PanelMount.tsx` | Inline panel renderer |

### Drawer Implementations (20+)

Located in `components/drawers/`:
- TripOverviewDrawer, AddHotelDrawer, PlaceSelectorDrawer, AISuggestionsDrawer, AddFlightDrawer, TripListDrawer, TripSettingsDrawer, POIEditorDrawer, EventDetailDrawer, AccountDrawer

Legacy (using DrawerContext):
- AccountDrawer (old), SavedPlacesDrawer, TripsDrawer, ChatDrawer, LoginDrawer

### Critical Issue: Dual State Management

**Problem**: Two parallel systems for drawer state:

1. **DrawerContext** (legacy): `contexts/DrawerContext.tsx`
   - `openDrawer()`, `closeDrawer()`, `isDrawerOpen()`
   - Used by: LoginDrawer, ChatDrawer, SavedPlacesDrawer

2. **drawer-store** (new): `lib/stores/drawer-store.ts`
   - Zustand store with `openDrawer()`, `openInline()`, `closeDrawer()`
   - Used by: DrawerMount, newer drawer implementations

**Impact**: Confusion, potential race conditions, harder maintenance

### Animation Patterns

| Type | Duration | Easing |
|------|----------|--------|
| Drawer (bottom sheet) | 500ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Drawer (side) | 500ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Dialog | 200ms | Default ease |
| Backdrop | 500ms | Same as drawer |

### Recommendations

```
[!] MIGRATE: All DrawerContext usages to drawer-store (HIGH PRIORITY)
[ ] DEPRECATE: DrawerContext after migration
[ ] STANDARDIZE: Animation duration (500ms for all drawers)
[ ] CREATE: useDrawer hook wrapping drawer-store for ergonomics
```

---

## 5. Loading States

### Current Inventory

| File | Components | Purpose |
|------|------------|---------|
| `components/ui/spinner.tsx` | Spinner | Simple loading spinner |
| `components/ui/skeleton.tsx` | Skeleton | Basic skeleton |
| `components/ui/loading-states.tsx` | 10+ | Advanced loading states |
| `components/LoadingStates.tsx` | 20+ | Domain-specific skeletons |

### Domain Skeletons in LoadingStates.tsx

- DestinationCardSkeleton, DestinationGridSkeleton
- HorizontalCardSkeleton, ListItemSkeleton, ListSkeleton
- ProfileHeaderSkeleton, UserCardSkeleton
- CollectionCardSkeleton, CollectionGridSkeleton
- TripCardSkeleton, TripListSkeleton
- DetailDrawerSkeleton, StatsCardSkeleton
- SearchSuggestionSkeleton, ActivityFeedSkeleton
- PageLoader, SectionLoader, ChatSkeleton, TableSkeleton

### Issues

1. **Scattered definitions**: Two files with overlapping skeleton components
2. **No standardized skeleton factory**: Each skeleton is manually crafted
3. **Inconsistent animation**: Some use `animate-pulse`, others use custom shimmer

### Recommendations

```
[ ] CONSOLIDATE: Merge loading-states.tsx into LoadingStates.tsx
[ ] CREATE: SkeletonFactory component for common patterns
[ ] STANDARDIZE: Use animate-pulse consistently
[ ] DOCUMENT: When to use each skeleton type
```

---

## 6. Other UI Components

### Badges - Good Consistency

| Component | Variants |
|-----------|----------|
| Badge | default, secondary, destructive, outline, success, warning |
| UMTagPill | 1 |
| MichelinBadge | Rating-based |
| GoogleRatingBadge | 1 |

**Status**: Well-organized, no action needed.

### Tabs/Accordion/Tooltip - Good Consistency

All use Radix UI primitives with consistent styling. **Status**: Good.

### Dropdown Menu - Good Consistency

Comprehensive Radix-based implementation. **Status**: Good.

### Avatar - Missing Sizes

Current: Fixed `h-10 w-10`

**Recommendation**:
```
[ ] ADD: Size variants (xs: h-6, sm: h-8, md: h-10, lg: h-12, xl: h-16)
```

---

## 7. Proposed Component Hierarchy

```
components/
├── ui/                          # Base primitives (keep as-is)
│   ├── button.tsx              # + merge UMPillButton
│   ├── input.tsx               # + add size variants
│   ├── card.tsx                # + add size variants
│   ├── avatar.tsx              # + add size variants
│   ├── drawer/                 # NEW: Organize drawer components
│   │   ├── Drawer.tsx
│   │   ├── DrawerHeader.tsx
│   │   ├── DrawerSection.tsx
│   │   ├── DrawerActionBar.tsx
│   │   └── index.ts
│   └── loading/                # NEW: Consolidate loading
│       ├── Spinner.tsx
│       ├── Skeleton.tsx
│       ├── skeletons/
│       │   ├── CardSkeleton.tsx
│       │   ├── ListSkeleton.tsx
│       │   └── ...
│       └── index.ts
├── cards/                       # NEW: Organize card components
│   ├── DestinationCard.tsx
│   ├── HorizontalDestinationCard.tsx
│   └── trip/                    # Trip-specific cards
│       ├── PlaceCard.tsx
│       ├── FlightCard.tsx
│       └── ...
├── drawers/                     # Feature drawers (keep)
└── trip/                        # Trip features
    └── ui/                      # DEPRECATE: trip-button.tsx, trip-input.tsx
```

---

## 8. Action Plan

### Phase 1: High Priority (Immediate)

1. **Migrate DrawerContext to drawer-store**
   - Audit all usages of DrawerContext
   - Create adapter layer if needed
   - Update components one by one
   - Remove DrawerContext when done

### Phase 2: Medium Priority (Next Sprint)

2. **Consolidate Button Components**
   - Merge UMPillButton into Button
   - Deprecate TripButton
   - Update all usages

3. **Consolidate Loading States**
   - Merge loading-states.tsx and LoadingStates.tsx
   - Organize into `ui/loading/` directory

### Phase 3: Low Priority (Future)

4. **Add Size Variants**
   - Input: sm, default, lg
   - Avatar: xs, sm, md, lg, xl
   - Card: compact, default, large

5. **Organize Card Components**
   - Move to `components/cards/`
   - Group trip cards together

6. **Document & Enforce**
   - Add component examples to DESIGN_SYSTEM.md
   - Create ESLint rules for deprecated components

---

## 9. Component Inventory Summary

| Category | Count | Status |
|----------|-------|--------|
| Base UI (components/ui/) | 48 files | Good foundation |
| Buttons | 6 components | Needs consolidation |
| Cards | 35+ variants | Document patterns |
| Inputs | 15 components | Minor improvements |
| Modals/Drawers | 25+ components | Migrate state management |
| Loading States | 30+ skeletons | Consolidate files |
| Badges | 5 components | Good |
| Tabs/Accordion | 2 components | Good |
| Dropdown | 1 component | Good |
| Avatar | 1 component | Add sizes |
| Tooltips | 1 component | Good |
| Alerts | 4 components | Good |

**Total Components Audited**: 170+

---

## 10. Metrics for Success

After implementing recommendations:

- [ ] Single source of drawer state management
- [ ] Button variants reduced from 3 components to 1
- [ ] Loading states consolidated into single directory
- [ ] All components follow DESIGN_SYSTEM.md patterns
- [ ] No deprecated component usages remain

---

*This audit should be reviewed quarterly to maintain component consistency.*
