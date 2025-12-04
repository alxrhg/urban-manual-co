# Urban Manual - Project Context for Discussion

## Overview

**Urban Manual** is a curated travel guide web application featuring 897+ destinations worldwide. It provides AI-powered recommendations, interactive maps, user accounts, trip planning, and editorial content for travel discovery.

**Production URL**: https://www.urbanmanual.co

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Google OAuth, Apple Sign-In) |
| **AI/ML** | Google Gemini, OpenAI, Upstash Vector |
| **CMS** | Sanity (optional), Plasmic (visual builder) |
| **Maps** | Mapbox GL |
| **Monitoring** | Sentry |
| **Rate Limiting** | Upstash Redis |
| **Deployment** | Vercel |
| **Analytics** | Vercel Analytics, Google Analytics |

---

## Architecture

### Directory Structure

```
/
├── app/                    # Next.js App Router
│   ├── api/               # ~100+ API route handlers
│   │   ├── intelligence/  # AI-powered endpoints (recommendations, itinerary, NLU)
│   │   ├── collections/   # User collections
│   │   ├── trips/        # Trip management
│   │   ├── admin/        # Admin operations
│   │   └── ...
│   ├── (home)/           # Homepage route group
│   ├── trips/            # Trip planning pages
│   ├── city/[city]/      # City-specific pages
│   ├── architect/[slug]/ # Architect detail pages
│   ├── account/          # User account
│   ├── admin/            # Admin dashboard
│   └── ...
├── components/            # ~120+ React components
│   ├── ui/               # Base UI (buttons, inputs, dialogs)
│   ├── drawers/          # Slide-over drawer components
│   ├── trip/             # Trip planning components
│   ├── maps/             # Map components
│   └── ...
├── contexts/              # React contexts
│   ├── AuthContext.tsx   # Authentication state
│   ├── TripContext.tsx   # Trip planning state
│   └── DrawerContext.tsx # Drawer/modal state
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and services
│   ├── supabase/         # Database clients
│   ├── ai/               # AI service integrations
│   ├── intelligence/     # Travel intelligence features
│   ├── ml/               # ML utilities
│   └── ...
├── services/              # External service integrations
├── types/                 # TypeScript definitions
└── supabase/             # Migrations and config
```

---

## Core Data Models

### Destination (Primary Entity)

```typescript
interface Destination {
  id?: number;
  slug: string;              // URL-friendly identifier
  name: string;
  city: string;
  country?: string;
  neighborhood?: string;
  category: string;          // restaurant, hotel, bar, museum, etc.
  description?: string;
  micro_description?: string; // Short card description
  image?: string;

  // Ratings & Awards
  michelin_stars?: number;
  rating?: number;
  crown?: boolean;           // Editor's pick

  // Architecture fields
  architect?: string;
  architect_id?: string;     // FK to architects table
  architectural_style?: string;
  construction_year?: number;

  // Location
  latitude?: number;
  longitude?: number;
  formatted_address?: string;

  // External data
  place_id?: string;         // Google Places ID
  google_maps_url?: string;
  website?: string;
  instagram_handle?: string;

  // Engagement
  views_count?: number;
  saves_count?: number;
  visits_count?: number;

  // Booking
  opentable_url?: string;
  resy_url?: string;
  booking_url?: string;
}
```

### Trip

```typescript
interface Trip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;  // JSON array of cities
  start_date: string | null;
  end_date: string | null;
  status: 'planning' | 'upcoming' | 'ongoing' | 'completed';
  is_public: boolean;
  cover_image: string | null;
  notes: string | null;        // JSON with TripNotes structure
}

interface ItineraryItem {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  time: string | null;
  title: string;
  notes: string | null;        // JSON with flight/hotel/activity data
}
```

---

## Database Schema (Supabase)

### Main Tables

| Table | Purpose |
|-------|---------|
| `destinations` | All travel destinations (~900 rows) |
| `visited_places` | User's visited destinations |
| `saved_places` | User's saved/bookmarked destinations |
| `user_preferences` | User taste profiles |
| `collections` | User-created collections |
| `trips` | Trip planning data |
| `itinerary_items` | Trip itinerary items |
| `architects` | Architecture/designer information |
| `movements` | Architectural movements |

---

## Key Features

### 1. Destination Discovery
- Browse 897+ curated destinations
- Filter by city, category, Michelin stars
- Full-text search with vector embeddings
- "Near me" location-based filtering

### 2. AI-Powered Intelligence
- Natural language search queries
- Itinerary generation
- Contextual recommendations based on taste profile
- Multi-day trip planning
- Neighborhood-aware suggestions

### 3. Trip Planning
- Create multi-city trips
- Day-by-day itinerary builder
- Add flights, hotels, activities
- Drag-and-drop reordering
- Time and travel estimates

### 4. User Features
- Google/Apple OAuth authentication
- Mark places as visited
- Save favorites
- Personal collections
- Travel statistics & map

### 5. Admin Dashboard
- Destination management
- User analytics
- Content enrichment tools
- Sanity CMS sync

---

## API Endpoints (Key Examples)

### Intelligence APIs
- `POST /api/intelligence/natural-language` - NLU search
- `POST /api/intelligence/itinerary/generate` - AI itinerary
- `GET /api/intelligence/recommendations/advanced` - Smart recommendations
- `GET /api/intelligence/neighborhoods/[city]` - City neighborhoods
- `GET /api/intelligence/taste-profile/[userId]` - User taste profile

### Core APIs
- `GET /api/destinations` - List destinations
- `GET /api/destinations/[slug]` - Destination detail
- `GET /api/similar/[id]` - Similar destinations
- `GET /api/trending` - Trending destinations

### Trip APIs
- `GET/POST /api/trips` - Trip CRUD
- `GET/POST /api/trips/[id]/itinerary` - Itinerary management

---

## Code Patterns

### API Routes
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Validation
  const searchParams = request.nextUrl.searchParams;
  if (!searchParams.get('required')) {
    throw createValidationError('Parameter required');
  }
  // Logic
  return NextResponse.json({ data });
});
```

### Supabase Usage
```typescript
// Client-side
import { supabase } from '@/lib/supabase';

// Server-side
import { createServerClient } from '@/lib/supabase/server';
const supabase = createServerClient();
```

### Component Pattern
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component (when needed)
'use client';
export default function Interactive() {
  const [state, setState] = useState();
  return <button onClick={() => setState(...)}>Click</button>;
}
```

---

## Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint

# Testing
npm run test:unit        # Unit tests (vitest)
npm run test:intelligence # Test intelligence endpoints

# Data Operations
npm run enrich           # Destination enrichment
npm run enrich:google    # Google Places API enrichment
npm run enrich:exa       # Exa search enrichment
npm run backfill-embeddings # Vector embeddings
npm run generate:micro-descriptions # AI descriptions
```

---

## Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
GEMINI_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=

# Optional
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Recent Activity

Based on recent commits:
- Trip cache revalidation improvements
- Trip page redesign (Figma-based)
- Next.js 16 compatibility fixes
- API route with on-demand cache revalidation

---

## Common Discussion Topics

1. **Feature Development** - Adding new travel features, improving UX
2. **AI/ML Integration** - Enhancing recommendations, NLU improvements
3. **Performance** - Caching, query optimization, bundle size
4. **Database** - Schema changes, migrations, RLS policies
5. **Trip Planning** - Itinerary builder, flight/hotel tracking
6. **Architecture** - Component structure, API design patterns
7. **Enrichment** - Data quality, Google Places integration

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/(home)/page.tsx` | Homepage (~130KB, filtering/search) |
| `app/layout.tsx` | Root layout with providers |
| `types/destination.ts` | Core Destination type |
| `types/trip.ts` | Trip and itinerary types |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `contexts/AuthContext.tsx` | Authentication provider |
| `contexts/TripContext.tsx` | Trip state management |
| `middleware.ts` | Auth middleware |
| `next.config.ts` | Next.js config |

---

*Generated for project discussion - Urban Manual v0.1.0*
