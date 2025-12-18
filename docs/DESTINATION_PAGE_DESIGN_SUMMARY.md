# Destination Page - Design Summary for Lovable

**Purpose**: This document summarizes the current individual destination page for redesign in Lovable.

---

## 1. Page Overview

**Route**: `/destination/[slug]`
**Purpose**: Display detailed information about a single travel destination (restaurant, hotel, bar, etc.)
**Example URLs**: `/destination/noma`, `/destination/aman-tokyo`, `/destination/four-seasons-surf-club`

### Core Goals
- Present destination details in an editorial, visually-rich format
- Enable user actions: Save, Mark as Visited, Share
- Show related/similar destinations for discovery
- Display location, contact, and hours information
- Showcase architecture/design information when available

---

## 2. Page Layout Structure

### Desktop Layout (lg+)
```
┌─────────────────────────────────────────────────────────────┐
│                    HERO IMAGE (40-50vh)                     │
│  [Back]                                    [Share][Save][✓] │
│                                                             │
│  ┌─ Location Badge ─┐                                       │
│  │ 📍 City, Country │                                       │
│  └──────────────────┘                                       │
│                                                             │
│  Destination Name                                           │
│  [Category] [⭐ Michelin] [Rating] [Price] [Brand]         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [About] [Reviews] [Location] [Similar]   ← Sticky Tab Nav   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐  ┌───────────────────────┐
│                                 │  │                       │
│  MAIN CONTENT COLUMN            │  │  SIDEBAR (380px)      │
│  • Parent destination link      │  │                       │
│  • ML Intelligence alerts       │  │  Location & Contact   │
│  • About section                │  │  • Address            │
│  • Architecture & Design        │  │  • Get Directions btn │
│  • Reviews (top 3)              │  │  • Call/Website btns  │
│  • Nested destinations          │  │  • Opening Hours      │
│  • Similar destinations grid    │  │                       │
│                                 │  │  Quick Actions        │
│                                 │  │  • Explore city btn   │
│                                 │  │  • Browse all btn     │
│                                 │  │                       │
└─────────────────────────────────┘  └───────────────────────┘
```

### Mobile Layout
```
┌───────────────────────────┐
│    HERO IMAGE (50vh)      │
│ [←]            [⇧][♡][✓]  │
│                           │
│ 📍 City, Country          │
│ Destination Name          │
│ [Badges row...]           │
└───────────────────────────┘
│ [Save btn] [Visited btn]  │  ← Quick Actions Bar
├───────────────────────────┤
│ Parent destination card   │
│ ML Alerts                 │
│ About section             │
│ Architecture & Design     │
│ Reviews                   │
│ Nested destinations       │
│ Similar destinations      │
├───────────────────────────┤
│ Location & Contact Card   │
│ (Address, buttons, hours) │
├───────────────────────────┤
│ [Explore City] [Browse]   │
└───────────────────────────┘
```

---

## 3. Section-by-Section Breakdown

### 3.1 Hero Section
**Height**: 40-50vh depending on breakpoint

**Content**:
| Element | Description |
|---------|-------------|
| Background Image | Full-width destination photo with gradient overlay |
| Back Button | Floating pill, top-left, `bg-white/90` with backdrop blur |
| Action Buttons | Top-right: Share, Save (bookmark), Visited (checkmark) |
| Location Badge | Pill badge linking to city page: "📍 Neighborhood · City, Country" |
| Title | Large heading (3xl-5xl responsive) |
| Meta Badges | Row of pills: Category, Michelin stars, Crown, Rating, Price level, Brand |

**Badge Variants**:
- **Category**: `bg-white/20 backdrop-blur` with Tag icon
- **Michelin**: `bg-red-600/90` with star icon
- **Crown**: `bg-amber-500/90`
- **Rating**: `bg-white/20` with star icon and count
- **Price**: `bg-white/20` showing $-$$$$
- **Brand**: `bg-white/20` with Building icon, links to brand page

### 3.2 Tab Navigation (Desktop Only)
**Position**: Sticky at top (`top-0 z-20`)
**Background**: White/dark with bottom border

**Tabs**:
1. **About** - Always visible, active by default
2. **Reviews** - Only if reviews exist
3. **Location** - Always visible
4. **Similar** - Only if recommendations exist

### 3.3 Parent Destination Card
**Condition**: Only shown if destination is nested inside another (e.g., bar inside hotel)

**Content**:
- Label: "Located inside" (uppercase, small text)
- Horizontal card with: image thumbnail, name, category, city, badges

### 3.4 Quick Actions Bar (Mobile)
**Content**: Horizontal scrollable row
- **Save Button**: Toggle state, filled when saved
- **Visited Button**: Dropdown with "Add Details" / "Remove Visit" options

### 3.5 ML Intelligence Section
**Components** (all conditional):
1. **AnomalyAlert** - Traffic anomaly warnings
2. **ForecastInfo** - Best/peak times to visit
3. **SentimentDisplay** - Social sentiment analysis
4. **TopicsDisplay** - Trending topics/keywords
5. **SequencePredictionsInline** - Suggested next actions

### 3.6 About Section
**Container**: White card with border, rounded-2xl, p-6/8

**Content**:
- Section title: "About"
- Main content: Sanitized HTML converted to plain text
- Micro description (if different from content): Italic, separated by border

### 3.7 Architecture & Design Section
**Condition**: Only shown if any architecture data exists

**Fields displayed**:
| Field | Icon | Description |
|-------|------|-------------|
| Architect | Building2 | Name with link to architect page |
| Design Firm | Building2 | Firm name with founding year |
| Interior Designer | Palette | Designer name |
| Style | Palette | Architectural style |
| Movement | Palette | Design movement with link |
| Period | Calendar | Design period |
| Significance | - | Why it matters architecturally |
| Design Story | - | Narrative about the design |
| Construction Year | Calendar | When built |
| Sources | ExternalLink | Up to 3 reference links |

### 3.8 Reviews Section
**Condition**: Only if `reviews_json` has entries

**Content** (max 3 shown):
- Author avatar (initial in circle)
- Author name
- 5-star rating display
- Relative time ("2 months ago")
- Review text

### 3.9 Nested Destinations
**Condition**: Only if destination has child venues

**Layout**: Horizontal scrollable grid

**Card format**:
- Square image (132px width)
- Michelin badge overlay (if applicable)
- Name (2-line clamp)
- Category or city

### 3.10 Similar Destinations
**Title**: "You might also like"

**Layout**: 2x2 on mobile, 3-4 columns on larger screens

**Card format**:
- 4:3 aspect ratio image
- Michelin badge overlay
- Name
- City

**Loading state**: 8 skeleton cards

### 3.11 Location & Contact Card (Desktop Sidebar / Mobile Section)

**Desktop**: Sticky sidebar card
**Mobile**: Full-width card below main content

**Content**:
| Element | Action |
|---------|--------|
| Address | Display with MapPin icon |
| Get Directions | Primary button → Google Maps |
| Call | Secondary button → `tel:` link |
| Website | Secondary button → external link |
| Instagram | Secondary button → Instagram URL |
| Opening Hours | 7-day schedule table |

### 3.12 Footer Actions
**Buttons**:
1. **Primary**: "Explore more in {City}" → links to city page
2. **Secondary**: "Browse all destinations" → links to homepage

---

## 4. Data Model (Destination)

```typescript
interface Destination {
  // Core fields
  id: number;
  slug: string;
  name: string;
  city: string;
  country?: string;
  neighborhood?: string;
  category: string;

  // Content
  description?: string;
  content?: string;           // Main body text
  micro_description?: string; // Short tagline

  // Media
  image?: string;

  // Ratings & Awards
  michelin_stars?: number;    // 0-3
  crown?: boolean;
  rating?: number;            // Google rating 1-5
  user_ratings_total?: number;
  price_level?: number;       // 1-4

  // Business info
  brand?: string;
  phone_number?: string;
  website?: string;
  instagram_url?: string;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;

  // Architecture
  architect?: string;
  design_firm?: string;
  interior_designer?: string;
  architectural_style?: string;
  design_period?: string;
  architectural_significance?: string;
  design_story?: string;
  construction_year?: number;

  // Enriched JSON
  opening_hours_json?: { weekday_text: string[] };
  reviews_json?: Array<{
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string;
  }>;

  // Relations
  parent_destination_id?: number;
  nested_destinations?: Destination[];
}
```

---

## 5. User Interactions

### 5.1 Save Flow
1. User clicks Save button (bookmark icon)
2. Modal opens with CollectionsManager
3. User selects/creates collection
4. Destination saved to collection
5. Button state updates to filled

### 5.2 Visited Flow
**Quick toggle**: Click → marks as visited with current date

**With details**:
1. Click dropdown arrow on Visited button
2. Select "Add Details"
3. Modal with: Date picker, 5-star rating, Notes textarea
4. Save updates visit record

### 5.3 Share Flow
- Mobile: Native share API
- Desktop: Copy URL to clipboard

### 5.4 Navigation
- Back button → `router.back()`
- City badge → `/city/{slug}`
- Brand badge → `/brand/{name}`
- Architect link → `/architect/{slug}`
- Movement link → `/movement/{slug}`
- Similar destination → `/destination/{slug}`
- Get Directions → Google Maps external

---

## 6. Design System Reference

### Colors
```css
/* Light */
--bg-primary: white
--bg-secondary: #f9fafb
--text-primary: black
--text-secondary: #4b5563
--border: #e5e7eb

/* Dark */
--bg-primary: #0a0a0a
--text-primary: white
--border: #1f2937

/* Accents (sparingly) */
--michelin-red: #dc2626
--crown-amber: #f59e0b
--visited-green: #16a34a
--star-yellow: #facc15
```

### Border Radius
- Cards: `rounded-2xl` (24px)
- Buttons: `rounded-full` or `rounded-xl` (16px)
- Pills/badges: `rounded-full`

### Typography
- Hero title: `text-3xl md:text-4xl lg:text-5xl font-bold`
- Section titles: `text-lg font-semibold`
- Body: `text-[15px] leading-relaxed`
- Meta/labels: `text-[13px]` or `text-xs`

### Spacing
- Page padding: `px-6 md:px-10 lg:px-12`
- Section gaps: `space-y-8 md:space-y-10`
- Card padding: `p-5` or `p-6 md:p-8`

---

## 7. Component Inventory

| Component | File | Purpose |
|-----------|------|---------|
| DestinationPageClient | `app/destination/[slug]/page-client.tsx` | Main page |
| SaveDestinationModal | `components/SaveDestinationModal.tsx` | Save to collection |
| VisitedModal | `components/VisitedModal.tsx` | Add visit details |
| ArchitectDesignInfo | `components/ArchitectDesignInfo.tsx` | Architecture section |
| NestedDestinations | `components/NestedDestinations.tsx` | Child venues grid |
| HorizontalDestinationCard | `components/HorizontalDestinationCard.tsx` | Parent destination |
| ForecastInfo | `components/ForecastInfo.tsx` | ML peak times |
| SentimentDisplay | `components/SentimentDisplay.tsx` | ML sentiment |
| TopicsDisplay | `components/TopicsDisplay.tsx` | ML topics |
| AnomalyAlert | `components/AnomalyAlert.tsx` | ML alerts |

---

## 8. Redesign Opportunities

### Content Hierarchy
- Hero could be taller with more prominent CTA
- Consider collapsible/expandable sections for mobile
- Reviews section could show more or have "View all" option

### Visual Enhancements
- Photo gallery from `photos_json` (currently unused)
- Map embed in location section
- Video content support

### User Experience
- Floating bottom action bar on mobile (instead of scroll to find)
- Quick-add to trip planner
- Comparison feature with similar destinations

### Information Architecture
- Tab navigation could be enhanced with scroll-spy
- Consider vertical tabs for desktop sidebar
- Price/booking information more prominent

### Social Features
- User-submitted photos
- Tips from visitors
- Friend activity ("3 friends have been here")

---

## 9. Assets & Icons

**Icon Library**: Lucide React

**Key icons used**:
- `ArrowLeft` - Back navigation
- `MapPin` - Location
- `Bookmark` - Save
- `Check` - Visited
- `Share2` - Share
- `Phone` - Call
- `Globe` - Website
- `Clock` - Hours
- `Navigation` - Directions
- `Building2` - Architect/Brand
- `Palette` - Design/Style
- `Calendar` - Period/Year
- `Tag` - Category
- `ExternalLink` - External links

**Special images**:
- Michelin star icon (external SVG from Michelin Guide)

---

## 10. Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, full-width hero |
| sm | 640px | 2-col similar grid |
| md | 768px | 3-col similar grid |
| lg | 1024px | Two-column layout with sidebar |
| xl | 1280px | Wider content area |
| 2xl | 1536px | Max-width container |

---

*Document generated for Lovable redesign - December 2024*
