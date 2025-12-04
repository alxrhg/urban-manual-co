# Urban Manual Accessibility Audit Report

**Date**: December 4, 2025
**Scope**: Full codebase accessibility audit
**Status**: Complete

---

## Executive Summary

Urban Manual has **strong accessibility foundations** with comprehensive infrastructure for screen readers, keyboard navigation, and user preferences. However, **critical gaps** exist in specific components that require immediate attention.

| Category | Status | Score |
|----------|--------|-------|
| Keyboard Navigation | Excellent | 9/10 |
| Screen Reader Support | Good | 7/10 |
| Visual Accessibility | Excellent | 9/10 |
| Form Accessibility | Mixed | 5/10 |
| Interactive Elements | Needs Work | 6/10 |

---

## Critical Issues (P0 - Fix Immediately)

### 1. Interactive Divs Without Keyboard Access

**Impact**: Users cannot interact with these elements using keyboard or screen readers.

| File | Line | Issue |
|------|------|-------|
| `components/ProfileAvatar.tsx` | 25-26 | Clickable div with no `role`, `tabindex`, or `aria-label` |
| `components/ProfileAvatar.tsx` | 49 | Overlay click handler with no accessibility attributes |
| `components/planner/TimeBlockCard.tsx` | 225 | `onClick` on div without button semantics |

**Fix**: Convert to `<button>` or add `role="button" tabIndex={0} aria-label="..."` with keyboard handlers.

```tsx
// Before (inaccessible)
<div onClick={handleClick}>...</div>

// After (accessible)
<button type="button" onClick={handleClick} aria-label="Edit item">
  ...
</button>
```

---

### 2. Form Labels Not Associated with Inputs

**Impact**: Screen reader users cannot identify form fields.

| File | Lines | Issue |
|------|-------|-------|
| `components/admin/DestinationForm.tsx` | 327-675 | All labels missing `htmlFor`; inputs missing `id` |
| `components/drawers/POIEditorDrawer.tsx` | 251-358 | Same pattern throughout |
| `components/navigation/SearchInput.tsx` | 74-90 | Search input lacks `aria-label` |

**Fix**: Add `htmlFor` to labels and matching `id` to inputs:

```tsx
// Before
<label>Name *</label>
<input type="text" required />

// After
<label htmlFor="destination-name">Name *</label>
<input id="destination-name" type="text" required aria-required="true" />
```

---

### 3. Content Images with Empty Alt Text

**Impact**: Screen reader users miss important visual information.

| File | Line | Issue |
|------|------|-------|
| `components/ProfileAvatar.tsx` | 31 | Profile image has `alt=""` |
| `components/trips/TripBucketList.tsx` | 119 | Item thumbnail has `alt=""` |

**Fix**:
```tsx
// ProfileAvatar.tsx
<Image src={avatarUrl} alt="User profile avatar" fill />

// TripBucketList.tsx
<img src={item.thumbnail} alt={item.title} />
```

---

## High Priority Issues (P1)

### 4. Modal Without Dialog Semantics

**File**: `components/ProfileAvatar.tsx` (lines 47-59)

The profile photo modal overlay lacks:
- `role="dialog"`
- `aria-modal="true"`
- Focus trap
- `aria-labelledby`

**Fix**: Wrap in proper dialog or use the existing `Dialog` component from `components/ui/dialog.tsx`.

---

### 5. Missing `aria-required` on Required Fields

**Affected Files**:
- `components/LoginDrawer.tsx`
- `components/drawers/AddFlightDrawer.tsx`
- `components/ProfileEditor.tsx`

**Fix**: Add `aria-required="true"` alongside `required` attribute:
```tsx
<input required aria-required="true" />
```

---

### 6. Error Messages Not Announced

**Affected Files**:
- `components/admin/DestinationForm.tsx`
- `components/drawers/POIEditorDrawer.tsx`

**Fix**: Add `role="alert"` and `aria-live="assertive"` to error containers:
```tsx
{error && (
  <div role="alert" aria-live="assertive">
    {error}
  </div>
)}
```

---

## Strengths (Already Implemented Well)

### Skip Navigation
- **File**: `components/SkipNavigation.tsx`
- Skip link properly targets `#main-content`
- Uses `sr-only focus:not-sr-only` for visibility on focus
- Main content wrapper with `tabIndex={-1}` for focus restoration

### Focus Management
- **File**: `lib/accessibility/index.ts`
- `focusFirstElement()`, `getFocusableElements()`, `trapFocus()` utilities
- **File**: `hooks/useAccessibility.ts`
- `useFocusTrap()`, `useFocusOnMount()`, `useFocusRestore()` hooks
- **File**: `components/ui/Drawer.tsx`
- Proper focus save/restore on open/close

### Keyboard Navigation
- Escape key handling in modals/drawers
- Arrow key navigation (`useArrowNavigation` hook)
- Enter/Space handlers on trip cards
- All 8 trip card types have `tabIndex={0}` and `role="button"`

### Reduced Motion Support
- **File**: `app/globals.css` (lines 936-948)
- CSS media query disables animations
- **File**: `hooks/useAccessibility.ts`
- `useReducedMotion()` hook for JS animations

### ARIA Implementation
- 102 instances of `aria-label` across components
- 45 instances of `role` attributes
- `aria-live` regions for toasts and alerts
- `aria-expanded`, `aria-pressed`, `aria-current` for state

### Semantic HTML
- `<header role="banner">` with `<nav>`
- `<footer role="contentinfo">`
- `<main id="main-content" role="main">`
- `<section>` and `<article>` used appropriately

### Dark Mode & High Contrast
- Full `prefers-color-scheme` support
- `prefers-contrast: more` media query
- `forced-colors: active` support
- `prefers-reduced-transparency` support

### Screen Reader Announcements
- **File**: `components/ScreenReaderAnnouncements.tsx`
- `announceToScreenReader()` utility function
- `useAnnounce()` and `useLiveRegion()` hooks

### Touch Targets
- `.touch-target` utility (44x44px minimum)
- `meetsMinimumTouchTarget()` validation function

---

## Medium Priority Issues (P2)

### 7. Heading Hierarchy Audit Needed
Some pages may skip heading levels (h1 → h4). Verify each page has:
- Exactly one `<h1>`
- Sequential heading levels (h1 → h2 → h3, not h1 → h4)

### 8. Decorative Images Need `aria-hidden`
- `components/SharingCard.tsx:114` - Background image should use CSS or have `aria-hidden="true"` on container

### 9. File Input Without Label
- `components/ProfileAvatar.tsx:52` - Hidden file input lacks accessible label

---

## Recommendations

### Immediate Actions (This Sprint)

1. **Fix 3 clickable divs** in ProfileAvatar.tsx and TimeBlockCard.tsx
2. **Add labels to DestinationForm.tsx** (~15 inputs need htmlFor/id)
3. **Add labels to POIEditorDrawer.tsx** (~10 inputs need htmlFor/id)
4. **Fix 2 empty alt texts** in ProfileAvatar.tsx and TripBucketList.tsx
5. **Add aria-label to SearchInput.tsx**

### Near-Term (Next Sprint)

1. Add `aria-required="true"` to all required form fields
2. Add focus trap to ProfileAvatar modal
3. Add `role="alert"` to form error messages
4. Audit all pages for heading hierarchy

### Ongoing

1. Run Lighthouse accessibility audits on new pages
2. Add axe-core to CI/CD pipeline
3. Manual keyboard testing for new features
4. Screen reader testing (VoiceOver, NVDA) for major releases

---

## Files Requiring Changes

| Priority | File | Changes Needed |
|----------|------|----------------|
| P0 | `components/ProfileAvatar.tsx` | Add button semantics, alt text, dialog role |
| P0 | `components/admin/DestinationForm.tsx` | Add htmlFor/id to all 15+ form fields |
| P0 | `components/drawers/POIEditorDrawer.tsx` | Add htmlFor/id to all 10+ form fields |
| P0 | `components/planner/TimeBlockCard.tsx` | Add button semantics to clickable div |
| P0 | `components/trips/TripBucketList.tsx` | Add alt text to thumbnail |
| P1 | `components/navigation/SearchInput.tsx` | Add aria-label to search input |
| P1 | `components/LoginDrawer.tsx` | Add aria-required to inputs |
| P1 | `components/drawers/AddFlightDrawer.tsx` | Add aria-required to inputs |
| P2 | `components/SharingCard.tsx` | Add aria-hidden to decorative image |

---

## Reference: Good Patterns in Codebase

Use these as examples when fixing issues:

### FormField Component (Excellent)
`components/ui/form-field.tsx`
- Proper `htmlFor`/`id` association
- `aria-invalid`, `aria-describedby`
- `role="alert"` on errors

### Button Component (Excellent)
`components/ui/button.tsx`
- `focus-visible:ring-2` styling
- Proper disabled states

### Drawer Component (Excellent)
`components/ui/Drawer.tsx`
- `role="dialog"`, `aria-modal="true"`
- Focus save/restore
- Escape key handling

### Trip Cards (Good)
`components/trip/cards/*.tsx`
- `tabIndex={0}`, `role="button"`
- `onKeyDown` for Enter key

---

## Testing Checklist

### Keyboard Testing
- [ ] Can reach all interactive elements with Tab
- [ ] Can activate buttons with Enter/Space
- [ ] Can close modals with Escape
- [ ] Focus visible on all elements
- [ ] No keyboard traps

### Screen Reader Testing
- [ ] All images have meaningful alt text
- [ ] Form fields announce their labels
- [ ] Errors are announced when they appear
- [ ] Landmarks are properly identified
- [ ] Dynamic content updates are announced

### Visual Testing
- [ ] 4.5:1 contrast ratio for text
- [ ] 3:1 contrast for UI components
- [ ] Works at 200% zoom
- [ ] Animations respect reduced motion

---

*Report generated by accessibility audit on December 4, 2025*
