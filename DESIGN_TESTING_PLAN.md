# Design Testing Plan for Urban Manual

## Overview

This document outlines a comprehensive design and visual QA testing plan for Claude Chrome to evaluate the Urban Manual website's design quality, consistency, and responsiveness.

**Target URL**: https://www.urbanmanual.co

---

## Test Objectives

1. Verify visual consistency across all pages
2. Check responsive behavior at all breakpoints
3. Identify layout issues, broken elements, or visual bugs
4. Evaluate typography, spacing, and color consistency
5. Test animations and micro-interactions

---

## Phase 1: Homepage Design Audit

### Prompt for Claude Chrome:

> "Go to urbanmanual.co and conduct a thorough design audit of the homepage:
>
> **Layout & Structure:**
> - Is there a clear visual hierarchy?
> - Are sections properly spaced and aligned?
> - Is the grid consistent?
> - Any content overflow or clipping issues?
>
> **Images:**
> - Do all images load correctly?
> - Are aspect ratios consistent across cards?
> - Any pixelated or stretched images?
> - Do images have proper alt text (check in DevTools)?
>
> **Typography:**
> - Are heading sizes consistent (H1, H2, H3)?
> - Is body text readable (size, line-height, contrast)?
> - Any text truncation issues?
> - Is font loading smooth (no FOUT/FOIT)?
>
> **Colors:**
> - Is the color palette consistent?
> - Sufficient contrast for readability?
> - Do hover states have appropriate color changes?
>
> **Interactive Elements:**
> - Do buttons have visible hover/focus states?
> - Are clickable areas obvious?
> - Do cards have proper hover effects?
>
> Report all visual issues found."

### Checklist:

**Layout**
- [ ] Hero section properly sized and centered
- [ ] Navigation bar aligned and spaced correctly
- [ ] Destination cards in consistent grid
- [ ] Footer properly structured
- [ ] No horizontal scrollbar on page

**Typography**
- [ ] H1 is largest, H2 smaller, etc.
- [ ] Body text 16px+ for readability
- [ ] Line height ~1.5 for body text
- [ ] No orphaned words in headings
- [ ] Consistent font family throughout

**Images**
- [ ] All images load (no broken icons)
- [ ] Consistent aspect ratios on cards
- [ ] Proper object-fit on images
- [ ] Lazy loading working (check network tab)

**Colors & Contrast**
- [ ] Text passes WCAG AA contrast (4.5:1)
- [ ] Links distinguishable from body text
- [ ] Consistent brand colors used
- [ ] No jarring color combinations

---

## Phase 2: Destination Page Design

### Prompt for Claude Chrome:

> "Navigate to /destination/chiltern-firehouse and audit the design:
>
> **Hero/Header Section:**
> - Does the main image display correctly?
> - Is the title properly positioned?
> - Rating/stars visible and aligned?
>
> **Content Sections:**
> - Description text readable?
> - Proper spacing between sections?
> - Icons aligned with text?
>
> **Map Component:**
> - Does the map render at proper size?
> - Is it responsive?
> - Pin/marker visible?
>
> **Related Destinations:**
> - Cards consistent with homepage cards?
> - Grid aligned properly?
> - Hover states working?
>
> **Action Buttons:**
> - Save/heart button visible?
> - Share button styled correctly?
> - Booking links properly styled?
>
> **Image Gallery (if present):**
> - Thumbnails properly sized?
> - Lightbox working smoothly?
> - Navigation arrows visible?
>
> Report all design inconsistencies."

### Checklist:

- [ ] Hero image full-width or properly contained
- [ ] Title readable over image (if overlaid)
- [ ] Meta info (category, location) properly styled
- [ ] Description has good readability
- [ ] Map sized appropriately
- [ ] Related cards match homepage design
- [ ] CTAs (buttons) are prominent
- [ ] Breadcrumbs styled consistently (if present)

---

## Phase 3: Responsive Design Testing

### Prompt for Claude Chrome:

> "Open Chrome DevTools (F12) and test responsive design:
>
> **Mobile (375px - iPhone SE):**
> 1. Set viewport to 375px width
> 2. Navigate to homepage
> - Does mobile nav hamburger appear?
> - Does hamburger menu open/close smoothly?
> - Are cards stacked vertically?
> - Is text still readable?
> - No horizontal scroll?
> - Touch targets at least 44px?
>
> **Mobile Navigation:**
> - Click hamburger menu
> - Does overlay appear?
> - Are all links accessible?
> - Close button visible?
> - Smooth animation?
>
> **Tablet (768px - iPad):**
> 1. Set viewport to 768px
> - Does layout adapt (2-column grid)?
> - Navigation still usable?
> - Images properly sized?
>
> **Desktop (1440px):**
> 1. Set viewport to 1440px
> - Full navigation visible?
> - Content not stretched too wide?
> - Proper max-width on content?
>
> **Large Desktop (1920px+):**
> - Content centered properly?
> - No awkward empty space?
>
> Report breakpoint issues at each size."

### Breakpoint Checklist:

**Mobile (< 640px)**
- [ ] Single column layout
- [ ] Hamburger menu appears
- [ ] Touch-friendly button sizes (44px+)
- [ ] No horizontal overflow
- [ ] Readable font sizes (min 14px)
- [ ] Images scale properly
- [ ] Forms are usable

**Tablet (640px - 1024px)**
- [ ] 2-column grid where appropriate
- [ ] Navigation adapts or stays hamburger
- [ ] Cards resize gracefully
- [ ] Modals/drawers fit screen

**Desktop (1024px+)**
- [ ] Full navigation visible
- [ ] Multi-column layouts
- [ ] Hover states work
- [ ] Content has max-width
- [ ] Sidebars visible (if applicable)

---

## Phase 4: Component Design Consistency

### Prompt for Claude Chrome:

> "Navigate through multiple pages and check component consistency:
>
> **Buttons:**
> - Visit homepage, /cities, /destination/[any], /account
> - Are all primary buttons the same style?
> - Secondary buttons consistent?
> - Disabled states styled?
>
> **Cards:**
> - Compare destination cards on homepage vs /cities vs /search
> - Same border radius?
> - Same shadow?
> - Same hover effect?
>
> **Forms (check /auth/login, /account if accessible):**
> - Input fields consistent style?
> - Labels positioned same way?
> - Error states styled?
> - Focus rings visible?
>
> **Navigation:**
> - Header same across all pages?
> - Active state shown on current page?
> - Footer consistent?
>
> **Modals/Drawers:**
> - Trigger any modal (save, share, etc.)
> - Overlay dimming consistent?
> - Close button positioned same?
> - Animation smooth?
>
> Report any inconsistencies between pages."

### Component Checklist:

**Buttons**
- [ ] Primary: same color, padding, border-radius
- [ ] Secondary: consistent outline/ghost style
- [ ] Hover: all buttons have hover state
- [ ] Focus: visible focus ring for accessibility
- [ ] Loading: spinner or disabled state

**Cards**
- [ ] Same border-radius across site
- [ ] Consistent shadow depth
- [ ] Same padding/spacing
- [ ] Image treatment identical
- [ ] Hover effect matches

**Form Elements**
- [ ] Inputs same height and padding
- [ ] Consistent border color
- [ ] Focus state visible
- [ ] Error state (red border/text)
- [ ] Labels positioned consistently

**Navigation**
- [ ] Logo same size/position
- [ ] Links same typography
- [ ] Active state visible
- [ ] Mobile menu consistent

---

## Phase 5: Animation & Micro-interactions

### Prompt for Claude Chrome:

> "Test animations and transitions on urbanmanual.co:
>
> **Page Transitions:**
> - Navigate between pages - any jarring jumps?
> - Loading states smooth?
>
> **Hover Animations:**
> - Hover over cards - smooth scale/shadow?
> - Button hover transitions?
> - Link underline animations?
>
> **Scroll Animations:**
> - Any elements animate on scroll?
> - Are they smooth or janky?
> - Do they respect reduced-motion preference?
>
> **Modal/Drawer Animations:**
> - Open a modal - fade/slide in smooth?
> - Close animation matches open?
>
> **Loading States:**
> - Are there skeleton loaders?
> - Spinners for async actions?
> - Progress indicators?
>
> **Form Interactions:**
> - Input focus animation?
> - Validation feedback animated?
> - Submit button loading state?
>
> Report any janky, missing, or inconsistent animations."

### Animation Checklist:

- [ ] Hover transitions ~200-300ms
- [ ] Modal fade-in smooth
- [ ] No layout shift during animations
- [ ] Scroll animations don't cause jank
- [ ] Loading skeletons present
- [ ] Consistent easing (ease-out for enters)

---

## Phase 6: Dark Mode (if applicable)

### Prompt for Claude Chrome:

> "Check if urbanmanual.co has dark mode:
>
> 1. Look for a theme toggle in nav/settings
> 2. If found, switch to dark mode and check:
>    - All text readable on dark backgrounds?
>    - Images still look good?
>    - No pure white (#fff) elements jarring?
>    - Form inputs properly styled?
>    - Shadows adjusted for dark mode?
>    - Charts/graphs visible?
>
> 3. If no toggle, check system preference:
>    - In DevTools, toggle prefers-color-scheme to dark
>    - Does site respond?
>
> Report dark mode issues or confirm it's not implemented."

---

## Phase 7: Accessibility Visual Checks

### Prompt for Claude Chrome:

> "Conduct visual accessibility checks:
>
> **Color Contrast:**
> - Use DevTools Accessibility panel
> - Check contrast ratios on text
> - Verify links are distinguishable
>
> **Focus Indicators:**
> - Tab through the page with keyboard
> - Is focus ring visible on all elements?
> - Can you tell where you are?
>
> **Text Sizing:**
> - Zoom browser to 200%
> - Does layout still work?
> - Is text readable?
>
> **Motion:**
> - Enable 'Reduce Motion' in OS settings
> - Do animations respect this preference?
>
> **Touch Targets:**
> - Are buttons/links at least 44x44px?
> - Enough spacing between clickable elements?
>
> Report accessibility visual issues."

---

## Issue Reporting Format

When reporting design issues, use this format:

```
## Design Issue: [Brief Description]

**Page**: /path/to/page
**Severity**: Critical / High / Medium / Low
**Category**: Layout / Typography / Color / Responsive / Animation / Accessibility

**Current Behavior**:
[Describe what you see]

**Expected Behavior**:
[Describe what it should look like]

**Breakpoint** (if responsive issue):
[e.g., 375px mobile]

**Screenshot Description**:
[Describe the visual issue in detail]
```

---

## Success Criteria

| Criteria | Target |
|----------|--------|
| No broken images | 0 |
| Consistent typography | 100% |
| Responsive at all breakpoints | Yes |
| Hover states on interactive elements | 100% |
| No horizontal scroll on mobile | Yes |
| Focus states visible | 100% |
| Color contrast WCAG AA | Pass |
| Animations smooth (60fps) | Yes |

---

## Quick Reference Prompts

### Full Design Audit
> "Audit urbanmanual.co homepage design: check layout, typography, colors, images, hover states, and spacing. Report all visual issues."

### Responsive Quick Check
> "Test urbanmanual.co at 375px, 768px, and 1440px. Check for layout breaks, text overflow, and touch target sizes."

### Component Consistency
> "Compare buttons, cards, and forms across homepage, /cities, and /destination/chiltern-firehouse. Report inconsistencies."

---

*Plan created: December 2024*
*For: Claude Chrome Extension design testing*
