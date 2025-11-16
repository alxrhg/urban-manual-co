# Refactoring Roadmap - Technical Implementation Guide
**Date:** November 16, 2025  
**Companion Document to:** PROJECT_REBUILD_PLAN.md  
**Status:** Ready for Implementation

---

## Overview

This document provides detailed technical implementation guidance for the phased refactoring approach recommended in `PROJECT_REBUILD_PLAN.md`.

---

## Phase 1: Quick Wins (Week 1-2)

### 1.1 Fix "Open in New Tab" Link

**Files to Modify:**
- `src/features/detail/DestinationDrawer.tsx` (line ~680)
- `components/DestinationDrawer.tsx` (if exists)

**Current Code:**
```tsx
<button
  onClick={() => {
    onClose();
    router.push(`/destination/${destination.slug}`);
  }}
  className="..."
>
  <ExternalLink className="h-5 w-5" />
</button>
```

**Fixed Code:**
```tsx
<a
  href={`/destination/${destination.slug}`}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => {
    e.stopPropagation();
  }}
  className="inline-flex items-center justify-center gap-2 ..."
>
  <ExternalLink className="h-5 w-5" />
</a>
```

**Testing:**
1. Open homepage
2. Click on any destination
3. Click "Open in New Tab" icon
4. Verify new tab opens with destination page

---

### 1.2 Fix Pagination Centering

**File to Modify:**
- `app/page.tsx` (line ~904)

**Current Code:**
```tsx
<div className="mt-8 flex items-center justify-center gap-2">
```

**Investigation Steps:**
1. Check parent container layout
2. Verify grid alignment
3. Test on mobile and desktop

**Possible Solutions:**
```tsx
// Option 1: Full width
<div className="mt-8 flex items-center justify-center gap-2 w-full">

// Option 2: Centered with max-width
<div className="mt-8 mx-auto flex items-center justify-center gap-2 max-w-fit">

// Option 3: Explicit centering
<div className="mt-8 flex items-center justify-center gap-2">
  <div className="mx-auto flex items-center gap-2">
    {/* pagination controls */}
  </div>
</div>
```

---

### 1.3 Unify Drawer Components

**Problem:** Two different drawer implementations
- `src/features/detail/DestinationDrawer.tsx` (homepage)
- `components/DestinationDrawer.tsx` (individual pages)

**Solution:**

#### Option A: Consolidate into Single Component (Recommended)
1. Compare both implementations
2. Identify unique features in each
3. Create unified component with feature flags
4. Replace all usages
5. Remove duplicate component

```tsx
// components/DestinationDrawer.tsx (unified)
interface DestinationDrawerProps {
  destination: Destination;
  onClose: () => void;
  variant?: 'homepage' | 'detail'; // Feature flag for context-specific behavior
  showFullDetails?: boolean;
}

export function DestinationDrawer({
  destination,
  onClose,
  variant = 'detail',
  showFullDetails = true,
}: DestinationDrawerProps) {
  // Unified implementation
}
```

#### Option B: Shared Base Component
1. Create `DestinationDrawerBase` with common logic
2. Extend for homepage and detail variants
3. Gradually merge as features align

**Migration Steps:**
1. Create unified component
2. Update homepage to use new component
3. Update detail pages to use new component
4. Remove old implementations
5. Test all use cases

---

### 1.4 Apple MapKit Documentation & Fallback

**File to Create/Modify:**
- `.env.local.example` (add MapKit variables)
- `MAPKIT_SETUP.md` (update with clearer instructions)
- Map component (add fallback UI)

**Environment Variables to Add:**
```bash
# Apple MapKit JS Configuration (Optional - required for Apple Maps)
# Get these from https://developer.apple.com/
NEXT_PUBLIC_MAPKIT_TEAM_ID=your-team-id
NEXT_PUBLIC_MAPKIT_JS_KEY=your-mapkit-key
MAPKIT_KEY_ID=your-key-id
MAPKIT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

**Fallback UI Component:**
```tsx
// components/maps/MapFallback.tsx
export function MapFallback({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="text-center p-8">
        <MapIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <a
          href="/docs/map-setup"
          className="mt-4 inline-flex items-center text-sm text-blue-600 hover:underline"
        >
          Learn how to set up maps →
        </a>
      </div>
    </div>
  );
}
```

---

### 1.5 TypeScript `any` Types - Critical Files

**Priority Files to Fix:**

1. **app/page.tsx**
   - Lines: 765, 771, 780, 785, 851, 946, 971, 1061, 1081, 1148, 1349, 1358
   - Define proper interfaces for state and API responses

2. **app/admin/searches/page.tsx**
   - Lines: 11, 43, 44
   - Define SearchResult interface

3. **app/api/account/brand-affinity/route.ts**
   - Lines: 35, 46, 82
   - Define BrandAffinityData interface

4. **app/api/account/insights/route.ts**
   - Lines: 36, 37, 71, 76, 86, 96, 120, 145
   - Define InsightData, UserVisit, SeasonalEvent interfaces

**Example Fix:**
```typescript
// Before
const [data, setData] = useState<any>(null);

// After
interface DestinationData {
  id: string;
  name: string;
  slug: string;
  // ... other fields
}

const [data, setData] = useState<DestinationData | null>(null);
```

---

### 1.6 Remove Unused Variables

**Files with Unused Variables:**
Run this command to find all:
```bash
npm run lint 2>&1 | grep "is assigned a value but never used"
```

**Automated Fix:**
```bash
# Use ESLint autofix for safe removals
npx eslint --fix app/ components/ lib/ src/
```

**Manual Review Required:**
- Variables that might be used in future features
- Debug/development variables
- Variables that are part of public API

---

### 1.7 Dependency Updates

**Safe Updates:**
```bash
# Supabase
npm install @supabase/supabase-js@latest @supabase/ssr@latest

# Google Generative AI
npm install @google/generative-ai@latest

# Radix UI components
npm install @radix-ui/react-dropdown-menu@latest
npm install @radix-ui/react-label@latest
npm install @radix-ui/react-select@latest
npm install @radix-ui/react-slot@latest
npm install @radix-ui/react-switch@latest
npm install @radix-ui/react-tabs@latest
npm install @radix-ui/react-toggle-group@latest

# Other safe updates
npm install @amcharts/amcharts5@latest
npm install isomorphic-dompurify@latest
npm install sharp@latest
npm install eslint@latest
npm install eslint-config-next@latest
```

**Verification After Updates:**
```bash
npm run lint
npm run build
npm run test:unit
```

---

## Phase 2: Code Quality & Refactoring (Week 3-6)

### 2.1 Documentation Consolidation

**Current State:** 100+ markdown files in root directory

**Target Structure:**
```
/
├── README.md (main documentation)
├── CONTRIBUTING.md
├── CHANGELOG.md
├── PROJECT_REBUILD_PLAN.md
├── REFACTORING_ROADMAP.md
├── docs/
│   ├── setup/
│   │   ├── environment.md
│   │   ├── database.md
│   │   └── deployment.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── tech-stack.md
│   │   └── api-design.md
│   ├── features/
│   │   ├── ai-chat.md
│   │   ├── real-time-intelligence.md
│   │   └── ml-recommendations.md
│   ├── development/
│   │   ├── code-style.md
│   │   ├── testing.md
│   │   └── debugging.md
│   └── archive/
│       ├── migration-guides/
│       ├── historical/
│       └── deprecated/
```

**Migration Script:**
```bash
#!/bin/bash
# scripts/organize-docs.sh

mkdir -p docs/setup docs/architecture docs/features docs/development docs/archive/{migration-guides,historical,deprecated}

# Move setup guides
mv SUPABASE_*.md docs/setup/
mv *_SETUP.md docs/setup/
mv ENVIRONMENT_*.md docs/setup/

# Move architecture docs
mv TECH_STACK_*.md docs/architecture/
mv ARCHITECTURE_*.md docs/architecture/

# Move feature docs
mv *_PLAN.md docs/features/
mv *_IMPLEMENTATION.md docs/features/

# Move historical docs
mv MIGRATION_*.md docs/archive/migration-guides/
mv *_SUMMARY.md docs/archive/historical/
mv *_COMPLETE.md docs/archive/historical/

echo "Documentation reorganized successfully!"
```

---

### 2.2 Extract Shared Utilities

**Identify Common Patterns:**
```bash
# Find duplicate code
npx jscpd lib/ app/ components/ --min-lines 10
```

**Common Utilities to Extract:**

1. **Date Formatting**
```typescript
// lib/utils/date.ts
export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  // Implementation
}

export function getRelativeTime(date: Date | string): string {
  // Implementation
}
```

2. **API Error Handling**
```typescript
// lib/utils/api-error.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown): Response {
  // Standardized error handling
}
```

3. **Data Validation**
```typescript
// lib/utils/validation.ts
import { z } from 'zod';

export const DestinationSchema = z.object({
  // ...
});

export const UserPreferencesSchema = z.object({
  // ...
});
```

---

### 2.3 Create Reusable Hooks

**Common Patterns to Extract:**

1. **useDestination** - Fetch and manage destination data
2. **useUser** - User data and authentication
3. **useFilters** - Search and filter state
4. **useLocalStorage** - Type-safe local storage
5. **useDebounce** - Debounced values
6. **useIntersectionObserver** - Lazy loading

**Example:**
```typescript
// hooks/useDestination.ts
export function useDestination(slug: string) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['destination', slug],
    queryFn: () => fetchDestination(slug),
  });

  return {
    destination: data,
    error,
    isLoading,
  };
}
```

---

### 2.4 Testing Infrastructure

**Setup Testing Tools:**
```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Create Test Structure:**
```
tests/
├── unit/
│   ├── utils/
│   ├── hooks/
│   └── components/
├── integration/
│   ├── api/
│   └── features/
└── e2e/
    ├── auth.spec.ts
    ├── search.spec.ts
    └── destination.spec.ts
```

**Example Unit Test:**
```typescript
// tests/unit/utils/date.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, getRelativeTime } from '@/lib/utils/date';

describe('formatDate', () => {
  it('formats date in short format', () => {
    const date = new Date('2025-01-15');
    expect(formatDate(date, 'short')).toBe('Jan 15, 2025');
  });

  it('formats date in long format', () => {
    const date = new Date('2025-01-15');
    expect(formatDate(date, 'long')).toBe('January 15, 2025');
  });
});
```

---

### 2.5 Performance Optimization

**Filter Data Loading:**
```typescript
// app/page.tsx
export default async function HomePage() {
  // Load filters first (fast)
  const filters = await getFilters();
  
  return (
    <div>
      <SearchFilters filters={filters} />
      <Suspense fallback={<DestinationsSkeleton />}>
        <DestinationsGrid />
      </Suspense>
    </div>
  );
}

async function DestinationsGrid() {
  // Load destinations (slower)
  const destinations = await getDestinations();
  return <Grid destinations={destinations} />;
}
```

**Bundle Analysis:**
```bash
# Add to package.json scripts
"analyze": "ANALYZE=true next build"

# Run analysis
npm run analyze
```

**Code Splitting:**
```typescript
// Dynamic imports for heavy components
const MapView = dynamic(() => import('@/components/MapView'), {
  loading: () => <MapSkeleton />,
  ssr: false,
});

const AIChat = dynamic(() => import('@/components/AIChat'), {
  loading: () => <ChatSkeleton />,
});
```

---

## Phase 3: Architecture Enhancements (Week 7-12)

### 3.1 TanStack Query Migration (v4 → v5)

**Breaking Changes:**
- Query keys are now required to be arrays
- `useQuery` result is no longer nullable by default
- `onSuccess`, `onError`, `onSettled` callbacks removed
- New `placeholderData` API

**Migration Steps:**

1. **Update Dependencies**
```bash
npm install @tanstack/react-query@latest
```

2. **Update Query Keys**
```typescript
// Before (v4)
useQuery('destinations', fetchDestinations);

// After (v5)
useQuery({
  queryKey: ['destinations'],
  queryFn: fetchDestinations,
});
```

3. **Update Callbacks**
```typescript
// Before (v4)
useQuery(['user'], fetchUser, {
  onSuccess: (data) => {
    console.log('Success:', data);
  },
});

// After (v5)
const { data } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
});

useEffect(() => {
  if (data) {
    console.log('Success:', data);
  }
}, [data]);
```

4. **Run Migration Script**
```bash
# TanStack provides a codemod
npx @tanstack/query-migrate-to-v5
```

---

### 3.2 Real-Time Intelligence UI Completion

**Components to Build:**

1. **CrowdingIndicator.tsx**
```typescript
interface CrowdingIndicatorProps {
  level: 'low' | 'medium' | 'high';
  trend?: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

export function CrowdingIndicator({ level, trend, lastUpdated }: CrowdingIndicatorProps) {
  // Implementation with visual indicators
}
```

2. **WaitTimeDisplay.tsx**
```typescript
interface WaitTimeDisplayProps {
  estimatedMinutes: number;
  confidence: number;
  recentReports: number;
}

export function WaitTimeDisplay({ estimatedMinutes, confidence, recentReports }: WaitTimeDisplayProps) {
  // Implementation with time estimate and confidence
}
```

3. **AlertNotifications.tsx**
```typescript
interface AlertNotificationsProps {
  userId: string;
  preferences: NotificationPreferences;
}

export function AlertNotifications({ userId, preferences }: AlertNotificationsProps) {
  // Implementation with push notifications
}
```

---

### 3.3 CI/CD Pipeline Setup

**GitHub Actions Workflow:**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
```

---

### 3.4 Error Monitoring Setup

**Option 1: Sentry (Recommended)**
```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Option 2: LogRocket**
```bash
npm install logrocket
```

---

## Phase 4: Advanced Features (Week 13-24)

### 4.1 Transportation Integration

**API Integrations:**
- Skyscanner API (flights)
- Rome2Rio API (multi-modal)
- Google Directions API (routing)

**Database Schema:**
```sql
CREATE TABLE transportation_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_destination_id UUID REFERENCES destinations(id),
  to_destination_id UUID REFERENCES destinations(id),
  mode VARCHAR(50), -- flight, train, bus, car
  duration_minutes INTEGER,
  cost_estimate JSONB,
  providers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4.2 Social Features

**Real-Time Trip Editing:**
```typescript
// Use Supabase Realtime
const channel = supabase.channel('trip-edits')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'trips',
    filter: `id=eq.${tripId}`,
  }, (payload) => {
    // Handle real-time updates
  })
  .subscribe();
```

---

### 4.3 User-Generated Content

**Photo Upload System:**
```typescript
// lib/storage/photos.ts
export async function uploadPhoto(
  file: File,
  destinationId: string,
  userId: string
): Promise<{ url: string; id: string }> {
  // 1. Validate file
  // 2. Optimize image
  // 3. Upload to Supabase Storage
  // 4. Create database record
  // 5. Return URL and ID
}
```

---

## Testing Strategy

### Unit Tests
- All utility functions
- All custom hooks
- Complex components

### Integration Tests
- API routes
- Database operations
- Authentication flows

### E2E Tests
- Critical user journeys
- Search and filter
- Destination details
- User account

---

## Success Metrics

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] Zero `any` types in production code
- [ ] 80%+ test coverage
- [ ] Zero high-severity lint errors

### Performance
- [ ] Lighthouse score 90+ (Performance)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 200KB (gzipped)

### Developer Experience
- [ ] CI/CD pipeline < 5 min
- [ ] Hot reload < 1s
- [ ] Clear documentation
- [ ] Easy local setup

---

## Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 1-2 weeks | Quick wins, immediate value |
| Phase 2 | 3-4 weeks | Code quality, testing |
| Phase 3 | 4-6 weeks | Architecture, dependencies |
| Phase 4 | 8-12 weeks | New features (optional) |

**Total: 3-6 months** (excluding Phase 4)

---

## Next Actions

1. ✅ Review this roadmap with team
2. ⬜ Create GitHub issues for Phase 1 tasks
3. ⬜ Set up project board
4. ⬜ Begin Phase 1 implementation
5. ⬜ Schedule weekly reviews

---

**Document Owner:** Engineering Team  
**Last Updated:** November 16, 2025  
**Status:** Ready for Implementation
