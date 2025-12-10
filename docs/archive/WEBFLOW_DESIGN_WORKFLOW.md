# Webflow Design Workflow for Urban Manual

## Overview
Use Webflow for UI/UX design, then implement the designs in your Next.js codebase. This gives you:
- ✅ Familiar Webflow visual editor
- ✅ Design without code
- ✅ Export assets and specs
- ✅ Implement in Next.js with full functionality

---

## Workflow Options

### Option 1: Design → Export → Implement (Recommended)
**Best for: Complete page redesigns**

1. **Design in Webflow**
   - Create your homepage design in Webflow
   - Use Webflow's visual editor for layout, spacing, typography
   - Export assets (images, SVGs) as needed

2. **Export Design Specs**
   - Use Webflow's "Export Code" feature to get CSS/structure reference
   - Or use browser DevTools to inspect styles
   - Export images/assets from Webflow

3. **Implement in Next.js**
   - Recreate the design in your `app/page.tsx` using Tailwind CSS
   - Match spacing, colors, typography from Webflow
   - Add your existing functionality (search, filters, etc.)

**Pros:**
- Full control over implementation
- Keep all your existing functionality
- No Webflow hosting needed

**Cons:**
- Manual implementation required
- Need to match styles manually

---

### Option 2: Webflow DevLink (For Components)
**Best for: Reusable components**

1. **Set up Webflow DevLink**
   - Install Webflow DevLink extension
   - Connect your Webflow project to your Next.js app
   - Design components in Webflow

2. **Export Components**
   - Export React components from Webflow
   - Import into your Next.js app
   - Add functionality/logic in code

**Pros:**
- Direct component export
- Faster for component-based designs

**Cons:**
- Requires DevLink setup
- May need code cleanup after export

---

## Recommended Setup

### 1. Create Webflow Project
1. Go to [webflow.com](https://webflow.com)
2. Create a new project (free tier is fine for design-only)
3. Name it "Urban Manual - Design System" or similar

### 2. Design Your Homepage
- Recreate your current homepage layout
- Or design a new version
- Focus on:
  - Layout structure
  - Spacing and typography
  - Color scheme
  - Responsive breakpoints
  - Component styles

### 3. Export Assets
- Images: Export as WebP or optimized formats
- Icons: Export as SVG
- Fonts: Note which fonts you're using
- Colors: Export color palette

### 4. Design Tokens to Extract
When designing, make sure to note:
- **Colors**: Hex codes for all colors used
- **Typography**: Font families, sizes, line heights, weights
- **Spacing**: Padding, margins, gaps (in px or rem)
- **Breakpoints**: Mobile, tablet, desktop widths
- **Border Radius**: For buttons, cards, etc.
- **Shadows**: Box shadow values

---

## Implementation Guide

### Step 1: Update Tailwind Config
Add your Webflow design tokens to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Add colors from Webflow
        primary: '#...',
        secondary: '#...',
      },
      fontFamily: {
        // Add fonts from Webflow
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        // Add custom spacing if needed
      },
    },
  },
}
```

### Step 2: Implement Layout
Recreate the Webflow layout in your `app/page.tsx`:

```tsx
// Match the structure from Webflow
<div className="container mx-auto px-4">
  {/* Header section - match Webflow */}
  <header>...</header>
  
  {/* Hero section - match Webflow */}
  <section className="py-16">...</section>
  
  {/* Content sections - match Webflow */}
</div>
```

### Step 3: Match Styles
Use Tailwind classes to match Webflow styles:
- Spacing: `p-4`, `m-6`, `gap-8`
- Typography: `text-2xl`, `font-semibold`, `leading-tight`
- Colors: `bg-primary`, `text-gray-900`
- Layout: `flex`, `grid`, `container`

---

## Tools & Resources

### Webflow Export Tools
1. **Webflow Export Code**: Get HTML/CSS reference
2. **Browser DevTools**: Inspect computed styles
3. **Figma/Design Handoff**: If you use Figma, export from there too

### Design Spec Tools
- **Webflow Inspector**: Browser extension to inspect styles
- **Zeplin/Avocode**: Design handoff tools (if using)
- **Browser DevTools**: Most reliable for getting exact values

### Implementation Helpers
- **Tailwind CSS IntelliSense**: VS Code extension for autocomplete
- **Headless UI**: For interactive components
- **Radix UI**: Already in your project for accessible components

---

## Best Practices

### 1. Design System First
- Create a design system in Webflow
- Define colors, typography, spacing scale
- Use Webflow's style system for consistency

### 2. Component-Based Design
- Design reusable components in Webflow
- Note component variants (hover states, etc.)
- Document component props/behaviors

### 3. Responsive Design
- Design mobile-first in Webflow
- Test all breakpoints
- Note breakpoint values for Tailwind

### 4. Asset Optimization
- Export images in WebP format
- Optimize SVGs
- Use Next.js Image component for performance

### 5. Maintain Functionality
- Keep your existing search, filters, etc.
- Only replace the visual design
- Add new functionality as needed

---

## Quick Start Checklist

- [ ] Create Webflow project
- [ ] Design homepage layout
- [ ] Export design tokens (colors, fonts, spacing)
- [ ] Export assets (images, icons)
- [ ] Update Tailwind config with design tokens
- [ ] Implement layout in `app/page.tsx`
- [ ] Match styles using Tailwind classes
- [ ] Test responsive breakpoints
- [ ] Add existing functionality back
- [ ] Deploy and test

---

## Need Help?

If you need help implementing a specific Webflow design:
1. Share the Webflow project link or screenshots
2. Export the design specs
3. I can help convert it to Next.js/Tailwind code

---

## Resources

- [Webflow University](https://university.webflow.com/)
- [Webflow DevLink Docs](https://developers.webflow.com/data/data/docs/devlink-documentation-and-usage-guide)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

