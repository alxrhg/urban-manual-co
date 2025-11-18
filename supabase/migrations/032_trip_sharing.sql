-- Migration: Enhanced Trip Sharing
-- Adds user-specific trip sharing with view/edit permissions

-- Create trip_shares table
CREATE TABLE IF NOT EXISTS trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level VARCHAR(20) NOT NULL DEFAULT 'view', -- 'view' or 'edit'
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, shared_with_user_id)
);

-- Indexes for performance
CREATE INDEX idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX idx_trip_shares_shared_with ON trip_shares(shared_with_user_id);
CREATE INDEX idx_trip_shares_shared_by ON trip_shares(shared_by_user_id);

-- Enable Row Level Security
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_shares
CREATE POLICY "Users can view shares they created or received"
  ON trip_shares FOR SELECT
  USING (
    auth.uid() = shared_by_user_id OR 
    auth.uid() = shared_with_user_id
  );

CREATE POLICY "Trip owners can create shares"
  ON trip_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_shares.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can delete shares"
  ON trip_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_shares.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can update shares"
  ON trip_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_shares.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Update trips policies to include shared trips
DROP POLICY IF EXISTS "Users can view their own trips" ON trips;
DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete their own trips" ON trips;

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

CREATE POLICY "Users can delete their own trips only"
  ON trips FOR DELETE
  USING (auth.uid() = user_id);

-- Update itinerary_items policies to support shared trips
DROP POLICY IF EXISTS "Users can view itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can update itinerary items for their trips" ON itinerary_items;
DROP POLICY IF EXISTS "Users can delete itinerary items for their trips" ON itinerary_items;

CREATE POLICY "Users can view itinerary items for accessible trips"
  ON itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND (
        trips.user_id = auth.uid() OR
        trips.is_public = TRUE OR
        EXISTS (
          SELECT 1 FROM trip_shares
          WHERE trip_shares.trip_id = trips.id
          AND trip_shares.shared_with_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update itinerary items for editable trips"
  ON itinerary_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND (
        trips.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_shares
          WHERE trip_shares.trip_id = trips.id
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level = 'edit'
        )
      )
    )
  );

CREATE POLICY "Users can delete itinerary items for editable trips"
  ON itinerary_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = itinerary_items.trip_id
      AND (
        trips.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM trip_shares
          WHERE trip_shares.trip_id = trips.id
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level = 'edit'
        )
      )
    )
  );
