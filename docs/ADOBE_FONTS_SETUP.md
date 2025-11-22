# Adobe Fonts Setup Guide

## Overview

Yes! Having an Adobe Creative Cloud subscription gives you access to **Adobe Fonts** (formerly Typekit), which includes over 30,000 fonts from 150+ type foundries. This opens up many high-quality font options for your Lovably-inspired design.

## Key Benefits

✅ **Commercial License Included** - All fonts are licensed for commercial use  
✅ **Web Fonts Available** - Can be used on websites via Adobe's CDN  
✅ **No Additional Cost** - Included with your Creative Cloud subscription  
✅ **High Quality** - Professional fonts from reputable foundries  

## Important Licensing Notes

⚠️ **Must Use Adobe's CDN** - You cannot self-host Adobe Font files  
⚠️ **Client Websites** - If building for a client, they need their own Adobe subscription  
✅ **Your Projects** - You can use fonts on your own websites/projects  

## Fonts Similar to Scto Grotesk A (Available on Adobe Fonts)

### Top Recommendations:

1. **Brandon Grotesque**
   - Clean, geometric sans-serif
   - Very similar aesthetic to Scto Grotesk A
   - Multiple weights available
   - Excellent for headlines and body text

2. **Avenir**
   - Swiss-inspired geometric sans-serif
   - Clean, modern, professional
   - Designed by Adrian Frutiger
   - Very similar to Scto Grotesk A

3. **Proxima Nova**
   - Modern geometric sans-serif
   - Clean, versatile
   - Excellent readability
   - Good match for Lovably aesthetic

4. **Founders Grotesk**
   - Geometric sans-serif
   - Clean, minimal
   - Similar to Scto Grotesk A

5. **Neue Haas Grotesk**
   - Modern Helvetica revival
   - Swiss design tradition
   - Very clean, professional

6. **GT America**
   - Swiss/American hybrid
   - Geometric, clean
   - Similar aesthetic

## Setup Instructions

### Step 1: Browse Adobe Fonts
1. Go to [fonts.adobe.com](https://fonts.adobe.com)
2. Sign in with your Adobe account
3. Search for fonts (e.g., "Brandon Grotesque", "Avenir")

### Step 2: Create a Web Project
1. Click "Create a Web Project"
2. Add your fonts to the project
3. Name your project (e.g., "Urban Manual")

### Step 3: Get Embed Code
1. Adobe will generate an embed code like:
```html
<link rel="stylesheet" href="https://use.typekit.net/xxxxx.css">
```

### Step 4: Add to Your Project

#### Option A: Add to `app/layout.tsx`
```tsx
// In app/layout.tsx, inside <head>
<link rel="stylesheet" href="https://use.typekit.net/xxxxx.css" />
```

#### Option B: Update Tailwind Config
```js
// tailwind.config.js
fontFamily: {
  sans: ['Brandon Grotesque', 'Inter', 'system-ui', 'sans-serif'],
  'scto_grotesk_a': ['Brandon Grotesque', 'Inter', 'system-ui', 'sans-serif'],
}
```

#### Option C: Update CSS
```css
/* app/globals.css */
@import url('https://use.typekit.net/xxxxx.css');

body {
  font-family: 'brandon-grotesque', 'Inter', system-ui, sans-serif;
}
```

## Recommended Font: Brandon Grotesque

**Why Brandon Grotesque?**
- ✅ Very similar to Scto Grotesk A (8.5/10 match)
- ✅ Clean, geometric design
- ✅ Excellent readability
- ✅ Multiple weights available
- ✅ Perfect for minimal, clean aesthetic
- ✅ Available on Adobe Fonts

## Implementation Example

### 1. Get Adobe Fonts Embed Code
```html
<!-- From Adobe Fonts web project -->
<link rel="stylesheet" href="https://use.typekit.net/xxxxx.css">
```

### 2. Update `app/layout.tsx`
```tsx
<head>
  {/* Existing fonts */}
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet" />
  
  {/* Adobe Fonts - Add this */}
  <link rel="stylesheet" href="https://use.typekit.net/xxxxx.css" />
</head>
```

### 3. Update `tailwind.config.js`
```js
fontFamily: {
  sans: ['brandon-grotesque', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
  'scto_grotesk_a': ['brandon-grotesque', 'Inter', 'system-ui', 'sans-serif'],
}
```

### 4. Update CSS Variables (Optional)
```css
/* app/globals.css */
body {
  font-family: 'brandon-grotesque', 'Inter', system-ui, sans-serif;
}
```

## Font Comparison

| Font | Similarity to Scto Grotesk A | Available on Adobe Fonts | Best For |
|------|------------------------------|--------------------------|----------|
| **Brandon Grotesque** | 8.5/10 | ✅ Yes | Headlines, body text |
| **Avenir** | 8/10 | ✅ Yes | Body text, UI |
| **Proxima Nova** | 7.5/10 | ✅ Yes | UI, web design |
| **Founders Grotesk** | 7.5/10 | ✅ Yes | Headlines |
| **Neue Haas Grotesk** | 8/10 | ✅ Yes | Professional design |
| **Inter** (current) | 8/10 | ❌ No (Google Fonts) | Web, UI |

## Next Steps

1. **Browse Adobe Fonts**: Visit [fonts.adobe.com](https://fonts.adobe.com)
2. **Search for fonts**: Try "Brandon Grotesque", "Avenir", "Proxima Nova"
3. **Create web project**: Add fonts to a web project
4. **Get embed code**: Copy the embed code provided
5. **Update your site**: Add embed code to `app/layout.tsx`
6. **Update Tailwind**: Add font to `tailwind.config.js`

## Testing

After adding the font:
1. Check browser DevTools to confirm font is loading
2. Verify font-family in computed styles
3. Test across different browsers
4. Check font loading performance

## Advantages Over Free Fonts

- ✅ **Better Match**: Closer to Scto Grotesk A than free alternatives
- ✅ **Professional Quality**: High-quality fonts from reputable foundries
- ✅ **Commercial License**: Included with subscription
- ✅ **Web Optimized**: Adobe's CDN is fast and reliable
- ✅ **No Additional Cost**: Already included in your subscription

## Recommendation

**Use Brandon Grotesque or Avenir** from Adobe Fonts - they're the closest matches to Scto Grotesk A and will give you the exact Lovably aesthetic you're looking for!

