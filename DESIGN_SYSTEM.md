# The Urban Manual - Design System
**Maintaining visual consistency across all features**

---

## 🎨 Core Design Principles

### 1. **Minimalist & Editorial**
- Clean, uncluttered layouts
- Generous white space
- Story-led content
- Focus on beautiful imagery

### 2. **Monochromatic with Accents**
- Black & white primary palette
- Gray tones for secondary elements
- Minimal use of color (only for status, alerts)

### 3. **Typography-First**
- Clear hierarchy
- Readable font sizes
- Line clamping for overflow

### 4. **No Dashboard Cards**
- Ban floating boxes with heavy radii, shadows, or faux glass effects
- Prefer text-first tables, definition lists, or inline stats separated by simple rules
- Especially in `/admin`, never introduce AI-style analytics cards or neumorphic tiles
- If more emphasis is needed, use typography, spacing, and dividers—not containers

---

## 📐 Design Tokens

### Colors
```css
/* Light Mode */
--bg-primary: white
--bg-secondary: #f9fafb (gray-50)
--text-primary: black
--text-secondary: #4b5563 (gray-600)
--text-tertiary: #9ca3af (gray-400)
--border: #e5e7eb (gray-200)

/* Dark Mode */
--bg-primary: #0a0a0a
--bg-secondary: #1f2937 (gray-900)
--text-primary: white
--text-secondary: #9ca3af (gray-400)
--text-tertiary: #6b7280 (gray-500)
--border: #1f2937 (gray-800)

/* Accent Colors (Use Sparingly) */
--success: #10b981 (green-500)
--warning: #f59e0b (orange-500)
--error: #ef4444 (red-500)
--info: #3b82f6 (blue-500)

/* FORBIDDEN COLORS */
--purple: NEVER USE PURPLE - Use gray/neutral instead
```

### Spacing Scale (4px Base Unit)
```css
/* ALWAYS use Tailwind spacing classes, never arbitrary like p-[50px] */
/* Core spacing scale */
0.5:  2px    /* Micro spacing, borders */
1:    4px    /* Tight spacing */
1.5:  6px    /* Compact elements */
2:    8px    /* Small gaps */
3:    12px   /* Medium gaps */
4:    16px   /* Standard padding */
5:    20px   /* Comfortable padding */
6:    24px   /* Section gaps */
8:    32px   /* Large gaps */
10:   40px   /* Component separation */
12:   48px   /* Section spacing */
16:   64px   /* Page sections */
20:   80px   /* Major sections */
24:   96px   /* Hero spacing */

/* Common usage patterns */
gap-1.5     /* Icon + text */
gap-2       /* Related items */
gap-3       /* List items */
gap-4       /* Card content */
gap-6       /* Grid gutters */
p-4         /* Card padding */
p-6         /* Section padding */
py-12       /* Page section vertical */
mb-12       /* Section spacing (use instead of mb-[50px]) */
```

### Border Radius
```css
--radius-sm: 0.5rem    /* 8px - pills, tags */
--radius-md: 1rem      /* 16px - cards */
--radius-lg: 1.5rem    /* 24px - large cards */
--radius-full: 9999px  /* rounded-full - buttons */
```

### Typography Scale
```css
/* Font Sizes - ALWAYS use these, never arbitrary values like text-[10px] */
text-2xs:  0.625rem  /* 10px - badges, counters, micro labels */
text-xs:   0.75rem   /* 12px - small labels, metadata */
text-sm:   0.875rem  /* 14px - body text, buttons */
text-base: 1rem      /* 16px - primary body text */
text-lg:   1.125rem  /* 18px - subheadings */
text-xl:   1.25rem   /* 20px - section headings */
text-2xl:  1.5rem    /* 24px - page titles */
text-3xl:  1.875rem  /* 30px - hero text */
text-4xl:  2.25rem   /* 36px - display text */

/* Font Weights */
font-light:    300  /* Page headings */
font-normal:   400  /* Body text */
font-medium:   500  /* Emphasis, buttons */
font-semibold: 600  /* Strong emphasis */
font-bold:     700  /* Rare, high impact */

/* Line Heights (included in fontSize config) */
leading-tight:   1.25  /* Headings */
leading-snug:    1.375 /* Subheadings */
leading-normal:  1.5   /* Default */
leading-relaxed: 1.625 /* Body text */
```

### Typography Presets (CSS Classes)
Use these semantic classes from `styles/tokens.css`:
```css
.um-display   /* Hero text: text-4xl font-light tracking-tight */
.um-h1        /* Page title: text-2xl font-light */
.um-h2        /* Section heading: text-xl font-medium */
.um-h3        /* Subsection: text-lg font-medium */
.um-h4        /* Card title: text-sm font-medium */
.um-body      /* Body text: text-sm leading-relaxed */
.um-body-lg   /* Large body: text-base leading-relaxed */
.um-caption   /* Metadata: text-xs text-gray-500 */
.um-label     /* Overline: text-2xs uppercase tracking-widest */
.um-micro     /* Badges: text-2xs font-medium */
.um-muted     /* Secondary: text-sm text-gray-500 */
.um-link      /* Links: text-sm font-medium hover:underline */
```

---

## 🧩 Component Patterns

### Standard Card (Used Everywhere)
```typescript
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';

// Usage:
<div className={CARD_WRAPPER}>
  <div className={CARD_MEDIA}>
    <Image ... />
  </div>
  <h3 className={CARD_TITLE}>Title</h3>
  <div className={CARD_META}>
    <span>Meta info</span>
  </div>
</div>
```

**Defined in `/components/CardStyles.ts`:**
```typescript
export const CARD_WRAPPER = "group relative";
export const CARD_MEDIA = "relative aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800";
export const CARD_TITLE = "font-medium text-sm leading-tight line-clamp-2 text-black dark:text-white";
export const CARD_META = "flex items-center gap-1.5";
```

### Buttons

#### Primary Button
```tsx
<button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-full hover:opacity-80 transition-opacity">
  Primary Action
</button>
```

#### Secondary Button (Outlined)
```tsx
<button className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
  Secondary Action
</button>
```

#### Pill Button (Small)
```tsx
<button className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
  Small Action
</button>
```

#### Icon Button
```tsx
<button className="p-2.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full hover:opacity-80 transition-opacity shadow-lg">
  <Icon className="h-4 w-4" />
</button>
```

### Badges & Pills

#### Status Badge
```tsx
{/* Open/Available - Green */}
<span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full text-xs font-medium">
  Open
</span>

{/* Busy/Warning - Yellow */}
<span className="px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded-full text-xs font-medium">
  Busy
</span>

{/* Closed/Error - Red */}
<span className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full text-xs font-medium">
  Closed
</span>

{/* Info - Blue */}
<span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-xs font-medium">
  Info
</span>

{/* Neutral - Gray */}
<span className="px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs">
  Neutral
</span>
```

### Modal/Dialog

```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  {/* Modal */}
  <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
    <h3 className="text-lg font-medium mb-4">Modal Title</h3>
    <div className="space-y-4">
      {/* Content */}
    </div>
    <div className="flex gap-2 mt-6">
      <button className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm">
        Cancel
      </button>
      <button className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition-opacity text-sm">
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Input Fields

```tsx
{/* Text Input */}
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
  placeholder="Enter text..."
/>

{/* Textarea */}
<textarea
  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
  rows={4}
  placeholder="Enter description..."
/>

{/* Range Slider */}
<input
  type="range"
  className="w-full accent-black dark:accent-white"
  min="0"
  max="100"
/>
```

### Cards with Borders

```tsx
{/* Standard Card Container */}
<div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
  <h3 className="text-sm font-medium">Card Title</h3>
  <p className="text-sm text-gray-600 dark:text-gray-400">Content</p>
</div>

{/* Card with Sections */}
<div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
  <div className="p-4 border-b border-gray-200 dark:border-gray-800">
    <h3 className="text-sm font-medium">Section 1</h3>
  </div>
  <div className="p-4">
    <p className="text-sm text-gray-600 dark:text-gray-400">Section 2</p>
  </div>
</div>
```

### Loading States

```tsx
{/* Spinner */}
<div className="flex items-center justify-center">
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
</div>

{/* Skeleton */}
<div className="space-y-3 animate-pulse">
  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
</div>

{/* Card Skeleton */}
<div className="space-y-2 animate-pulse">
  <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
  <div className="h-3 rounded bg-gray-100 dark:bg-gray-800 w-3/4"></div>
  <div className="h-2 rounded bg-gray-100 dark:bg-gray-800 w-1/2"></div>
</div>
```

### Icons

**Use Lucide React icons consistently:**
```tsx
import { MapPin, Clock, Users, Star, Heart, Check, X } from 'lucide-react';

// Standard size: h-4 w-4 (16px)
<MapPin className="h-4 w-4" />

// Small size: h-3 w-3 (12px)
<Clock className="h-3 w-3" />

// Large size: h-5 w-5 (20px)
<Users className="h-5 w-5" />
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind)
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

### Grid Layouts
```tsx
{/* Homepage Grid */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
  {/* Cards */}
</div>

{/* Two Column */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Content */}
</div>

{/* Three Column */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Content */}
</div>
```

### Mobile-First Padding
```tsx
{/* Page Container */}
<div className="px-6 md:px-10 py-20">
  {/* Content */}
</div>
```

---

## ✨ Animations & Transitions

### Standard Transitions
```css
/* Opacity */
transition-opacity

/* Colors */
transition-colors

/* All properties */
transition-all

/* Transform (scale, translate) */
transition-transform

/* Duration: 150ms (default), 300ms (slower) */
duration-150
duration-300
```

### Hover Effects
```tsx
{/* Card hover: subtle scale */}
<div className="transition-transform duration-300 hover:scale-105">

{/* Button hover: opacity */}
<button className="hover:opacity-80 transition-opacity">

{/* Button hover: background */}
<button className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
```

### Loading Animations
```tsx
{/* Spin */}
<div className="animate-spin">...</div>

{/* Pulse */}
<div className="animate-pulse">...</div>

{/* Bounce */}
<div className="animate-bounce">...</div>
```

---

## 🎭 Dark Mode

**Always provide dark mode variants:**
```tsx
{/* Background */}
className="bg-white dark:bg-gray-900"

{/* Text */}
className="text-gray-900 dark:text-white"
className="text-gray-600 dark:text-gray-400"

{/* Border */}
className="border-gray-200 dark:border-gray-800"

{/* Hover */}
className="hover:bg-gray-50 dark:hover:bg-gray-900"
```

---

## 📦 Component Organization

### File Structure
```
/components
  /ComponentName.tsx       # Main component
  /ComponentName.module.css # Optional styles (if needed)

/components/ui              # Reusable UI primitives
  /button.tsx
  /badge.tsx
  /card.tsx
```

### Component Template
```tsx
'use client';

import { useState } from 'react';
import { Icon } from 'lucide-react';

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: () => void;
}

export function ComponentName({ prop1, prop2, onAction }: ComponentNameProps) {
  const [state, setState] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
      {/* Content */}
    </div>
  );
}
```

---

## ✅ Checklist for New Components

Before creating a new component, ensure:

- [ ] Uses existing color palette (black/white/grays)
- [ ] Has dark mode support
- [ ] Uses standard spacing (px-4, py-2, gap-3, etc.)
- [ ] Uses standard border radius (rounded-2xl, rounded-full)
- [ ] Follows typography scale (text-sm, text-xs, font-medium)
- [ ] Has hover/focus states
- [ ] Uses Lucide icons (if needed)
- [ ] Responsive on mobile (test at sm breakpoint)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Matches CARD_* styles if it's a card variant

---

## 🔄 Migration Guide: Arbitrary Values → Systematic

When you encounter arbitrary values, replace them with systematic alternatives:

### Typography Replacements
```tsx
// ❌ Before: Arbitrary font sizes
text-[9px]   → text-2xs
text-[10px]  → text-2xs
text-[11px]  → text-xs (or text-2xs if micro)
text-[15px]  → text-sm (or text-base)
text-[0.7rem] → text-2xs

// ✅ After: Systematic scale
<span className="text-2xs font-medium">Badge</span>
<p className="text-xs text-gray-500">Caption</p>
```

### Spacing Replacements
```tsx
// ❌ Before: Arbitrary spacing
mb-[50px]  → mb-12 (48px, close enough)
px-[24px]  → px-6
mt-[18px]  → mt-4 or mt-5
pl-[88px]  → pl-20 or pl-24
gap-[50px] → gap-12

// ✅ After: Systematic scale
<div className="mb-12 px-6">Section</div>
```

---

## 🚫 Anti-Patterns (Avoid)

### Don't:
- ❌ **NEVER use purple theme** - Purple is explicitly forbidden in the design system
- ❌ **NEVER use arbitrary values** like `text-[10px]` or `mb-[50px]` - use the scale
- ❌ Use colors outside the palette (no random blues, greens, etc.)
- ❌ Use inconsistent border radius (stick to rounded-2xl, rounded-full)
- ❌ Use inconsistent spacing (use Tailwind scale)
- ❌ Forget dark mode
- ❌ Use inline styles (use Tailwind classes)
- ❌ Use custom fonts (default system font is fine)
- ❌ Use emojis in UI (only in content)
- ❌ Use shadows excessively (only for modals/drawers)

### Color Restrictions:
- **Purple is FORBIDDEN** - Use gray/neutral for AI/ML features instead
- For AI/ML indicators: Use `gray` or `neutral` colors, not purple
- For badges: Use existing status colors (green, yellow, red, blue) or gray

### Do:
- ✅ Reuse existing components
- ✅ Match existing patterns
- ✅ Keep it minimal
- ✅ Test dark mode
- ✅ Test mobile breakpoint
- ✅ Use semantic HTML
- ✅ Keep accessibility in mind

---

## 📚 Reference Components

**Study these for consistency:**
- `/components/DestinationDrawer.tsx` - Complex drawer with all patterns
- `/components/CardStyles.ts` - Card styling constants
- `/app/page.tsx` - Homepage layout and grid
- `/components/Header.tsx` - Navigation patterns
- `/src/features/search/SearchFilters.tsx` - Filter UI patterns

---

*Always refer to this guide when building new features!*
