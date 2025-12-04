# Loading States & Performance Audit

**Audit Date:** December 4, 2025
**Codebase:** Urban Manual (Next.js 16 / React 19)

---

## Executive Summary

Urban Manual implements a **mature, multi-layered performance architecture** with comprehensive loading patterns. The codebase demonstrates strong adherence to modern Next.js best practices including server-first rendering, Suspense streaming, and multi-tier caching. However, there are opportunities to improve perceived performance and address specific bottlenecks.

**Overall Score: 8/10**

---

## Current State Analysis

### 1. Loading Patterns Inventory

| Pattern | Count | Implementation |
|---------|-------|----------------|
| `loading.tsx` files | 2 | Root + homepage |
| Skeleton components | 50+ | Comprehensive library |
| Spinner variants | 4 | OAuth, contextual, button, generic |
| Suspense boundaries | 11 | Strategic placement |
| Loading hooks | 4 | State management |
| Progress indicators | 1 | Long operations |

#### Strengths

- **Extensive skeleton library** (`components/ui/loading-states.tsx`): 20+ specialized skeletons covering all content types
- **Context-aware loading messages** (`lib/context/loading-message.ts`): Smart UX copy based on user intent, time of day, and category
- **Shimmer animations**: Enhanced perceived performance with `animate-[shimmer_2s_infinite]`
- **Dark mode support**: All loading states respect theme

#### File Locations

| Component | Path |
|-----------|------|
| Base Skeleton | `components/ui/skeleton.tsx` |
| Loading States Library | `components/ui/loading-states.tsx` |
| Destination Skeletons | `components/skeletons/DestinationCardSkeleton.tsx` |
| Drawer Skeleton | `components/skeletons/DrawerSkeleton.tsx` |
| Contextual Loading | `components/ContextualLoadingState.tsx` |
| Spinner | `components/ui/spinner.tsx` |

---

### 2. Data Fetching Architecture

#### Server vs Client Rendering

```
Architecture: Server-First with Strategic Client Interactivity

Server Components (default):
├── Homepage shell
├── Destination pages
├── City pages
└── Static content

Client Components ('use client'):
├── Trip editor (interactive state)
├── Search with filters
├── Chat/AI streaming
└── User-specific features
```

#### Caching Strategy (Multi-Layer)

```
Request → CDN Cache → Server Cache → Database
              ↓            ↓
         (s-maxage)  (unstable_cache)
              ↓            ↓
         Stale-While   5-10 min TTL
         Revalidate
```

| Layer | Implementation | TTL |
|-------|----------------|-----|
| CDN | `Cache-Control: s-maxage` | 60-600s |
| Server | `unstable_cache()` | 5-10 min |
| Client | `useDataFetching` hook cache | 5 min |
| ISR | `revalidate` export | 60-3600s |

#### Stale-While-Revalidate APIs

- `/api/cities` - SWR: 1200s
- `/api/homepage/destinations` - SWR: 300s
- `/api/trending` - SWR: 600s
- `/api/recommendations/smart` - SWR: 600s
- `/api/categories` - SWR: 1200s

---

### 3. Performance Optimizations

#### Code Splitting

**Homepage dynamic imports** (`app/page-client.tsx`):
- 12+ components lazy-loaded with `ssr: false`
- Non-critical features deferred

```typescript
// Pattern used
const DestinationDrawer = dynamic(
  () => import('@/components/drawers/DestinationDrawer'),
  { ssr: false, loading: () => null }
);
```

#### Image Optimization

| Technique | Implementation |
|-----------|----------------|
| Priority loading | First image: `fetchPriority="high"` |
| Lazy loading | Index 6+: `loading="lazy"` |
| Responsive | `sizes="(max-width: 640px) 50vw..."` |
| Formats | AVIF, WebP |
| Thumbnails | `image_thumbnail` for cards |

#### Resource Hints

```html
<!-- Preconnect (layout.tsx) -->
<link rel="preconnect" href="supabase-url" />
<link rel="preconnect" href="fonts.googleapis.com" />

<!-- Document prefetch -->
<link rel="prefetch" href="/cities" as="document" />
<link rel="prefetch" href="/city/tokyo" as="document" />
```

#### Monitoring

- Vercel Speed Insights (Core Web Vitals)
- Vercel Analytics
- Sentry (errors + session replay)
- Google Analytics (consent-based)

---

## Identified Bottlenecks

### Critical

#### 1. Homepage Bundle Size (~130KB)

**Location:** `app/page.tsx`

The homepage is noted as a large file (~130KB). While code splitting mitigates this, the initial parse time may impact Time to Interactive.

**Impact:** FID/INP degradation on slower devices

#### 2. Missing Suspense Boundaries on Key Routes

**Affected Pages:**
- `/trips` - User-specific data fetches without streaming
- `/account` - Profile data blocks render

**Impact:** Slower perceived load times; content appears all-at-once

### Moderate

#### 3. Client-Side Waterfall in Trip Editor

**Location:** `app/trips/[id]/page.tsx`

Sequential client-side fetches create a waterfall:
1. Auth check
2. Trip data
3. Destinations
4. User preferences

**Impact:** 200-500ms additional delay

#### 4. No Optimistic UI for Common Actions

**Affected Interactions:**
- Save/unsave destination (shows spinner, then updates)
- Add to collection (waits for confirmation)
- Trip modifications (full round-trip)

**Impact:** Actions feel sluggish; optimistic hooks exist but underutilized

#### 5. Limited Route Prefetching

Only 3 routes are prefetched (`/cities`, `/city/tokyo`, `/city/london`). Popular destinations and user-specific routes are not prefetched.

**Impact:** Navigation feels slow on first visit to common pages

### Minor

#### 6. Skeleton Mismatch on Some Pages

- `/movement/[slug]` uses generic `<div>Loading...</div>`
- Some drawers lack skeleton content

#### 7. No Progressive Image Loading

Images jump from skeleton to full image. Blur placeholder or LQIP not implemented.

---

## Recommendations

### High Priority

#### 1. Add Suspense Boundaries to Critical Routes

**Effort:** Low | **Impact:** High

```typescript
// app/trips/page.tsx
import { Suspense } from 'react';
import { TripListSkeleton } from '@/components/ui/loading-states';

export default function TripsPage() {
  return (
    <Suspense fallback={<TripListSkeleton />}>
      <TripsContent />
    </Suspense>
  );
}
```

**Apply to:**
- `/trips` - Use `TripListSkeleton`
- `/account` - Use `ProfileHeaderSkeleton`
- `/collections` - Use `CollectionGridSkeleton`

#### 2. Implement Parallel Data Fetching

**Effort:** Medium | **Impact:** High

Replace sequential fetches with `Promise.all`:

```typescript
// Before (waterfall)
const trip = await fetchTrip(id);
const destinations = await fetchDestinations(trip.destinationIds);
const preferences = await fetchPreferences(userId);

// After (parallel)
const [trip, preferences] = await Promise.all([
  fetchTrip(id),
  fetchPreferences(userId),
]);
const destinations = await fetchDestinations(trip.destinationIds);
```

#### 3. Expand Optimistic Updates

**Effort:** Medium | **Impact:** High

The `useOptimisticToggle` and `useOptimisticList` hooks exist but are underutilized.

**Priority integrations:**
- Save/unsave destination button
- Add to trip action
- Collection management

```typescript
// Example: Save button with optimistic update
const { value: isSaved, toggle } = useOptimisticToggle({
  initialValue: destination.is_saved,
  onToggle: async (newValue) => {
    await toggleSavedPlace(destination.id, newValue);
  },
});
```

### Medium Priority

#### 4. Implement Smart Route Prefetching

**Effort:** Medium | **Impact:** Medium

```typescript
// components/DestinationCard.tsx
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function DestinationCard({ destination }) {
  const router = useRouter();

  // Prefetch on hover/focus
  const handleMouseEnter = () => {
    router.prefetch(`/destination/${destination.slug}`);
  };

  return (
    <Link
      href={`/destination/${destination.slug}`}
      onMouseEnter={handleMouseEnter}
    >
      ...
    </Link>
  );
}
```

**Also prefetch:**
- User's saved destinations
- Recently viewed cities
- Trending destinations

#### 5. Add Blur Placeholder for Images

**Effort:** Low | **Impact:** Medium

```typescript
<Image
  src={destination.image}
  placeholder="blur"
  blurDataURL={destination.blur_hash || FALLBACK_BLUR}
  // or use next/image's built-in placeholder="blur" for static imports
/>
```

**Requirements:**
- Generate blur hashes during image upload
- Store in `destinations.blur_hash` column
- Fallback to generic blur placeholder

#### 6. Standardize Loading States

**Effort:** Low | **Impact:** Low-Medium

Replace inconsistent loading patterns:

| Current | Replacement |
|---------|-------------|
| `<div>Loading...</div>` | Appropriate skeleton |
| Empty Suspense fallback | Minimal skeleton |
| Spinner-only | Context-aware skeleton |

### Lower Priority

#### 7. Consider Partial Prerendering (PPR)

Next.js 16 supports PPR (experimental). This could benefit the homepage:

```typescript
// next.config.ts
experimental: {
  ppr: true,
}
```

Static shell renders instantly; dynamic parts stream in.

#### 8. Implement View Transitions API

For smoother page transitions:

```typescript
// app/layout.tsx
<ViewTransitions>
  {children}
</ViewTransitions>
```

---

## Performance Metrics Baseline

Based on architecture analysis (actual metrics should be measured with Lighthouse/WebPageTest):

| Metric | Expected Range | Optimization Target |
|--------|----------------|---------------------|
| TTFB | 50-150ms | < 100ms (with CDN) |
| FCP | 400-800ms | < 500ms |
| LCP | 800-1500ms | < 1000ms |
| CLS | 0.05-0.15 | < 0.1 |
| INP | 100-250ms | < 200ms |

---

## Quick Wins Checklist

- [ ] Add Suspense to `/trips`, `/account`, `/collections`
- [ ] Replace `<div>Loading...</div>` in `/movement/[slug]`
- [ ] Enable optimistic toggle for save button
- [ ] Add hover prefetch to destination cards
- [ ] Implement blur placeholder for destination images
- [ ] Add `fetchPriority="high"` to hero images

---

## Conclusion

Urban Manual has a strong performance foundation with server-first rendering, comprehensive skeleton loading, and multi-layer caching. The main opportunities are:

1. **Better streaming** - More Suspense boundaries for progressive rendering
2. **Optimistic UI** - Leverage existing hooks for instant feedback
3. **Smarter prefetching** - Anticipate user navigation patterns
4. **Image experience** - Progressive loading with blur placeholders

Implementing the high-priority recommendations should noticeably improve perceived performance with relatively low effort.
