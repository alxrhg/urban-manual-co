-- Migration 401: Itineraries System
-- Allows users to plan trips with multiple days and places

-- Itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  city TEXT, -- Primary city for this itinerary
  country TEXT,
  is_archived BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  slug TEXT, -- For public sharing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itinerary days
CREATE TABLE IF NOT EXISTS itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  title TEXT, -- e.g., "Day 1 - Exploring Museums"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(itinerary_id, day_number)
);

-- Itinerary items (places in days)
CREATE TABLE IF NOT EXISTS itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_day_id UUID NOT NULL REFERENCES itinerary_days(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  notes TEXT,
  position INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false, -- Track if visited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itinerary collaborators (for sharing with friends)
CREATE TABLE IF NOT EXISTS itinerary_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer', -- 'viewer', 'editor', 'owner'
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(itinerary_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_dates ON itineraries(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_itineraries_is_public ON itineraries(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_itineraries_slug ON itineraries(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON itinerary_days(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_date ON itinerary_days(date);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day_id ON itinerary_items(itinerary_day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_destination ON itinerary_items(destination_slug);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_position ON itinerary_items(itinerary_day_id, position);
CREATE INDEX IF NOT EXISTS idx_itinerary_collaborators_itinerary_id ON itinerary_collaborators(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_collaborators_user_id ON itinerary_collaborators(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_itineraries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_itineraries_updated_at_trigger ON itineraries;
CREATE TRIGGER update_itineraries_updated_at_trigger
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_itineraries_updated_at();

-- RLS policies
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_collaborators ENABLE ROW LEVEL SECURITY;

-- Itineraries: Users can view their own
CREATE POLICY itineraries_select_own ON itineraries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Itineraries: Users can view public itineraries
CREATE POLICY itineraries_select_public ON itineraries
  FOR SELECT
  USING (is_public = true);

-- Itineraries: Users can view itineraries they're collaborating on
CREATE POLICY itineraries_select_collaborator ON itineraries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_collaborators
      WHERE itinerary_collaborators.itinerary_id = itineraries.id
      AND itinerary_collaborators.user_id = auth.uid()
    )
  );

-- Itineraries: Users can create their own
CREATE POLICY itineraries_insert_own ON itineraries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Itineraries: Users can update their own or ones they're an editor on
CREATE POLICY itineraries_update_own ON itineraries
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM itinerary_collaborators
      WHERE itinerary_collaborators.itinerary_id = itineraries.id
      AND itinerary_collaborators.user_id = auth.uid()
      AND itinerary_collaborators.role IN ('editor', 'owner')
    )
  );

-- Itineraries: Users can delete their own
CREATE POLICY itineraries_delete_own ON itineraries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Itinerary days: Inherit access from parent itinerary
CREATE POLICY itinerary_days_select ON itinerary_days
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_days.itinerary_id
      AND (
        itineraries.user_id = auth.uid() OR
        itineraries.is_public = true OR
        EXISTS (
          SELECT 1 FROM itinerary_collaborators
          WHERE itinerary_collaborators.itinerary_id = itineraries.id
          AND itinerary_collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY itinerary_days_modify ON itinerary_days
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_days.itinerary_id
      AND (
        itineraries.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM itinerary_collaborators
          WHERE itinerary_collaborators.itinerary_id = itineraries.id
          AND itinerary_collaborators.user_id = auth.uid()
          AND itinerary_collaborators.role IN ('editor', 'owner')
        )
      )
    )
  );

-- Itinerary items: Inherit access from parent itinerary day
CREATE POLICY itinerary_items_select ON itinerary_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      JOIN itineraries ON itineraries.id = itinerary_days.itinerary_id
      WHERE itinerary_days.id = itinerary_items.itinerary_day_id
      AND (
        itineraries.user_id = auth.uid() OR
        itineraries.is_public = true OR
        EXISTS (
          SELECT 1 FROM itinerary_collaborators
          WHERE itinerary_collaborators.itinerary_id = itineraries.id
          AND itinerary_collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY itinerary_items_modify ON itinerary_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_days
      JOIN itineraries ON itineraries.id = itinerary_days.itinerary_id
      WHERE itinerary_days.id = itinerary_items.itinerary_day_id
      AND (
        itineraries.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM itinerary_collaborators
          WHERE itinerary_collaborators.itinerary_id = itineraries.id
          AND itinerary_collaborators.user_id = auth.uid()
          AND itinerary_collaborators.role IN ('editor', 'owner')
        )
      )
    )
  );

-- Collaborators policies
CREATE POLICY itinerary_collaborators_select ON itinerary_collaborators
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_collaborators.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY itinerary_collaborators_insert ON itinerary_collaborators
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_collaborators.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

CREATE POLICY itinerary_collaborators_delete ON itinerary_collaborators
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_collaborators.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON itineraries TO authenticated;
GRANT ALL ON itinerary_days TO authenticated;
GRANT ALL ON itinerary_items TO authenticated;
GRANT ALL ON itinerary_collaborators TO authenticated;
