# CLAUDE.md - AI Assistant Guide for Urban Manual

## Project Overview

**Urban Manual** is a modern, curated travel guide web application featuring 897+ destinations worldwide. The app provides AI-powered recommendations, interactive maps, user accounts, and editorial content for travel discovery.

**Production URL**: https://www.urbanmanual.co

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (Google OAuth, Apple Sign-In) |
| AI/ML | Google Gemini, OpenAI, Supabase Vector Buckets |
| CMS | Sanity (optional), Plasmic (visual builder) |
| Monitoring | Sentry |
| Deployment | Vercel |
| Analytics | Vercel Analytics, Google Analytics |

## Directory Structure

```
/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API route handlers (~100+ endpoints)
│   ├── (routes)/          # Page routes (about, account, chat, cities, etc.)
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Homepage (large file, ~130KB)
│   └── globals.css        # Global styles
├── components/            # React components (~120+ components)
│   ├── ui/               # Base UI components (buttons, inputs, etc.)
│   ├── drawers/          # Slide-over drawer components
│   ├── maps/             # Map-related components
│   ├── trip/             # Trip planning components
│   └── admin/            # Admin dashboard components
├── contexts/              # React contexts
│   ├── AuthContext.tsx   # Authentication state
│   ├── DrawerContext.tsx # Drawer/modal state
│   ├── TripContext.tsx   # Trip planning state
│   └── ItineraryContext.tsx
├── hooks/                 # Custom React hooks
│   ├── useML*.ts         # ML-related hooks
│   ├── useTrip.ts        # Trip management
│   └── useGeolocation.ts # Location services
├── lib/                   # Utility libraries and services
│   ├── supabase/         # Supabase client/server utilities
│   ├── ai/               # AI service integrations
│   ├── ml/               # ML utilities
│   ├── intelligence/     # Travel intelligence features
│   └── utils.ts          # General utilities
├── services/              # External service integrations
│   ├── intelligence/     # Travel intelligence APIs
│   ├── search/           # Search services
│   └── gemini.ts         # Gemini AI service
├── types/                 # TypeScript type definitions
│   ├── destination.ts    # Destination interface (core type)
│   └── trip.ts           # Trip-related types
├── scripts/               # CLI scripts for data operations
├── tests/                 # Test files
├── supabase/             # Supabase migrations and config
└── public/               # Static assets
```

## Quick Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm run test:unit        # Run unit tests (tsx --test)
npm run test:intelligence # Test intelligence endpoints

# Data Operations
npm run enrich           # Run destination enrichment
npm run enrich:google    # Enrich with Google Places API
npm run enrich:exa       # Enrich with Exa search
npm run backfill-embeddings # Generate vector embeddings
```

## Code Conventions

### TypeScript

- **Strict mode enabled** - All code must pass strict TypeScript checks
- **Path aliases**: Use `@/*` for imports (e.g., `@/lib/supabase`, `@/components/Header`)
- **No `any`** unless absolutely necessary - prefer `unknown` with type guards

### React Components

- **Functional components only** with hooks
- **Server Components by default** - Add `'use client'` only when needed
- **Component naming**: PascalCase (e.g., `DestinationCard.tsx`)
- **Collocate related files**: Keep component-specific styles/types together

### API Routes

API routes follow this pattern:

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams;
  // ... validation
  if (!param) {
    throw createValidationError('Parameter is required');
  }
  // ... business logic
  return NextResponse.json({ data });
});
```

- Use `withErrorHandling` wrapper for consistent error responses
- Validate input parameters early
- Return JSON responses with `NextResponse.json()`

### Supabase Usage

```typescript
// Client-side (React components)
import { supabase } from '@/lib/supabase';

// Server-side (API routes, Server Components)
import { createServerClient } from '@/lib/supabase/server';
const supabase = createServerClient();
```

**Important**: New code should use `lib/supabase/client.ts` or `lib/supabase/server.ts` directly.

### Styling

- **Tailwind CSS v4** - Use utility classes
- **No inline styles** unless dynamic
- **Consistent spacing**: Use Tailwind's spacing scale
- **Prettier config**: 2 spaces, double quotes, trailing commas (es5)

## Key Types

### Destination (Core Entity)

```typescript
interface Destination {
  id?: number;
  slug: string;           // URL-friendly identifier
  name: string;
  city: string;
  country?: string;
  category: string;       // restaurant, hotel, bar, etc.
  description?: string;
  micro_description?: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  michelin_stars?: number;
  rating?: number;
  // ... many more fields (see types/destination.ts)
}
```

## Database Schema

Main tables in Supabase:

| Table | Purpose |
|-------|---------|
| `destinations` | All travel destinations (~900 rows) |
| `visited_places` | User's visited destinations |
| `saved_places` | User's saved/bookmarked destinations |
| `user_preferences` | User taste profiles |
| `collections` | User-created collections |
| `trips` | Trip planning data |
| `architects` | Architecture/designer information |
| `movements` | Architectural movements |

## Authentication

- Uses **Supabase Auth** with OAuth providers (Google, Apple)
- Admin routes (`/admin/*`, `/studio/*`) require `role: 'admin'` in user metadata
- Auth state managed via `AuthContext` provider
- Protected routes handled by `middleware.ts`

## Environment Variables

Required for development:

```env
# Supabase (required)
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

## Common Development Tasks

### Adding a New API Route

1. Create file at `app/api/[route-name]/route.ts`
2. Use `withErrorHandling` wrapper
3. Validate inputs with `createValidationError`
4. Return `NextResponse.json()`

### Adding a New Component

1. Create file in `components/` directory
2. Use TypeScript with proper prop types
3. Add `'use client'` if using hooks/browser APIs
4. Import with `@/components/ComponentName`

### Database Queries

```typescript
// Simple query
const { data, error } = await supabase
  .from('destinations')
  .select('*')
  .eq('city', 'London');

// With relations
const { data } = await supabase
  .from('destinations')
  .select(`
    *,
    nested_destinations:destinations!parent_destination_id(*)
  `);
```

### Running Data Enrichment

```bash
# Check current progress
npm run check:exa-progress

# Run Google Places enrichment
npm run enrich:google

# Generate AI descriptions
npm run generate:micro-descriptions
```

## Testing

- **Framework**: Vitest for unit tests
- **Test location**: `tests/` directory
- **Run tests**: `npm run test:unit`

Test patterns:
```typescript
// tests/example.test.ts
import { describe, it, expect } from 'vitest';

describe('Feature', () => {
  it('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

## Important Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Homepage (large, handles filtering/search) |
| `app/layout.tsx` | Root layout with all providers |
| `middleware.ts` | Auth middleware for admin routes |
| `next.config.ts` | Next.js config with security headers |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `types/destination.ts` | Core Destination type definition |
| `contexts/AuthContext.tsx` | Authentication provider |

## Performance Considerations

- **Image optimization**: Use `next/image` with Supabase Storage URLs
- **Data caching**: API routes use appropriate Cache-Control headers
- **Bundle size**: Avoid importing large libraries in client components
- **Turbopack**: Next.js 16 uses Turbopack by default (fast rebuilds)

## Security

- CSP headers configured in `next.config.ts`
- Rate limiting via Upstash Redis (`@/lib/rate-limit.ts`)
- Input sanitization with DOMPurify (`@/lib/sanitize-html.ts`)
- Admin routes protected by middleware

## Deployment

- **Platform**: Vercel (automatic deployments from GitHub)
- **Environment**: Set variables in Vercel dashboard
- **Preview deployments**: Automatic for PRs

## Common Gotchas

1. **Server vs Client Components**: Default is Server Component. Add `'use client'` only when using hooks, browser APIs, or event handlers.

2. **Supabase Client**: Use the appropriate client for the context:
   - Client components: `import { supabase } from '@/lib/supabase'`
   - Server/API: `createServerClient()` from `@/lib/supabase/server`

3. **Large Homepage**: `app/page.tsx` is ~130KB - make targeted edits, don't rewrite entirely.

4. **Environment Variables**: `NEXT_PUBLIC_` prefix required for browser-accessible vars.

5. **Image Domains**: Add new image domains to `next.config.ts` remotePatterns.

## Related Documentation

- `/docs/` - Additional documentation
- `README.md` - General project overview
- `DESIGN_SYSTEM.md` - UI design guidelines
- `SECURITY.md` - Security practices
