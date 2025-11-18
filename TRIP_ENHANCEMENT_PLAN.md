# Trip Feature Enhancement Plan
## Inspired by AdventureLog, Built for Urban Manual

This document outlines a phased approach to enhance Urban Manual's trip planning feature by selectively adopting the best ideas from AdventureLog while maintaining compatibility with our existing Next.js/Supabase stack.

## Decision: Do NOT Fork AdventureLog

After careful analysis, we recommend **NOT** forking AdventureLog for the following reasons:

1. **Tech Stack Incompatibility**: AdventureLog uses SvelteKit + Django, we use Next.js + Supabase
2. **License Conflict**: GPL-3.0 vs our MIT license
3. **Architecture Mismatch**: Self-hosted vs cloud-native
4. **Design Philosophy**: Our editorial, curated approach differs from their functional tracker
5. **Existing Investment**: We have a solid trip feature that needs enhancement, not replacement

## What We'll Build Instead

We'll enhance our existing trip feature with AdventureLog's best ideas, implemented in our stack.

---

## Phase 1: Packing Lists (Quick Win)

### Why First?
- UI component already exists (`TripPackingList.tsx`)
- High user value
- Simple implementation
- No complex dependencies

### Database Changes

```sql
-- New table for packing lists
CREATE TABLE IF NOT EXISTS packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Packing List',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New table for packing list items
CREATE TABLE IF NOT EXISTS packing_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  category VARCHAR(100), -- e.g., 'Clothing', 'Electronics', 'Documents'
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  is_checked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_packing_lists_trip_id ON packing_lists(trip_id);
CREATE INDEX idx_packing_list_items_list_id ON packing_list_items(packing_list_id);

-- RLS Policies (inherit from trip permissions)
ALTER TABLE packing_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage packing lists for their trips"
  ON packing_lists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = packing_lists.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage packing list items"
  ON packing_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM packing_lists pl
      JOIN trips t ON t.id = pl.trip_id
      WHERE pl.id = packing_list_items.packing_list_id
      AND t.user_id = auth.uid()
    )
  );
```

### TypeScript Types

```typescript
// types/packing-list.ts
export interface PackingList {
  id: string;
  trip_id: string;
  name: string;
  created_at: string;
}

export interface PackingListItem {
  id: string;
  packing_list_id: string;
  category: string | null;
  item_name: string;
  quantity: number;
  is_checked: boolean;
  notes: string | null;
  created_at: string;
}
```

### Implementation Tasks
- [ ] Create migration file
- [ ] Add TypeScript types
- [ ] Update TripPackingList component to use real data
- [ ] Add API routes/tRPC procedures
- [ ] Test CRUD operations
- [ ] Add default categories (Clothing, Toiletries, Electronics, Documents, Other)

### Estimated Effort
**2-3 hours**

---

## Phase 2: Trip Collections

### Why Second?
- Organizes multiple trips (e.g., "Europe 2024", "Asia Adventures")
- Improves UX for frequent travelers
- Foundation for advanced features

### Database Changes

```sql
-- New table for trip collections
CREATE TABLE IF NOT EXISTS trip_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50), -- For visual differentiation
  icon VARCHAR(50), -- Icon identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add collection_id to trips table
ALTER TABLE trips ADD COLUMN collection_id UUID REFERENCES trip_collections(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_trip_collections_user_id ON trip_collections(user_id);
CREATE INDEX idx_trips_collection_id ON trips(collection_id);

-- RLS
ALTER TABLE trip_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own collections"
  ON trip_collections FOR ALL
  USING (auth.uid() = user_id);
```

### TypeScript Types

```typescript
// types/trip.ts - add to existing file
export interface TripCollection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

// Update Trip interface
export interface Trip {
  // ... existing fields ...
  collection_id: string | null;
}
```

### UI Changes
- Add "Collections" tab in TripsDrawer
- Allow grouping trips by collection
- Add collection selector in TripPlanner
- Collection management modal (create/edit/delete)

### Implementation Tasks
- [ ] Create migration file
- [ ] Update Trip type
- [ ] Add TripCollection type
- [ ] Add collection selector to TripPlanner
- [ ] Add collections view to TripsDrawer
- [ ] Add collection management UI
- [ ] Update API routes/tRPC

### Estimated Effort
**4-5 hours**

---

## Phase 3: Enhanced Sharing & Collaboration

### Why Third?
- Natural progression after collections
- High value for group travel
- Builds on existing is_public flag

### Database Changes

```sql
-- New table for trip shares
CREATE TABLE IF NOT EXISTS trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view' or 'edit'
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, shared_with_user_id)
);

-- Indexes
CREATE INDEX idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX idx_trip_shares_shared_with ON trip_shares(shared_with_user_id);

-- RLS
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares they created or received"
  ON trip_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

CREATE POLICY "Trip owners can manage shares"
  ON trip_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_shares.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Update trip policies to include shared trips
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
CREATE POLICY "Users can view their own and shared trips"
  ON trips FOR SELECT
  USING (
    auth.uid() = user_id OR
    is_public = TRUE OR
    EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_shares.trip_id = trips.id
      AND trip_shares.shared_with_user_id = auth.uid()
    )
  );

-- Similar updates for UPDATE policy with permission check
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
CREATE POLICY "Users can update owned or editable trips"
  ON trips FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM trip_shares
      WHERE trip_shares.trip_id = trips.id
      AND trip_shares.shared_with_user_id = auth.uid()
      AND trip_shares.permission_level = 'edit'
    )
  );
```

### TypeScript Types

```typescript
// types/trip.ts - add to existing file
export interface TripShare {
  id: string;
  trip_id: string;
  shared_with_user_id: string;
  permission_level: 'view' | 'edit';
  shared_by_user_id: string;
  created_at: string;
}
```

### UI Changes
- Enhance TripShareModal to support user-specific sharing
- Add "Shared with me" section in TripsDrawer
- Show collaborators in trip view
- Add permission indicators (view/edit)
- Email invitation system (optional)

### Implementation Tasks
- [ ] Create migration file
- [ ] Add TripShare type
- [ ] Update RLS policies for trips and itinerary_items
- [ ] Enhance TripShareModal component
- [ ] Add shared trips view
- [ ] Add collaborator list in trip view
- [ ] Add API routes for sharing operations
- [ ] Test permissions thoroughly

### Estimated Effort
**6-8 hours**

---

## Phase 4: File Attachments

### Why Fourth?
- Enables richer trip documentation
- Natural after collaboration (shared files)
- Uses Supabase Storage (already available)

### Database Changes

```sql
-- New table for trip attachments
CREATE TABLE IF NOT EXISTS trip_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  itinerary_item_id UUID REFERENCES itinerary_items(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL, -- MIME type
  file_size INTEGER, -- bytes
  storage_path VARCHAR(500) NOT NULL, -- Supabase Storage path
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT attachment_belongs_to_trip_or_item CHECK (
    (trip_id IS NOT NULL AND itinerary_item_id IS NULL) OR
    (trip_id IS NULL AND itinerary_item_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_trip_attachments_trip_id ON trip_attachments(trip_id);
CREATE INDEX idx_trip_attachments_item_id ON trip_attachments(itinerary_item_id);

-- RLS
ALTER TABLE trip_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for accessible trips"
  ON trip_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE (trips.id = trip_attachments.trip_id AND (
        trips.user_id = auth.uid() OR
        trips.is_public = TRUE OR
        EXISTS (
          SELECT 1 FROM trip_shares
          WHERE trip_shares.trip_id = trips.id
          AND trip_shares.shared_with_user_id = auth.uid()
        )
      )) OR EXISTS (
        SELECT 1 FROM itinerary_items ii
        JOIN trips t ON t.id = ii.trip_id
        WHERE ii.id = trip_attachments.itinerary_item_id
        AND (t.user_id = auth.uid() OR t.is_public = TRUE)
      )
    )
  );

CREATE POLICY "Users can upload attachments to their trips"
  ON trip_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_attachments.trip_id
      AND trips.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM itinerary_items ii
      JOIN trips t ON t.id = ii.trip_id
      WHERE ii.id = trip_attachments.itinerary_item_id
      AND t.user_id = auth.uid()
    )
  );
```

### Supabase Storage Setup

```typescript
// Create bucket for trip attachments
// Run this as admin or via Supabase dashboard

// Bucket name: 'trip-attachments'
// Public: false
// Allowed MIME types: images/*, application/pdf, etc.
// Max file size: 10MB
```

### TypeScript Types

```typescript
// types/trip.ts - add to existing file
export interface TripAttachment {
  id: string;
  trip_id: string | null;
  itinerary_item_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
}
```

### UI Changes
- Add attachment upload button in TripPlanner
- Add attachment section in itinerary items
- File preview for images/PDFs
- Download functionality
- Delete attachments

### Implementation Tasks
- [ ] Create migration file
- [ ] Create Supabase Storage bucket
- [ ] Add TripAttachment type
- [ ] Add file upload component
- [ ] Add attachment display component
- [ ] Add API routes for upload/download/delete
- [ ] Add file size/type validation
- [ ] Add loading states and error handling

### Estimated Effort
**6-8 hours**

---

## Phase 5: Better Time Support

### Why Fifth?
- Foundation feature, but less visible to users
- Important for international travelers
- Can be done without UI disruption

### Database Changes

```sql
-- Add timezone support to itinerary_items
ALTER TABLE itinerary_items 
  ADD COLUMN start_time TIMESTAMPTZ,
  ADD COLUMN end_time TIMESTAMPTZ,
  ADD COLUMN timezone VARCHAR(100);

-- Migrate existing time data (approximate)
-- This is a one-time migration helper
UPDATE itinerary_items 
SET start_time = CASE 
  WHEN time IS NOT NULL THEN 
    (CURRENT_DATE || ' ' || time)::TIMESTAMPTZ
  ELSE NULL
END;

-- Can keep the old 'time' field for now for backwards compatibility
-- Or drop it after migration: ALTER TABLE itinerary_items DROP COLUMN time;
```

### TypeScript Types

```typescript
// types/trip.ts - update ItineraryItem
export interface ItineraryItem {
  id: string;
  trip_id: string;
  destination_slug: string | null;
  day: number;
  order_index: number;
  
  // Old time field (deprecated)
  time: string | null;
  
  // New time fields
  start_time: string | null; // ISO 8601 with timezone
  end_time: string | null;   // ISO 8601 with timezone
  timezone: string | null;   // e.g., 'America/New_York'
  
  title: string;
  description: string | null;
  notes: string | null;
  created_at: string;
}
```

### UI Changes
- Update time picker to use proper datetime input
- Add timezone selector
- Show duration when both start/end times set
- Auto-detect timezone from destination (optional)

### Implementation Tasks
- [ ] Create migration file
- [ ] Update ItineraryItem type
- [ ] Add timezone utility functions
- [ ] Update TripDay component for new time format
- [ ] Update AddLocationToTrip for time selection
- [ ] Add timezone selector (using standard tz database)
- [ ] Test across different timezones

### Estimated Effort
**4-5 hours**

---

## Phase 6: Data Export (Optional)

### Why Last?
- Nice-to-have feature
- Less critical for MVP
- Can be added based on user demand

### Implementation Ideas

```typescript
// API endpoint: /api/trips/[tripId]/export

export async function exportTripAsJSON(tripId: string) {
  // Fetch trip, itinerary items, packing lists, attachments
  // Return comprehensive JSON
}

export async function exportTripAsPDF(tripId: string) {
  // Generate PDF itinerary using a library like pdf-lib or puppeteer
  // Include all trip details, map, images
}

export async function exportTripAsICS(tripId: string) {
  // Generate calendar file for itinerary items
  // Can import to Google Calendar, Apple Calendar, etc.
}
```

### Implementation Tasks
- [ ] Add JSON export endpoint
- [ ] Add ICS (calendar) export
- [ ] Add PDF generation (optional - complex)
- [ ] Add export button to TripViewDrawer
- [ ] Handle large data sets efficiently

### Estimated Effort
**4-6 hours**

---

## Total Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Packing Lists | 2-3 hours | High |
| Phase 2: Collections | 4-5 hours | High |
| Phase 3: Sharing | 6-8 hours | Medium |
| Phase 4: Attachments | 6-8 hours | Medium |
| Phase 5: Time Support | 4-5 hours | Low |
| Phase 6: Export | 4-6 hours | Low |
| **Total** | **26-35 hours** | - |

## Implementation Order

1. **Start with Phase 1** (Packing Lists) - Quick win, high visibility
2. **Then Phase 2** (Collections) - Better organization before sharing
3. **Then Phase 3** (Sharing) - Collaboration needs collections context
4. **Then Phase 4** (Attachments) - Rich content after sharing
5. **Then Phase 5** (Time Support) - Technical improvement
6. **Finally Phase 6** (Export) - If time permits

## Success Metrics

After implementation, we should have:
- ✅ Packing lists that users can create and check off
- ✅ Ability to group trips into collections
- ✅ Share trips with specific users
- ✅ Upload and attach files to trips
- ✅ Proper timezone support for international travel
- ✅ Export trip data (optional)

All while maintaining:
- ✅ Urban Manual's editorial design
- ✅ Next.js/Supabase stack
- ✅ MIT license
- ✅ Vercel deployment
- ✅ Existing trip functionality

## Next Steps

1. Review this plan with stakeholders
2. Prioritize phases based on user feedback
3. Start with Phase 1 implementation
4. Test each phase thoroughly before moving to next
5. Gather user feedback and iterate

## References

- [AdventureLog GitHub](https://github.com/seanmorley15/AdventureLog)
- [AdventureLog Documentation](https://adventurelog.app/docs/)
- [ADVENTURELOG_COMPARISON.md](./ADVENTURELOG_COMPARISON.md)
- [Urban Manual Existing Types](./types/trip.ts)
- [Urban Manual Trip Schema](./migrations/trips.sql)
