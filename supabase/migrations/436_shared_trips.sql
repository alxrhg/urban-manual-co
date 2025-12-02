-- Migration 436: Shared Trips
-- Adds support for trip sharing via links and collaborators with real-time sync

BEGIN;

-- ============================================================================
-- TRIP SHARES - Public share links for viewing trips
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  share_token VARCHAR(32) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (access_level IN ('view')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one share link per trip
  CONSTRAINT trip_shares_trip_unique UNIQUE(trip_id)
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_trip_shares_token ON trip_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_trip_shares_trip_id ON trip_shares(trip_id);

-- ============================================================================
-- TRIP COLLABORATORS - Invited users who can edit trips
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email VARCHAR(255), -- Email used for invitation (for pending invites)
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- One collaboration per user per trip
  CONSTRAINT trip_collaborators_unique UNIQUE(trip_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_invited_email ON trip_collaborators(invited_email);

-- ============================================================================
-- TRIP INVITES - Pending invitations by email (for users not yet registered)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('editor', 'viewer')),
  invite_token VARCHAR(32) NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One invite per email per trip
  CONSTRAINT trip_invites_unique UNIQUE(trip_id, email)
);

CREATE INDEX IF NOT EXISTS idx_trip_invites_token ON trip_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_trip_invites_email ON trip_invites(email);

-- ============================================================================
-- RLS POLICIES - Simple policies to avoid recursion
-- ============================================================================

-- Enable RLS
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invites ENABLE ROW LEVEL SECURITY;

-- Trip Shares Policies
-- Only trip owner can create/manage share links
DROP POLICY IF EXISTS "Trip owners can manage shares" ON trip_shares;
CREATE POLICY "Trip owners can manage shares" ON trip_shares
  FOR ALL
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Anyone can read share tokens (needed for share link access)
DROP POLICY IF EXISTS "Share tokens are readable" ON trip_shares;
CREATE POLICY "Share tokens are readable" ON trip_shares
  FOR SELECT
  USING (true);

-- Trip Collaborators Policies
-- Users can see collaborations they're part of
DROP POLICY IF EXISTS "Users can view their collaborations" ON trip_collaborators;
CREATE POLICY "Users can view their collaborations" ON trip_collaborators
  FOR SELECT
  USING (user_id = auth.uid() OR invited_by = auth.uid());

-- Trip owners (invited_by) can manage collaborators
DROP POLICY IF EXISTS "Owners can manage collaborators" ON trip_collaborators;
CREATE POLICY "Owners can manage collaborators" ON trip_collaborators
  FOR ALL
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Users can update their own collaboration (accept/decline)
DROP POLICY IF EXISTS "Users can update own collaboration" ON trip_collaborators;
CREATE POLICY "Users can update own collaboration" ON trip_collaborators
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trip Invites Policies
-- Only inviters can manage invites
DROP POLICY IF EXISTS "Inviters can manage invites" ON trip_invites;
CREATE POLICY "Inviters can manage invites" ON trip_invites
  FOR ALL
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Anyone can read invites by token (for accepting)
DROP POLICY IF EXISTS "Invites readable by token" ON trip_invites;
CREATE POLICY "Invites readable by token" ON trip_invites
  FOR SELECT
  USING (true);

-- ============================================================================
-- UPDATE TRIPS TABLE RLS - Allow collaborators to access trips
-- ============================================================================

-- Add policy for collaborators to view trips they're invited to
DROP POLICY IF EXISTS "Collaborators can view trips" ON trips;
CREATE POLICY "Collaborators can view trips" ON trips
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM trip_collaborators tc
      WHERE tc.trip_id = trips.id
      AND tc.user_id = auth.uid()
      AND tc.status = 'accepted'
    )
  );

-- Add policy for collaborators with editor role to update trips
DROP POLICY IF EXISTS "Collaborators can update trips" ON trips;
CREATE POLICY "Collaborators can update trips" ON trips
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_collaborators tc
      WHERE tc.trip_id = trips.id
      AND tc.user_id = auth.uid()
      AND tc.status = 'accepted'
      AND tc.role = 'editor'
    )
  );

-- Only owner can delete trips
DROP POLICY IF EXISTS "Only owner can delete trips" ON trips;
CREATE POLICY "Only owner can delete trips" ON trips
  FOR DELETE
  USING (user_id = auth.uid());

-- Only authenticated users can insert trips (they become owner)
DROP POLICY IF EXISTS "Authenticated users can create trips" ON trips;
CREATE POLICY "Authenticated users can create trips" ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- UPDATE ITINERARY ITEMS RLS - Allow collaborators to edit items
-- ============================================================================

-- Collaborators can view itinerary items
DROP POLICY IF EXISTS "Collaborators can view itinerary items" ON itinerary_items;
CREATE POLICY "Collaborators can view itinerary items" ON itinerary_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = itinerary_items.trip_id
      AND (
        t.user_id = auth.uid()
        OR t.is_public = true
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id
          AND tc.user_id = auth.uid()
          AND tc.status = 'accepted'
        )
      )
    )
  );

-- Collaborators with editor role can modify itinerary items
DROP POLICY IF EXISTS "Collaborators can modify itinerary items" ON itinerary_items;
CREATE POLICY "Collaborators can modify itinerary items" ON itinerary_items
  FOR ALL
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
          AND tc.role = 'editor'
        )
      )
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a random share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(32) AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check if a user can access a trip (owner, collaborator, or via share link)
CREATE OR REPLACE FUNCTION can_access_trip(p_trip_id UUID, p_user_id UUID DEFAULT NULL, p_share_token VARCHAR DEFAULT NULL)
RETURNS TABLE (
  can_view BOOLEAN,
  can_edit BOOLEAN,
  access_type VARCHAR
) AS $$
DECLARE
  v_trip trips%ROWTYPE;
  v_is_owner BOOLEAN := false;
  v_is_collaborator BOOLEAN := false;
  v_collaborator_role VARCHAR;
  v_has_share_token BOOLEAN := false;
BEGIN
  -- Get the trip
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 'none'::VARCHAR;
    RETURN;
  END IF;

  -- Check if user is owner
  IF p_user_id IS NOT NULL AND v_trip.user_id = p_user_id THEN
    RETURN QUERY SELECT true, true, 'owner'::VARCHAR;
    RETURN;
  END IF;

  -- Check if user is a collaborator
  IF p_user_id IS NOT NULL THEN
    SELECT role INTO v_collaborator_role
    FROM trip_collaborators
    WHERE trip_id = p_trip_id AND user_id = p_user_id AND status = 'accepted';

    IF FOUND THEN
      RETURN QUERY SELECT true, v_collaborator_role = 'editor', 'collaborator'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Check share token
  IF p_share_token IS NOT NULL THEN
    SELECT true INTO v_has_share_token
    FROM trip_shares
    WHERE trip_id = p_trip_id AND share_token = p_share_token;

    IF v_has_share_token THEN
      RETURN QUERY SELECT true, false, 'share_link'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Check if trip is public
  IF v_trip.is_public THEN
    RETURN QUERY SELECT true, false, 'public'::VARCHAR;
    RETURN;
  END IF;

  -- No access
  RETURN QUERY SELECT false, false, 'none'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE trips;
ALTER PUBLICATION supabase_realtime ADD TABLE itinerary_items;
ALTER PUBLICATION supabase_realtime ADD TABLE trip_collaborators;

COMMIT;
