-- Migration 440: Trip Collaborators
-- Adds support for sharing trips between registered users

BEGIN;

-- ============================================================================
-- ADD COLUMNS TO TRIPS TABLE
-- ============================================================================

-- Add visibility column (private, shared, public)
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'shared', 'public'));

-- Add share_slug for public sharing links
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE;

-- Add shared_at timestamp
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Create index on share_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_trips_share_slug ON trips(share_slug) WHERE share_slug IS NOT NULL;

-- ============================================================================
-- CREATE TRIP_COLLABORATORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT trip_collaborators_unique UNIQUE(trip_id, email)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_email ON trip_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_status ON trip_collaborators(status);

-- ============================================================================
-- ROW LEVEL SECURITY FOR TRIP_COLLABORATORS
-- ============================================================================

ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Owners can view all collaborators on their trips
CREATE POLICY "Trip owners can view collaborators"
  ON trip_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_collaborators.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Collaborators can view other collaborators on shared trips
CREATE POLICY "Collaborators can view other collaborators"
  ON trip_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators tc
      WHERE tc.trip_id = trip_collaborators.trip_id
      AND tc.user_id = auth.uid()
      AND tc.status = 'accepted'
    )
  );

-- Users can view their own invitations (by user_id when they're logged in)
CREATE POLICY "Users can view own invitations"
  ON trip_collaborators FOR SELECT
  USING (user_id = auth.uid());

-- Trip owners can add collaborators
CREATE POLICY "Trip owners can add collaborators"
  ON trip_collaborators FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_collaborators.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Trip owners can update collaborators (change role, etc.)
CREATE POLICY "Trip owners can update collaborators"
  ON trip_collaborators FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_collaborators.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Users can update their own collaboration status (accept/decline)
CREATE POLICY "Users can update own collaboration status"
  ON trip_collaborators FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can remove collaborators
CREATE POLICY "Trip owners can remove collaborators"
  ON trip_collaborators FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_collaborators.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Users can remove themselves from trips
CREATE POLICY "Users can remove themselves from trips"
  ON trip_collaborators FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- UPDATE TRIPS RLS POLICIES
-- ============================================================================

-- Drop existing select policy if it exists
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view trips they own or collaborate on" ON trips;

-- Create new policy that allows viewing owned trips AND collaborated trips
CREATE POLICY "Users can view trips they own or collaborate on"
  ON trips FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM trip_collaborators tc
      WHERE tc.trip_id = trips.id
      AND tc.user_id = auth.uid()
      AND tc.status = 'accepted'
    )
    OR
    (visibility = 'public' AND share_slug IS NOT NULL)
  );

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can update trips they own or edit" ON trips;

-- Create policy for updating trips (owners and editors)
CREATE POLICY "Users can update trips they own or edit"
  ON trips FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM trip_collaborators tc
      WHERE tc.trip_id = trips.id
      AND tc.user_id = auth.uid()
      AND tc.status = 'accepted'
      AND tc.role IN ('owner', 'editor')
    )
  );

-- ============================================================================
-- UPDATE ITINERARY_ITEMS RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own itinerary items" ON itinerary_items;
DROP POLICY IF EXISTS "Users can view itinerary items for accessible trips" ON itinerary_items;

-- Create policy for viewing itinerary items
CREATE POLICY "Users can view itinerary items for accessible trips"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id
          AND tc.user_id = auth.uid()
          AND tc.status = 'accepted'
        )
        OR (t.visibility = 'public' AND t.share_slug IS NOT NULL)
      )
    )
  );

-- Drop existing insert/update/delete policies
DROP POLICY IF EXISTS "Users can add itinerary items to own trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can add itinerary items to editable trips" ON itinerary_items;

-- Create policy for adding items (owners and editors)
CREATE POLICY "Users can add itinerary items to editable trips"
  ON itinerary_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id
          AND tc.user_id = auth.uid()
          AND tc.status = 'accepted'
          AND tc.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own itinerary items" ON itinerary_items;
DROP POLICY IF EXISTS "Users can update itinerary items in editable trips" ON itinerary_items;

-- Create policy for updating items (owners and editors)
CREATE POLICY "Users can update itinerary items in editable trips"
  ON itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id
          AND tc.user_id = auth.uid()
          AND tc.status = 'accepted'
          AND tc.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete own itinerary items" ON itinerary_items;
DROP POLICY IF EXISTS "Users can delete itinerary items in editable trips" ON itinerary_items;

-- Create policy for deleting items (owners and editors)
CREATE POLICY "Users can delete itinerary items in editable trips"
  ON itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id
          AND tc.user_id = auth.uid()
          AND tc.status = 'accepted'
          AND tc.role IN ('owner', 'editor')
        )
      )
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Generate unique share slug
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_share_slug()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user can access trip
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_trip(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = p_trip_id
    AND (
      t.user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM trip_collaborators tc
        WHERE tc.trip_id = t.id
        AND tc.user_id = p_user_id
        AND tc.status = 'accepted'
      )
    )
  );
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user can edit trip
-- ============================================================================

CREATE OR REPLACE FUNCTION can_edit_trip(p_trip_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = p_trip_id
    AND (
      t.user_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM trip_collaborators tc
        WHERE tc.trip_id = t.id
        AND tc.user_id = p_user_id
        AND tc.status = 'accepted'
        AND tc.role IN ('owner', 'editor')
      )
    )
  );
END;
$$;

-- ============================================================================
-- VALIDATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TRIP COLLABORATORS MIGRATION COMPLETE ===';
  RAISE NOTICE 'Added columns to trips: visibility, share_slug, shared_at';
  RAISE NOTICE 'Created table: trip_collaborators';
  RAISE NOTICE 'Updated RLS policies for trips and itinerary_items';
  RAISE NOTICE '=============================================';
END $$;

COMMIT;
