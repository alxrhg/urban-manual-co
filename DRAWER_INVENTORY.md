# Drawer Inventory

Complete list of all drawers in the codebase with their configurations.

## Base Drawer Component
- **Location:** `components/ui/Drawer.tsx`
- **Purpose:** Universal drawer component used by all other drawers

---

## 1. AccountDrawer
- **Location:** `components/drawers/AccountDrawer.tsx`
- **Type:** `account`
- **Configuration:**
  - Rendered via `DrawerMount` using the global drawer store
  - `desktopWidth`: `"420px"`
  - `position`: `"right"`
  - `style`: `"glassy"`
  - `keepStateOnClose`: `true`
  - Custom header/action bar built inside component
- **Special Features:**
  - Fetches Supabase profile + next trip preview when opened
  - Provides quick links to Saved Places, Trips, Lists, Achievements
  - Uses legacy drawers (Saved/Visited) for deep links via `DrawerContext`

---

## 2. DestinationDrawer
- **Location:** `src/features/detail/DestinationDrawer.tsx` (main) and `components/DestinationDrawer.tsx` (legacy)
- **Type:** `destination`
- **Configuration:**
  - `mobileVariant`: `"side"`
  - `desktopWidth`: `"420px"`
  - `desktopSpacing`: `"right-4 top-4 bottom-4"`
  - `position`: `"right"`
  - `style`: `"glassy"`
  - `backdropOpacity`: `"18"`
  - `keepStateOnClose`: `true`
  - `headerContent`: Custom header with "Details" title
  - `footerContent`: Separate mobile and desktop footers
- **Special Features:**
  - Mobile and desktop content are now identical (recently unified)
  - Has separate mobile/desktop footer content

---

## 3. LoginDrawer
- **Location:** `components/LoginDrawer.tsx`
- **Type:** `login`
- **Configuration:**
  - `mobileVariant`: `"bottom"`
  - `desktopWidth`: `"440px"` (slightly wider than others)
  - `desktopSpacing`: `"right-4 top-4 bottom-4"`
  - `position`: `"right"`
  - `style`: `"solid"` (different from most others)
  - `title`: Dynamic (`"Create Account"` or `"Sign In"`)
- **Special Features:**
  - Uses `style="solid"` instead of `"glassy"`
  - Slightly wider desktop width (440px vs 420px)

---

## 4. ChatDrawer
- **Location:** `components/ChatDrawer.tsx`
- **Type:** `chat`
- **Configuration:**
  - `desktopWidth`: `"600px"` (wider than others)
  - `title`: `"Travel Chat"`
  - `headerContent`: Custom header with status indicator
- **Special Features:**
  - Much wider desktop width (600px)
  - Custom header with green status dot

---

## 5. TripViewDrawer
- **Location:** `components/TripViewDrawer.tsx`
- **Type:** `trip-view`
- **Configuration:**
  - `desktopWidth`: `"600px"` (wider)
  - `headerContent`: Custom header
- **Special Features:**
  - Wider desktop width (600px)
  - Used for viewing trip details

---

## 6. POIDrawer
- **Location:** `components/POIDrawer.tsx`
- **Type:** `poi`
- **Configuration:**
  - `desktopWidth`: `"600px"` (wider)
  - `title`: Dynamic (`"Edit Destination"` or `"Add New POI"`)
- **Special Features:**
  - Wider desktop width (600px)
  - Used for adding/editing POIs

---

## 7. TripsDrawer
- **Location:** `components/TripsDrawer.tsx`
- **Type:** `trips`
- **Configuration:**
  - `desktopWidth`: `"420px"`
  - `position`: `"right"`
  - `style`: `"solid"` (different from most)
  - `backdropOpacity`: `"15"`
  - `keepStateOnClose`: `true`
  - `title`: `"Your Trips"`
  - `headerContent`: Custom header with create button
- **Special Features:**
  - Uses `style="solid"` instead of `"glassy"`

---

## 8. SavedPlacesDrawer
- **Location:** `components/SavedPlacesDrawer.tsx`
- **Type:** `saved-places`
- **Configuration:**
  - `title`: `"Saved Places"`
  - Uses default Drawer props (no custom configuration specified)
- **Special Features:**
  - Minimal configuration, uses defaults

---

## 9. VisitedPlacesDrawer
- **Location:** `components/VisitedPlacesDrawer.tsx`
- **Type:** `visited-places`
- **Configuration:**
  - `title`: `"Visited Places"`
  - Uses default Drawer props (no custom configuration specified)
- **Special Features:**
  - Minimal configuration, uses defaults

---

## 10. SettingsDrawer
- **Location:** `components/SettingsDrawer.tsx`
- **Type:** `settings`
- **Configuration:**
  - `title`: `"Settings"`
  - Uses default Drawer props (no custom configuration specified)
- **Special Features:**
  - Minimal configuration, uses defaults

---

## 11. MapDrawer
- **Location:** `components/MapDrawer.tsx`
- **Type:** `map`
- **Configuration:**
  - Unknown (needs investigation)
- **Special Features:**
  - Used for map-related content

---

## Summary of Differences

### AccountDrawer is Different Because:
1. **Tier System:** Has tier1 (main) and tier2 (subpages) with different z-index values
2. **Custom z-index:** Uses `getZIndex()` function for dynamic z-index calculation
3. **Custom styling:** Uses `customBackground` and `customBorder` props
4. **No title/header:** Sets `title={undefined}` and `headerContent={undefined}`
5. **Complex state management:** Manages multiple subpages internally
6. **Nested drawers:** Contains TripViewDrawer as a nested drawer

### Style Variations:
- **Glassy style:** AccountDrawer, DestinationDrawer
- **Solid style:** LoginDrawer, TripsDrawer
- **Default style:** SavedPlacesDrawer, VisitedPlacesDrawer, SettingsDrawer

### Width Variations:
- **420px:** AccountDrawer, DestinationDrawer, TripsDrawer
- **440px:** LoginDrawer
- **600px:** ChatDrawer, TripViewDrawer, POIDrawer

### Mobile Variant:
- **Bottom:** AccountDrawer, LoginDrawer
- **Side:** DestinationDrawer
- **Default (bottom):** Others

