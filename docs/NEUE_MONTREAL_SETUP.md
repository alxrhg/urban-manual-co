# Neue Montreal - Setup Guide

## Overview

**Neue Montreal** is an excellent alternative to Scto Grotesk A with a very similar aesthetic (8.5/10 similarity). However, it requires a commercial license for business use.

## Licensing

- ✅ **Free for personal use** - You can download and use it for personal projects
- ⚠️ **Commercial license required** - Business/professional use requires purchasing a license
- **License Cost**: Typically $50-100+ depending on usage
- **Source**: [Pangram Pangram Foundry](https://pangrampangram.com/products/neue-montreal)

## Why Neue Montreal is Great

- **Very similar to Scto Grotesk A** (8.5/10 match)
- **14 styles** (7 weights × 2 styles: regular + italic)
- **Clean, modern Grotesque design**
- **Excellent quality** from reputable foundry
- **Supports Cyrillic** and multiple languages
- **Multiple formats** (OTF, TTF, WOFF, WOFF2)

## Comparison: Neue Montreal vs Inter

| Feature | Neue Montreal | Inter (Current) |
|---------|---------------|-----------------|
| **Similarity to Scto Grotesk A** | 8.5/10 | 8/10 |
| **License** | Commercial (free personal) | Free (OFL) |
| **Styles** | 14 (7 weights + italics) | 9 weights |
| **Quality** | Excellent | Excellent |
| **Web Optimization** | Good | Excellent |
| **Cost** | $50-100+ commercial | Free |

## Setup Instructions (if you purchase license)

### 1. Download Font Files
- Purchase license from [Pangram Pangram Foundry](https://pangrampangram.com/products/neue-montreal)
- Download WOFF2 files for web use

### 2. Add Font Files to Project
```bash
# Create fonts directory
mkdir -p public/fonts

# Copy WOFF2 files to public/fonts/
# You'll have files like:
# - NeueMontreal-Regular.woff2
# - NeueMontreal-Medium.woff2
# - NeueMontreal-Bold.woff2
# etc.
```

### 3. Add @font-face Declarations
Add to `app/globals.css`:

```css
@font-face {
  font-family: 'Neue Montreal';
  src: url('/fonts/NeueMontreal-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Neue Montreal';
  src: url('/fonts/NeueMontreal-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Neue Montreal';
  src: url('/fonts/NeueMontreal-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* Add more weights as needed */
```

### 4. Update Tailwind Config
Update `tailwind.config.js`:

```js
fontFamily: {
  sans: ['Neue Montreal', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
  'scto_grotesk_a': ['Neue Montreal', 'Inter', 'system-ui', 'sans-serif'],
}
```

### 5. Update Layout (Optional)
Remove Inter from Google Fonts if not needed:

```tsx
// In app/layout.tsx - remove or comment out:
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet" />
```

## Recommendation

### For Free/Open Source: **Stick with Inter** ⭐
- Already integrated
- Excellent quality
- Very similar (8/10)
- Completely free
- Perfect for web

### For Best Match (with budget): **Neue Montreal** ⭐
- Closest match (8.5/10)
- Excellent quality
- Professional look
- Requires commercial license

## Testing Neue Montreal

If you want to test Neue Montreal before purchasing:

1. **Download free personal version** from Pangram Pangram
2. **Use locally** for testing
3. **Purchase commercial license** if you decide to use it

## Alternative: Use Inter (Current Setup)

Your current setup with **Inter** is excellent and provides:
- ✅ 8/10 similarity to Scto Grotesk A
- ✅ Completely free
- ✅ Already integrated
- ✅ Perfect for web
- ✅ Excellent readability

**Recommendation**: Unless you have budget for Neue Montreal, **Inter is the best free choice** and will work perfectly for the Lovably aesthetic.

