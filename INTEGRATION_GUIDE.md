# Integration Guide for Unused Features

This guide provides detailed implementation steps for integrating the 10 unused/unimplemented features discovered in the codebase.

## ✅ Completed Integrations

### 1. useUrlState - City Page Filters
**Status**: ✅ COMPLETED
**Branch**: `claude/find-unimplemented-features-012J4fXc5fs5Ztejiuy7tiMF`
**Commit**: `11bf14b`

**Integration**: Added URL-based filter persistence to `/app/city/[city]/page-client.tsx`
- Category filtering now synced to URL
- Pagination parameters in URL
- Michelin/Crown filters in URL
- Shareable filter links enabled

## 🔄 Remaining Integrations (Priority Order)

### 2. useTravelTime + itinerary-builder API (High Priority)
**Files**:
- Hook: `hooks/useTravelTime.ts` (91 lines, complete)
- API: `app/api/agents/itinerary-builder/route.ts` (80 lines, complete)
- Target: `app/trips/page.tsx`, trip planning components

**Implementation Steps**:

1. **In `/app/trips/page.tsx`** - Add travel time summary to trip list:
```typescript
// Add import
import { useTravelTime } from '@/hooks/useTravelTime';

// In trip card rendering (around line 200+)
function TripCard({ trip }: { trip: TripWithHealth }) {
  const [firstDest, setFirstDest] = useState(null);
  const [lastDest, setLastDest] = useState(null);

  // Get destinations for travel time calculation
  const travelTime = useTravelTime(firstDest, lastDest, 'driving');

  return (
    <div className="trip-card">
      {/* ... existing content ... */}
      {travelTime.minutes && (
        <div className="text-xs text-gray-500">
          {travelTime.minutes} min travel time
        </div>
      )}
    </div>
  );
}
```

2. **In `/components/trip/TripDaySection.tsx`** - Show travel time between days:
```typescript
import { useTravelTime } from '@/hooks/useTravelTime';

export function TripDaySection({ day, nextDayStart }) {
  const { minutes, loading } = useTravelTime(
    day.lastDestination,
    nextDayStart,
    'walking'
  );

  return (
    <div className="day-section">
      {/* Day content */}
      {minutes && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
          {minutes} minute walk to next day's first location
        </div>
      )}
    </div>
  );
}
```

3. **Create `/components/trip/ItineraryOptimizer.tsx`** - Call itinerary-builder API:
```typescript
'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface ItineraryOptimizerProps {
  destinations: any[];
  days: number;
  onOptimized: (optimizedItinerary: any) => void;
}

export function ItineraryOptimizer({ destinations, days, onOptimized }: ItineraryOptimizerProps) {
  const [optimizing, setOptimizing] = useState(false);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const response = await fetch('/api/agents/itinerary-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations: destinations.map(d => ({
            id: d.id,
            name: d.name,
            latitude: d.latitude,
            longitude: d.longitude,
            category: d.category,
          })),
          days,
          preferences: {},
        }),
      });

      const { itinerary } = await response.json();
      onOptimized(itinerary);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <button
      onClick={handleOptimize}
      disabled={optimizing}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center gap-2 hover:bg-blue-600 disabled:opacity-50"
    >
      <Sparkles className="w-4 h-4" />
      {optimizing ? 'Optimizing...' : 'Optimize Route'}
    </button>
  );
}
```

4. **Wire into trip detail page** (around line where itinerary is displayed):
```typescript
import { ItineraryOptimizer } from '@/components/trip/ItineraryOptimizer';

// In trip detail JSX
<ItineraryOptimizer
  destinations={tripDestinations}
  days={tripDays}
  onOptimized={(optimizedItinerary) => {
    // Apply optimized order to the trip
    updateItineraryOrder(optimizedItinerary);
  }}
/>
```

---

### 3. useOptimistic - Save/Like Operations (Medium Priority)
**Files**:
- Hook: `hooks/useOptimistic.ts` (150 lines, complete with variants)
- Target: `components/QuickActions.tsx`, `components/EnhancedSavedTab.tsx`

**Implementation Steps**:

1. **In `/components/QuickActions.tsx`** - Replace useQuickSave with useOptimistic:
```typescript
import { useOptimisticToggle } from '@/hooks/useOptimistic';

export function SaveButton({ destinationSlug, initialIsSaved }) {
  const { value: isSaved, isPending, toggle } = useOptimisticToggle({
    initialValue: initialIsSaved,
    onToggle: async (newValue) => {
      const response = await fetch('/api/saved-places', {
        method: newValue ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination_slug: destinationSlug }),
      });
      if (!response.ok) throw new Error('Failed to save');
    },
    onError: (error) => {
      showErrorToast(error.message);
    },
  });

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`transition-all ${isSaved ? 'bg-black' : 'bg-gray-200'}`}
    >
      {isPending ? <Loader /> : <Bookmark />}
    </button>
  );
}
```

2. **In `/components/EnhancedSavedTab.tsx`** - Add remove with optimistic updates:
```typescript
import { useOptimisticList } from '@/hooks/useOptimistic';

export function EnhancedSavedTab({ userId }) {
  const { items, addItem, removeItem, sync } = useOptimisticList({
    initialItems: savedPlaces,
    onRemove: async (placeId) => {
      const response = await fetch(`/api/saved-places/${placeId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove');
    },
    onError: (error) => {
      showErrorToast(`Failed to update: ${error.message}`);
    },
  });

  return (
    <div className="grid gap-4">
      {items.map(place => (
        <div key={place.id} className="relative group">
          <DestinationCard destination={place} />
          <button
            onClick={() => removeItem(place.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 text-white rounded-full"
            aria-label="Remove from saved"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

### 4. useVirtualization - Large Lists (High Priority for Performance)
**Files**:
- Hook: `hooks/useVirtualization.ts` (262 lines, complete with grid support)
- Target: `app/page.tsx`, `app/city/[city]/page-client.tsx`, `components/EnhancedSavedTab.tsx`

**Implementation Steps**:

1. **Update `/components/UniversalGrid.tsx`** to support virtualization:
```typescript
import { useVirtualGrid } from '@/hooks/useVirtualization';

export function UniversalGrid({ items, renderItem, columnCount = 4 }) {
  const { virtualItems, totalHeight, containerRef, scrollToIndex } = useVirtualGrid({
    items,
    rowHeight: 320, // Adjust based on card + gap height
    columnCount,
    overscan: 2,
  });

  return (
    <div
      ref={containerRef}
      style={{ height: '600px', overflow: 'auto' }}
      className="w-full"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, key, offsetTop, columnOffset }) => (
          <div
            key={key}
            style={{
              position: 'absolute',
              top: offsetTop,
              left: columnOffset,
              width: `${100 / columnCount}%`,
            }}
          >
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

2. **In `/app/city/[city]/page-client.tsx`** - Replace pagination with virtualization:
```typescript
import { useVirtualization } from '@/hooks/useVirtualization';

// Remove pagination, use virtualization instead
const { virtualItems, totalHeight, containerRef } = useVirtualization({
  items: filteredDestinations,
  itemHeight: 380, // Card + gap height
  overscan: 3,
  containerHeight: 800,
});

// Render virtual items instead of paginated items
<div ref={containerRef} style={{ height: '800px', overflow: 'auto' }}>
  <div style={{ height: totalHeight, position: 'relative' }}>
    {virtualItems.map(({ item, offsetTop, index }) => (
      <div
        key={item.slug}
        style={{ position: 'absolute', top: offsetTop }}
      >
        <DestinationCard destination={item} />
      </div>
    ))}
  </div>
</div>
```

---

### 5. useRememberMe - Persistent Login (Medium Priority for UX)
**Files**:
- Hook: `hooks/useRememberMe.ts` (230 lines, complete)
- Target: Login components, auth flow

**Implementation Steps**:

1. **Create `/components/auth/LoginForm.tsx`** with remember-me checkbox:
```typescript
import { useRememberMe } from '@/hooks/useRememberMe';

export function LoginForm() {
  const { state, toggle } = useRememberMe();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (email, password) => {
    setLoading(true);
    try {
      // Perform login
      const result = await supabase.auth.signInWithPassword({ email, password });

      if (result.data.user && state.enabled) {
        // Enable remember me after successful login
        toggle(); // This will persist the preference
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(email, password);
    }}>
      {/* Email and password inputs */}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={() => toggle()}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm text-gray-600">Trust this device</span>
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
```

2. **In `/app/layout.tsx`** - Check for extended session:
```typescript
import { useRememberMe } from '@/hooks/useRememberMe';

export default function RootLayout({ children }) {
  const { shouldExtendSession, markSessionExtended } = useRememberMe();

  useEffect(() => {
    // On app load, check if session should be extended
    if (shouldExtendSession()) {
      // Extend the Supabase session
      supabase.auth.refreshSession();
      markSessionExtended();
    }
  }, []);

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

---

### 6. useCsrf - CSRF Protection (High Priority for Security)
**Files**:
- Hook: `hooks/useCsrf.ts` (118 lines, complete)
- Util: `lib/security/csrf.ts`
- Target: All POST/PUT/DELETE API calls

**Implementation Steps**:

1. **Create `/lib/api-client.ts`** - Centralized API wrapper:
```typescript
import { useCsrf } from '@/hooks/useCsrf';

export function useApiClient() {
  const { token, loading } = useCsrf();

  const request = async (
    url: string,
    options: RequestInit & { method?: string } = {}
  ) => {
    const headers = new Headers(options.headers);

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || '')) {
      if (token) {
        headers.set('X-CSRF-Token', token);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  };

  return { request, loading };
}
```

2. **Update components to use centralized client**:
```typescript
// Before: Direct fetch with no CSRF protection
await fetch('/api/collections', {
  method: 'POST',
  body: JSON.stringify(data),
});

// After: Using useApiClient
const { request } = useApiClient();
await request('/api/collections', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

---

### 7. useIsMobile - Responsive Behavior (Low Priority, mostly via Tailwind)
**Files**:
- Hook: `hooks/useIsMobile.ts` (19 lines, simple)
- Target: Layout components that need mobile-specific logic

**Implementation Steps**:

1. **In `/components/Header.tsx`** - Conditional search display:
```typescript
import { useIsMobile } from '@/hooks/useIsMobile';

export function Header() {
  const isMobile = useIsMobile();

  return (
    <header className="flex items-center justify-between p-4">
      <Logo />

      {/* Search - Full on desktop, icon-only on mobile */}
      {isMobile ? (
        <button className="p-2" onClick={() => openSearchModal()}>
          <Search className="w-5 h-5" />
        </button>
      ) : (
        <SearchBar className="flex-1 mx-8" />
      )}

      <Nav />
    </header>
  );
}
```

2. **In modal dialogs** - Full-screen on mobile:
```typescript
export function Modal({ isOpen, children }) {
  const isMobile = useIsMobile();

  return (
    <dialog
      className={`
        backdrop-blur-sm
        ${isMobile
          ? 'fixed inset-0 rounded-none'
          : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl max-w-2xl'
        }
      `}
    >
      {children}
    </dialog>
  );
}
```

---

### 8. useCollections - Collection Management (Medium Priority)
**Files**:
- Hook: `hooks/useCollections.ts` (149 lines, complete)
- Target: `/app/account/page.tsx`, `/app/collection/[id]/page.tsx`

**Implementation Steps**:

1. **In `/app/account/page.tsx`** - Use hook for collections management:
```typescript
import { useCollections } from '@/hooks/useCollections';

export function AccountPage() {
  const { user } = useAuth();
  const {
    collections,
    loading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useCollections(user?.id);

  return (
    <div>
      <div className="collections-list">
        {collections.map(collection => (
          <CollectionCard
            key={collection.id}
            collection={collection}
            onUpdate={(updates) => updateCollection(collection.id, updates)}
            onDelete={() => deleteCollection(collection.id)}
          />
        ))}
      </div>

      <button onClick={() => {
        const name = prompt('Collection name:');
        if (name) createCollection({ name });
      }}>
        Create Collection
      </button>
    </div>
  );
}
```

---

### 9. useUrlState - Search Page (Medium Priority)
**Files**:
- Hook: `hooks/useUrlState.ts` (210 lines, complete)
- Target: `/app/search/page.tsx`, filter pages

**Implementation Steps**:

```typescript
import { useUrlState } from '@/hooks/useUrlState';

export function SearchPage() {
  const { state, setParam, setState } = useUrlState({
    defaults: {
      q: '',
      sort: 'relevant',
      budget: 'any',
      page: '1',
    },
  });

  return (
    <div>
      <SearchInput
        value={state.q}
        onChange={(q) => setParam('q', q)}
      />

      <SortDropdown
        value={state.sort}
        onChange={(sort) => setParam('sort', sort)}
      />

      <BudgetFilter
        value={state.budget}
        onChange={(budget) => setParam('budget', budget)}
      />

      {/* Results paginated with URL state */}
      <Results
        query={state.q}
        page={parseInt(state.page)}
        onPageChange={(page) => setParam('page', String(page))}
      />
    </div>
  );
}
```

---

### 10. Proactive Recommendations API (Low Priority - Feature Enhancement)
**Files**:
- API: `/app/api/agents/proactive-recommendations/route.ts` (150 lines, complete)
- Target: Trip planning, discovery features

**Implementation Steps**:

1. **Create `/components/trip/SmartSuggestions.tsx`** - Call recommendations:
```typescript
'use client';

import { useState, useEffect } from 'react';

export function SmartSuggestions({ tripContext, location }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/agents/proactive-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: { lat: location.latitude, lng: location.longitude },
          context: {
            tripDays: tripContext.days,
            travelersCount: tripContext.travelers,
            budget: tripContext.budget,
            preferences: tripContext.preferences,
          },
        }),
      });

      const { suggestions: data } = await response.json();
      setSuggestions(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={fetchSuggestions}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        {loading ? 'Getting suggestions...' : 'Get Smart Suggestions'}
      </button>

      <div className="grid gap-4">
        {suggestions.map(suggestion => (
          <DestinationCard
            key={suggestion.destination.id}
            destination={suggestion.destination}
            subtitle={suggestion.reason}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Integration Checklist

- [ ] ✅ useUrlState - City page filters (COMPLETED)
- [ ] useTravelTime + itinerary-builder API
- [ ] useOptimistic - Save/Like operations
- [ ] useVirtualization - Large lists
- [ ] useRememberMe - Persistent login
- [ ] useCsrf - CSRF protection
- [ ] useIsMobile - Responsive layouts
- [ ] useCollections - Collection management
- [ ] useUrlState - Search page
- [ ] Proactive recommendations API

## Testing Checklist Per Integration

Each integration should be tested for:
- [ ] Functionality works as expected
- [ ] Error states handled gracefully
- [ ] Loading states display correctly
- [ ] No console errors
- [ ] TypeScript types correct
- [ ] Mobile responsive
- [ ] Accessibility (a11y) maintained

## Next Steps

1. Pick highest priority integrations from the checklist
2. Implement following the detailed steps above
3. Test thoroughly
4. Commit to feature branch
5. Create PR with detailed description
