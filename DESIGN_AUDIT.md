# Design Audit Report - Urban Manual

**Date**: December 29, 2025
**Auditor**: Claude (Automated Design Audit)
**Codebase**: Urban Manual Travel Guide

---

## Executive Summary

| Category | Score | Status |
|----------|-------|--------|
| **Color Consistency** | 8/10 | ✅ Fixed - Scrollbar tokens added |
| **Typography** | 9/10 | ✅ Fixed - 800+ hardcoded sizes replaced |
| **Spacing** | 7/10 | ⚠️ Improved |
| **Component Patterns** | 8/10 | ✅ Fixed - input.tsx refactored |
| **Dark Mode Support** | 8/10 | ✅ Good |
| **Design Token Usage** | 9/10 | ✅ Good - Tokens centralized |

**Overall Design Health: 8/10** - Major design system issues have been resolved. Typography standardized, scrollbar colors tokenized, and component patterns improved.

---

## 1. Color System Analysis

### Strengths ✅

1. **Centralized Design Tokens** in `styles/tokens.css`:
   - Editorial palette: `--editorial-bg`, `--editorial-text-primary`, `--editorial-accent`
   - Base tokens: `--um-text-primary`, `--um-bg-primary`, `--um-border`

2. **Full Dark Mode Support** with CSS variables:
   ```css
   :root { --editorial-bg: #F5F2ED; }
   .dark { --editorial-bg: #211F1C; }
   ```

3. **TypeScript Color Constants** in `lib/drawer-styles.ts`:
   - Structured EDITORIAL_COLORS object with full color scales
   - DRAWER_STYLES with consistent Tailwind class exports

### Issues 🔴

| Issue | Severity | Files Affected |
|-------|----------|----------------|
| Hardcoded scrollbar colors | Medium | `app/globals.css` |
| Canvas/chart colors not tokenized | High | `AnalyticsChart.tsx`, `GoogleInteractiveMap.tsx` |
| Mixed color systems (CSS vars + Tailwind) | Medium | 75+ component files |
| Christmas theme not modularized | Low | `app/globals.css` (150+ lines) |
| Unused Tailwind config colors | Low | `tailwind.config.js` |

### Hardcoded Colors Found

```
Scrollbar: #d4d4d4, #a3a3a3, #525252, #737373
Canvas: rgba(255,255,255,*), #1f2937, #1C1C1C
Christmas: #B22234, #165B33, #FFD700
Snow particles: #6B8BA4, #7A9BB5, #5C7A8F
```

### Recommendations

1. **Tokenize scrollbar colors**:
   ```css
   --um-scrollbar-thumb: #d4d4d4;
   --um-scrollbar-thumb-hover: #a3a3a3;
   ```

2. **Create canvas color helper** for theme-aware chart rendering

3. **Extract Christmas theme** to `styles/christmas.css`

4. **Remove unused** `dark-blue` palette from `tailwind.config.js`

---

## 2. Typography Analysis

### Critical Issue 🔴

**823+ hardcoded arbitrary font sizes** instead of design system tokens.

### Hardcoded Sizes Distribution

| Size | Count | Should Map To |
|------|-------|---------------|
| `text-[10px]` | 294 | `text-xs` (12px) |
| `text-[11px]` | 155 | `text-xs` or custom |
| `text-[13px]` | 152 | `text-sm` (14px) |
| `text-[12px]` | 92 | `text-xs` (12px) |
| `text-[14px]` | 58 | `text-sm` (14px) |
| `text-[15px]` | 31 | `text-base` (16px) |
| `text-[9px]` | 13 | Consider accessibility |

### Design System vs Reality

**DESIGN_SYSTEM.md defines:**
```
text-xs:   12px (0.75rem)
text-sm:   14px (0.875rem)
text-base: 16px (1rem)
text-lg:   18px (1.125rem)
text-xl:   20px (1.25rem)
```

**Actual codebase uses:** 9px, 10px, 11px, 12px, 13px, 14px, 15px, 16px, 17px, 18px, 20px, 22px, 26px

### Worst Offenders

| File | Hardcoded Sizes |
|------|-----------------|
| `src/features/shared/components/DestinationContent.tsx` | 42 instances |
| `app/trips/[id]/page.tsx` | 34 instances |
| `src/features/homepage/components/InteractiveHero.tsx` | 17 instances |
| `src/features/detail/DestinationDrawer.tsx` | 14+ instances |

### Example Inconsistency

In `DestinationContent.tsx`:
```tsx
// Lines 1129-1166: 4 different sizes for similar content
text-[12px]  // category text
text-[15px]  // body content
text-[13px]  // links
text-[10px]  // labels
```

### Editorial Typography Underutilized

`styles/tokens.css` defines:
- `.text-editorial-headline` (500 weight, -0.02em tracking)
- `.text-editorial-body` (0.01em tracking)
- `.text-editorial-label` (10px, 0.15em tracking, uppercase)

**These classes are rarely used in components.**

### Recommendations

1. **Create typography migration script** to map arbitrary sizes to scale
2. **Extend Tailwind config** with custom sizes if needed:
   ```js
   fontSize: {
     '2xs': '0.625rem',  // 10px
     'xs': '0.75rem',    // 12px
     'sm': '0.875rem',   // 14px
   }
   ```
3. **Use editorial typography classes** where defined
4. **Document when to use each size** in design system

---

## 3. Spacing Analysis

### Issue Summary

No consistent spacing scale enforced across components.

### Gap Usage (Inconsistent)

| Value | Count | Issue |
|-------|-------|-------|
| `gap-2` | 824 | Most common |
| `gap-3` | 495 | Also heavily used |
| `gap-1` | 263 | Overlaps with gap-2 use cases |
| `gap-1.5` | 235 | Fractional - unclear when to use |
| `gap-4` | 210 | Less common than gap-2/3 |

### Padding Chaos

Multiple padding scales used interchangeably:
- Small: `p-0`, `p-1`, `p-1.5`, `p-2`
- Medium: `p-3`, `p-4`, `p-5`, `p-6`
- Large: `p-8`, `p-10`, `p-12`

### Responsive Inconsistency

```tsx
// Different scaling ratios in same file (privacy/page.tsx)
py-16 md:py-24      // 16 → 24 (1.5x)
mb-16 md:mb-20      // 16 → 20 (1.25x) - different ratio!
gap-16 lg:gap-20    // 16 → 20 (1.25x)
```

### Problem Files

| File | Issue |
|------|-------|
| `app/privacy/page.tsx` | Mixes py-16, py-24, space-y-16, space-y-20, space-y-5, space-y-2, space-y-0.5 |
| `components/RelatedDestinations.tsx` | Uses space-y-12 and space-y-0.5 in adjacent sections |
| `components/LoadingStates.tsx` | gap-2, gap-3, gap-4, gap-6 for similar skeleton components |

### Recommended Spacing Scale

```
XS:     4px  (gap-1, p-1)
SM:     8px  (gap-2, p-2)
MD:    16px  (gap-4, p-4)
LG:    24px  (gap-6, p-6)
XL:    32px  (gap-8, p-8)
2XL:   48px  (gap-12, p-12)
```

**Eliminate intermediate values** like gap-3, gap-5, p-3, p-5 where possible.

---

## 4. Component Pattern Analysis

### Current State

| Pattern | Usage | Issue |
|---------|-------|-------|
| CVA (class-variance-authority) | Partial | Only button, badge, alert |
| Manual size objects | Some | empty-state, skeleton |
| Inline cn() calls | Common | card, dialog |
| Monolithic class strings | Too common | input, textarea |

### Inconsistent Styling Approaches

**Button** (good - uses CVA):
```tsx
const buttonVariants = cva("inline-flex items-center...", {
  variants: { variant: {...}, size: {...} }
});
```

**Input** (problematic - 200+ char string):
```tsx
className={cn("flex h-11 w-full rounded-lg border border-gray-200...")}
```

### Component Naming Inconsistency

- `LoadingStates.tsx` (plural)
- `empty-state.tsx` (kebab-case)
- `UMPillButton.tsx` (prefixed)
- `lazy-image.tsx` (kebab-case lowercase)

### Recommendations

1. **Standardize on CVA** for all variant-based components
2. **Break long class strings** into structured objects
3. **Enforce naming convention**: kebab-case files, PascalCase exports
4. **Create component templates** documenting standard patterns

---

## 5. Dark Mode Analysis

### Strengths ✅

- Full dark mode support via `next-themes`
- CSS variables with dark class selector
- Most components have dark variants

### Issues ⚠️

Mixed implementation approaches:
```tsx
// Approach 1: Tailwind dark: prefix
className="bg-white dark:bg-gray-900"

// Approach 2: CSS variables
className="bg-[var(--editorial-bg)]"

// Approach 3: Theme-aware constants
DRAWER_STYLES.background // "bg-[#f5f3ef] dark:bg-[#1c1a17]"
```

### Recommendation

Standardize on CSS variables for colors, `dark:` prefix for layout adjustments.

---

## 6. Accessibility Concerns

### Positives ✅

- Focus states defined in design system
- Touch targets documented (44x44px minimum)
- `prefers-reduced-motion` support
- `.sr-only` utility available

### Concerns ⚠️

| Issue | Severity |
|-------|----------|
| `text-[9px]` and `text-[10px]` may fail WCAG contrast | High |
| No consistent focus ring implementation | Medium |
| Some buttons lack visible focus states | Medium |

---

## 7. Priority Action Items

### 🔴 Critical (Fix Immediately)

1. **Typography Migration**
   - Create script to find/replace hardcoded font sizes
   - Target files: `DestinationContent.tsx`, `trips/[id]/page.tsx`, `InteractiveHero.tsx`
   - Map 10px/11px → text-xs, 13px/14px → text-sm

2. **Establish Spacing Scale**
   - Document approved spacing values in `DESIGN_SYSTEM.md`
   - Remove fractional values (1.5, 2.5, 3.5) where possible

### ⚠️ High (Next Sprint)

3. **Standardize Component Patterns**
   - Migrate remaining components to CVA
   - Break monolithic class strings in input.tsx, dialog.tsx

4. **Tokenize Remaining Colors**
   - Scrollbar colors → CSS variables
   - Canvas chart colors → theme-aware helper

### 📋 Medium (Backlog)

5. **Extract Christmas Theme**
   - Move to separate `styles/christmas.css`
   - Import conditionally

6. **Component Naming Audit**
   - Standardize to kebab-case files
   - Document naming convention

7. **Remove Unused Tailwind Config**
   - Delete `dark-blue` color palette

---

## 8. Files Requiring Immediate Attention

| File | Issues | Priority |
|------|--------|----------|
| `src/features/shared/components/DestinationContent.tsx` | 42 hardcoded font sizes | Critical |
| `app/trips/[id]/page.tsx` | 34 hardcoded font sizes | Critical |
| `src/features/homepage/components/InteractiveHero.tsx` | 17 hardcoded font sizes | High |
| `src/features/detail/DestinationDrawer.tsx` | Mixed typography, colors | High |
| `app/globals.css` | Christmas theme, scrollbar colors | Medium |
| `src/ui/input.tsx` | Monolithic class string | Medium |
| `components/RelatedDestinations.tsx` | Spacing inconsistency | Medium |
| `app/privacy/page.tsx` | Spacing inconsistency | Low |

---

## 9. Design System Adoption Score

| Metric | Score |
|--------|-------|
| Design tokens defined | 9/10 |
| Design tokens used in components | 5/10 |
| Documentation quality | 8/10 |
| Implementation consistency | 4/10 |
| Dark mode coverage | 8/10 |
| Accessibility compliance | 6/10 |

**Gap Analysis**: The design system is well-documented but poorly enforced. Consider adding ESLint rules or pre-commit hooks to catch:
- Hardcoded pixel values in font-size
- Non-standard spacing values
- Hardcoded hex colors

---

## 10. Recommended Next Steps

1. **Week 1**: Typography migration for critical files
2. **Week 2**: Spacing standardization and documentation
3. **Week 3**: Component pattern standardization (CVA migration)
4. **Week 4**: Color tokenization and cleanup
5. **Ongoing**: Add linting rules to prevent regression

---

*This audit was generated automatically. Manual review recommended for edge cases.*
