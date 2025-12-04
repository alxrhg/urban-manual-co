# Mobile Experience Audit - Urban Manual

**Date:** December 2024
**Status:** Audit Complete

---

## Executive Summary

Urban Manual has a **solid mobile foundation** with mobile-first responsive design, excellent drawer/bottom-sheet support, and good image optimization. However, there are **critical gaps** in touch target sizing, navigation patterns, and performance that need addressing.

| Area | Rating | Key Issues |
|------|--------|------------|
| Responsive Layout | ✅ Good | Mobile-first breakpoints, good grid scaling |
| Touch Targets | ⚠️ Needs Work | Several elements below 44px minimum |
| Navigation | ❌ Poor | No hamburger menu, bottom element crowding |
| Modals/Drawers | ✅ Good | Excellent swipe gestures, bottom sheets |
| Forms | ⚠️ Needs Work | Font size conflicts, missing input modes |
| Performance | ⚠️ Needs Work | Heavy libraries not code-split |

---

## 1. Responsive Behavior

### Strengths ✅
- **100% mobile-first approach** - All components use base mobile styles enhanced with breakpoint prefixes
- **Comprehensive breakpoints** - Uses 5-7 levels (sm, md, lg, xl, 2xl)
- **Safe area support** - CSS utilities for notched devices (`pb-safe`, `safe-area-top`)
- **Touch-friendly sizing** - Most primary buttons meet 44px minimum
- **Accessibility preferences** - Respects reduced motion, high contrast, forced colors

### Grid Scaling Pattern
```
Mobile: 2 cols → Tablet: 3-4 cols → Desktop: 5-7 cols
```
Used consistently in `DestinationCardList`, `TrendingSection`, `PersonalizedRecommendations`.

### Gaps ⚠️
- **Limited tablet-specific handling** - Many components jump from mobile to lg/xl
- **Tablet landscape underutilized** - 600px-800px range needs attention
- **Hardcoded breakpoint in JavaScript** - Drawer uses `768px` magic number

---

## 2. Touch Targets

### Compliant (44px+) ✅
| Component | Size |
|-----------|------|
| Primary Button | h-11 (44px) |
| Input Fields | h-11 (44px) |
| Close/Back Buttons | min-w-[44px] min-h-[44px] |
| Drawer Action Buttons | min-h-[52px] |
| LoginDrawer inputs | min-h-[56px] |

### Critical Issues ❌
| Component | Current | Required | Impact |
|-----------|---------|----------|--------|
| Checkbox | 20x20px | 44x44px | Difficult to tap |
| Radio Button | 20x20px | 44x44px | Mis-taps common |
| Dropdown Items | ~20px height | 44px | Hard to select |
| Category Chips | ~20px height | 44px | Frustrating UX |
| Quick Actions | 32-36px | 44px | Borderline |
| Switch Toggle | 32px | 44px | Below WCAG |

### Recommended Fixes

**Priority 1 - Critical:**
```tsx
// Checkbox: components/ui/checkbox.tsx
- "h-5 w-5"
+ "h-9 w-9 sm:h-5 sm:w-5"

// Dropdown items: components/ui/dropdown-menu.tsx
- "py-1.5"
+ "py-2.5 sm:py-1.5"

// Category chips
+ "min-h-[44px] sm:min-h-auto"
```

---

## 3. Mobile Navigation

### Current Pattern
- **Top bar**: Logo + CommandPalette + Account button
- **Filter row**: Search, Cities, Filters, Categories, View toggle
- **Drawers**: All secondary navigation via sliding panels
- **Floating elements**: FloatingActionBar, MobileViewToggle, ScrollToTop

### Critical Issues ❌

1. **No Hamburger Menu**
   - Mobile users may not discover all features
   - Relies entirely on drawer-based navigation

2. **Header Not Sticky**
   - Scrolls with page content
   - CommandPalette becomes inaccessible

3. **Bottom Element Crowding**
   - 4+ elements compete for bottom space (all z-50)
   - No coordination between FloatingActionBar, MobileViewToggle, NotificationPrompt, CookieConsent

4. **NavigationRow Complexity**
   - Too many interactive elements in one row on mobile
   - Search, Cities, Filters, Categories all compete for space

5. **AccountTabs Overflow**
   - 7 tabs can overflow on small screens
   - No horizontal scroll, just wrapping

### Recommended Navigation Improvements

**1. Add Sticky Header**
```tsx
// components/Header.tsx
- "relative mt-6 md:mt-8"
+ "sticky top-0 z-30 bg-background/80 backdrop-blur-md mt-6 md:mt-8"
```

**2. Add Hamburger Menu for Mobile**
```tsx
// New: MobileMenu.tsx
<button className="md:hidden p-2 min-h-[44px] min-w-[44px]">
  <Menu className="w-6 h-6" />
</button>
```

**3. Implement Bottom Navigation Bar**
```tsx
// New: BottomNav.tsx - Fixed at bottom on mobile
<nav className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t pb-safe">
  <div className="flex justify-around h-14">
    <NavItem icon={Home} label="Explore" />
    <NavItem icon={Map} label="Map" />
    <NavItem icon={Plane} label="Trips" />
    <NavItem icon={User} label="Account" />
  </div>
</nav>
```

**4. Coordinate Bottom Elements**
```tsx
// Create z-index system
z-40: BottomNav (if implemented)
z-45: FloatingActionBar, MobileViewToggle
z-50: Modals/Drawers
z-55: CookieConsent, NotificationPrompt
```

---

## 4. Modals & Drawers

### Strengths ✅
- **Excellent bottom sheet implementation** - Swipe-to-dismiss with velocity detection
- **Safe area handling** - Uses `env(safe-area-inset-bottom)`
- **Spring animations** - Natural, smooth transitions
- **Touch scroll locking** - Prevents body scroll while open
- **Responsive breakpoints** - Bottom sheet on mobile, side panel on desktop

### Gesture Implementation
```typescript
// Velocity-based dismiss (Drawer.tsx:157-232)
- Drag threshold: 150px
- Velocity threshold: 0.5
- Resistance when dragging up: 20%
```

### Missing Patterns ⚠️

1. **No horizontal back swipe** - Common iOS pattern not implemented
2. **No drawer peeking** - Can't show partial drawer
3. **No sticky headers in scrollable drawers**
4. **Radix Sheet/Dialog not optimized** - Uses centered layout, not bottom sheet

### Recommended Improvements

**1. Add Swipe-Back Gesture**
```typescript
// In Drawer.tsx - Add horizontal gesture detection
const handleTouchMove = (e: TouchEvent) => {
  const deltaX = clientX - startXRef.current;
  const deltaY = clientY - startYRef.current;

  // Prioritize horizontal swipe on side drawers
  if (Math.abs(deltaX) > Math.abs(deltaY) && drawerPosition === 'right') {
    // Handle horizontal dismiss
  }
};
```

**2. Bottom Sheet for All Modals on Mobile**
```tsx
// Replace Radix Dialog with custom Drawer for mobile
const ResponsiveDialog = ({ children, ...props }) => {
  const isMobile = useMediaQuery('(max-width: 767px)');
  return isMobile
    ? <Drawer mobileVariant="bottom">{children}</Drawer>
    : <Dialog {...props}>{children}</Dialog>;
};
```

---

## 5. Form Usability

### Current State
- **Global CSS enforces 16px font** - Prevents iOS zoom ✅
- **LoginDrawer is well-implemented** - 56px min-height, proper autocomplete ✅
- **FormField has validation states** - Error icons and messages ✅

### Critical Issues ❌

1. **Font Size Conflicts**
   - Components use `text-sm` (14px)
   - Global CSS overrides to 16px with `!important`
   - Creates inconsistent behavior

2. **Missing Input Attributes**
   - No `inputMode` for context-aware keyboards
   - Limited `autoComplete` usage
   - Missing semantic `type` attributes

3. **Select Component Too Small**
   - Default height: 40px (below 44px minimum)
   - Small variant: 36px

### Recommended Fixes

**1. Fix Font Sizes in Components**
```tsx
// components/ui/input.tsx
- "text-sm"
+ "text-base sm:text-sm"

// components/ui/select.tsx
- "text-sm"
+ "text-base sm:text-sm"

// Also update: textarea.tsx, SearchInput.tsx
```

**2. Add Input Modes**
```tsx
// Search inputs
<input inputMode="search" type="search" />

// Phone fields
<input inputMode="tel" type="tel" autoComplete="tel" />

// Email fields
<input inputMode="email" type="email" autoComplete="email" />
```

**3. Fix Select Heights**
```tsx
// components/ui/select.tsx
- "data-[size=default]:h-10"
+ "data-[size=default]:h-11"

- "data-[size=sm]:h-9"
+ "data-[size=sm]:h-11"
```

---

## 6. Performance

### Strengths ✅
- **Next.js Image optimization** - AVIF/WebP, responsive sizes, 7-day cache
- **Strategic dynamic imports** - 15+ components lazy-loaded on homepage
- **ISR + Streaming** - Fast static shell with streaming content
- **PWA caching** - Offline support for images and static assets
- **API caching** - Appropriate Cache-Control headers

### Critical Issues ❌

1. **Heavy Libraries Not Code-Split**
   - `@amcharts/amcharts5` (~450KB) loaded on account page
   - `mapbox-gl` (~400KB) always available

   **Fix:**
   ```typescript
   // components/TravelMap.tsx
   const TravelMap = dynamic(() => import('./TravelMapCore'), {
     ssr: false,
     loading: () => <Skeleton className="h-96" />
   });
   ```

2. **Large Homepage Component (~130KB)**
   - Complex filtering logic inline
   - Many useState/useEffect hooks

   **Recommendation:** Extract to custom hooks, split components

3. **Third-Party Scripts Loaded Synchronously**
   - Google AdSense/Analytics delay FCP

   **Fix:**
   ```tsx
   <Script
     src="https://pagead2.googlesyndication.com/..."
     strategy="lazyOnload"
   />
   ```

4. **No Bundle Size Monitoring**

   **Add to package.json:**
   ```json
   "scripts": {
     "analyze": "ANALYZE=true next build"
   }
   ```

### Estimated Bundle Impact
| Library | Size | Used Where | Optimization |
|---------|------|------------|--------------|
| amcharts | ~450KB | TravelMap | Dynamic import |
| mapbox-gl | ~400KB | Maps | Dynamic import |
| Radix UI | ~300KB | Everywhere | Tree-shake unused |
| framer-motion | ~40KB | Animations | Consider lazy |
| styled-components | ~30KB | Legacy | Migrate to Tailwind |

**Potential savings:** 20-30% bundle reduction

---

## Priority Action Items

### Immediate (Week 1)
1. ❌ Fix checkbox/radio button touch targets (20px → 44px)
2. ❌ Fix dropdown menu item heights
3. ⚠️ Add sticky header
4. ⚠️ Dynamic import TravelMap component

### Short-term (Week 2-3)
5. ⚠️ Fix input font size conflicts
6. ⚠️ Add inputMode attributes to forms
7. ⚠️ Fix Select component heights
8. ⚠️ Coordinate bottom element z-indexes

### Medium-term (Month 1)
9. 🔧 Implement bottom navigation bar
10. 🔧 Add hamburger menu for mobile
11. 🔧 Add swipe-back gesture to drawers
12. 🔧 Set up bundle size monitoring

### Long-term
13. 💡 Replace Radix Dialog with bottom sheets on mobile
14. 💡 Split large homepage component
15. 💡 Migrate styled-components to Tailwind
16. 💡 Implement drawer peeking

---

## Testing Recommendations

1. **Device Testing**
   - iPhone SE (320px width, small screen)
   - iPhone 14 Pro (notch, Dynamic Island)
   - Pixel 6 (Android baseline)
   - iPad (tablet breakpoints)

2. **Network Testing**
   - Throttled 4G (1.6 Mbps down)
   - Slow 3G simulation
   - Monitor TTI on homepage

3. **Accessibility Testing**
   - VoiceOver on iOS
   - TalkBack on Android
   - Keyboard navigation

---

## Files Referenced

| Area | Key Files |
|------|-----------|
| Responsive | `globals.css`, `tailwind.config.js`, `layout.tsx` |
| Navigation | `Header.tsx`, `NavigationRow.tsx`, `CommandPalette.tsx` |
| Drawers | `components/ui/Drawer.tsx`, `DrawerContext.tsx`, `DrawerMount.tsx` |
| Touch Targets | `checkbox.tsx`, `radio-group.tsx`, `dropdown-menu.tsx` |
| Forms | `input.tsx`, `select.tsx`, `form-field.tsx`, `SearchInput.tsx` |
| Performance | `next.config.ts`, `page-client.tsx`, `TravelMap.tsx` |
