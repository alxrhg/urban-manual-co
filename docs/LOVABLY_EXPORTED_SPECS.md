# Lovably Exported Code - Exact Specifications

This document contains the exact specifications extracted from the exported Lovably website code.

## Typography

### Font Family
- **Primary**: `Scto Grotesk A`
- **Fallback**: `ui-sans-serif`, `system-ui`, `sans-serif`
- **CSS Class**: `font-scto_grotesk_a`

### Base Typography
- **Mobile**: `text-[15px]` (15px) with `leading-[23px]` (line-height)
- **Desktop**: `md:text-sm` (14px) with `md:leading-[22px]` (line-height)
- **Font Weight**: `font-normal` (400)
- **Letter Spacing**: `tracking-[normal]` (default) or `tracking-[0.39px]` for hero

### Hero Title
- **Size**: `text-sm` (14px) on mobile, `md:text-[13px]` (13px) on desktop
- **Line Height**: `leading-[23px]` on mobile, `md:leading-[22px]` on desktop
- **Letter Spacing**: `tracking-[0.42px]` on mobile, `md:tracking-[0.39px]` on desktop
- **Transform**: `uppercase`
- **Margin**: `my-5` (20px vertical)

## Colors

### Background
- **Body**: `bg-zinc-100` (#F4F4F5 / rgb(244, 244, 245))
- **Navbar**: `bg-white/50` (50% opacity white) with `backdrop-blur-2xl`
- **Text**: `text-black` on light background

### Accent Colors
- **Default Text**: `text-zinc-400` (#A1A1AA)
- **Hover**: `hover:text-orange-600` (#EA580C)
- **Border on Hover**: `hover:border-orange-600`

### Dividers
- **Color**: `bg-zinc-500/20` (20% opacity zinc-500)

## Layout

### Container
- **Max Width**: `max-w-[1800px]`
- **Padding Mobile**: `px-[15px]` (15px)
- **Padding Desktop**: `md:px-[50px]` (50px)
- **Centering**: `mx-auto`

### Grid System
- **Mobile**: 4 columns (`grid-cols-[1fr_1fr_1fr_1fr]`)
- **Desktop**: 12 columns (`md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr]`)
- **Gap Horizontal**: `gap-x-[23px]` on mobile, `md:gap-x-[22px]` on desktop
- **Gap Vertical**: `gap-y-[23px]` on mobile, `md:gap-y-[22px]` on desktop

### Hero Section
- **Height**: `h-[800px]`
- **Layout**: Grid with 2 items (title and description)
- **Title Position**: `col-end-5 col-start-1` (mobile), `md:col-end-13 md:col-start-7` (desktop)
- **Description Position**: `col-end-5 col-start-1` (mobile), `md:col-end-13 md:col-start-7` (desktop)

### Navbar
- **Height Mobile**: `h-[50px]`
- **Height Desktop**: `md:h-[90px]`
- **Position**: `sticky top-0 z-10`
- **Background**: `bg-white/50 backdrop-blur-2xl`
- **Border**: `border-b border-transparent`

### Project Grid
- **Margin Top**: `mt-0` on mobile, `md:mt-[-135px]` on desktop (overlaps hero)
- **Padding Top**: `pt-2.5` on mobile, `md:pt-[135px]` on desktop
- **Min Height**: `min-h-[600px]`

## Component Specifications

### Logo
- **Text**: "Lovably" with `®` superscript
- **Superscript**: `text-[11px]` on mobile, `md:text-[10px]` on desktop
- **Position**: `relative left-px bottom-[3px]`

### Project Card
- **Image Aspect Ratio**: `aspect-[3_/_2]` (3:2)
- **Image Margin Bottom**: `mb-[5px]`
- **Card Margin Bottom**: `mb-[30px]` on mobile, `md:mb-[50px]` on desktop
- **Text Color**: `text-zinc-400`
- **Hover**: `hover:text-orange-600 hover:border-orange-600`

### Links
- **Default**: `text-zinc-400`
- **Hover**: `hover:text-orange-600 hover:border-orange-600`
- **Display**: `block`

## Spacing

### Vertical Spacing
- **Section Spacing**: `mb-[30px]` on mobile, `md:mb-[50px]` on desktop
- **Hero Margin Bottom**: `mb-[30px]` on mobile, `md:mb-[70px]` on desktop
- **Card Spacing**: `mb-[5px]` for images, `mb-[30px]` for cards on mobile

### Horizontal Spacing
- **Container Padding**: 15px (mobile) / 50px (desktop)
- **Grid Gaps**: 23px (mobile) / 22px (desktop)

## Responsive Breakpoints

- **Mobile**: Default (no prefix)
- **Desktop**: `md:` prefix (768px+)

## Key CSS Classes Reference

```tsx
// Body
className="bg-zinc-100 text-black font-scto_grotesk_a text-[15px] leading-[23px] md:text-sm md:leading-[22px]"

// Container
className="max-w-[1800px] mx-auto px-[15px] md:px-[50px]"

// Navbar
className="sticky top-0 z-10 bg-white/50 backdrop-blur-2xl h-[50px] md:h-[90px]"

// Hero Title
className="text-sm tracking-[0.42px] leading-[23px] uppercase md:text-[13px] md:tracking-[0.39px] md:leading-[22px]"

// Grid
className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-x-[23px] gap-y-[23px] md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] md:gap-x-[22px] md:gap-y-[22px]"

// Project Card
className="text-zinc-400 hover:text-orange-600 hover:border-orange-600"
```

## Implementation Notes

1. **Background Color**: `bg-zinc-100` is very close to `#F2F2F2` - both are light gray
2. **Font**: Scto Grotesk A needs to be added manually (not included in export)
3. **Grid System**: Uses CSS Grid with explicit column definitions
4. **Spacing**: Very precise spacing with specific pixel values
5. **Hover States**: Simple color change to orange-600
6. **Typography Scale**: Smaller base size (13-15px) than typical web design

