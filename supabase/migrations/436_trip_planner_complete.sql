-- Migration 436: Complete Trip Planner Schema
-- Extends trips and itinerary_items tables, adds flights, hotel_bookings, collaborators, notes, and attachments

BEGIN;

-- ============================================
-- TRIPS TABLE (extend existing)
-- ============================================

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS emoji TEXT,
  ADD COLUMN IF NOT EXISTS destinations JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS traveler_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h',
  ADD COLUMN IF NOT EXISTS temp_unit TEXT DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS distance_unit TEXT DEFAULT 'mi',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS share_slug TEXT;

-- Add unique constraint for share_slug if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_trips_share_slug'
  ) THEN
    CREATE UNIQUE INDEX idx_trips_share_slug ON trips(share_slug) WHERE share_slug IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- FLIGHTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,

  -- Flight info
  airline TEXT NOT NULL,
  airline_code TEXT,
  flight_number TEXT NOT NULL,
  aircraft_type TEXT,

  -- Route
  departure_airport TEXT NOT NULL,
  departure_city TEXT,
  departure_time TIMESTAMPTZ NOT NULL,
  departure_terminal TEXT,
  departure_gate TEXT,

  arrival_airport TEXT NOT NULL,
  arrival_city TEXT,
  arrival_time TIMESTAMPTZ NOT NULL,
  arrival_terminal TEXT,
  arrival_gate TEXT,

  -- Duration
  duration_minutes INTEGER,
  is_direct_flight BOOLEAN DEFAULT true,
  stops JSONB DEFAULT '[]',

  -- Booking
  booking_status TEXT DEFAULT 'not_booked',
  confirmation_number TEXT,
  booking_url TEXT,

  -- Passenger
  seat_number TEXT,
  seat_class TEXT DEFAULT 'economy',
  bags_carry_on INTEGER DEFAULT 1,
  bags_checked INTEGER DEFAULT 0,
  frequent_flyer_number TEXT,

  -- Lounge
  lounge_access BOOLEAN DEFAULT false,
  lounge_location TEXT,
  lounge_name TEXT,

  -- Trip integration
  day INTEGER NOT NULL,
  leg_type TEXT DEFAULT 'outbound',

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HOTEL BOOKINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  destination_slug TEXT,

  -- Hotel info
  name TEXT NOT NULL,
  brand TEXT,
  star_rating INTEGER,
  address TEXT,
  city TEXT,
  phone TEXT,
  website TEXT,
  image_url TEXT,

  -- Location
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Stay
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  check_in_time TIME DEFAULT '15:00',
  check_out_time TIME DEFAULT '11:00',

  -- Room
  room_type TEXT,
  room_number TEXT,
  floor_preference TEXT,
  bed_type TEXT,

  -- Booking
  booking_status TEXT DEFAULT 'not_booked',
  confirmation_number TEXT,
  booking_url TEXT,

  -- Pricing
  cost_per_night DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',

  -- Amenities
  breakfast_included BOOLEAN DEFAULT false,
  breakfast_time TEXT,
  breakfast_location TEXT,

  has_pool BOOLEAN DEFAULT false,
  pool_hours TEXT,

  has_gym BOOLEAN DEFAULT false,
  gym_hours TEXT,

  has_spa BOOLEAN DEFAULT false,

  has_lounge BOOLEAN DEFAULT false,
  lounge_hours TEXT,
  lounge_location TEXT,

  parking_included BOOLEAN DEFAULT false,
  parking_cost DECIMAL(10,2),
  parking_type TEXT,

  wifi_included BOOLEAN DEFAULT true,
  airport_shuttle BOOLEAN DEFAULT false,

  amenities JSONB DEFAULT '[]',

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add computed column for nights (using a trigger since GENERATED ALWAYS AS doesn't work with DATE subtraction in all versions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotel_bookings' AND column_name = 'nights'
  ) THEN
    ALTER TABLE hotel_bookings ADD COLUMN nights INTEGER;
  END IF;
END $$;

-- Create trigger function to compute nights
CREATE OR REPLACE FUNCTION compute_hotel_nights()
RETURNS TRIGGER AS $$
BEGIN
  NEW.nights := NEW.check_out_date - NEW.check_in_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS compute_hotel_nights_trigger ON hotel_bookings;
CREATE TRIGGER compute_hotel_nights_trigger
  BEFORE INSERT OR UPDATE OF check_in_date, check_out_date ON hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION compute_hotel_nights();

-- ============================================
-- ITINERARY ITEMS TABLE (extend existing)
-- ============================================

ALTER TABLE itinerary_items
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'attraction',
  ADD COLUMN IF NOT EXISTS subtype TEXT,
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'not_booked',
  ADD COLUMN IF NOT EXISTS confirmation_number TEXT,
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS party_size INTEGER,
  ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS price_range TEXT,
  ADD COLUMN IF NOT EXISTS travel_time_to_next INTEGER,
  ADD COLUMN IF NOT EXISTS travel_distance_to_next DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS travel_mode_to_next TEXT,
  ADD COLUMN IF NOT EXISTS flight_id UUID,
  ADD COLUMN IF NOT EXISTS hotel_booking_id UUID,
  ADD COLUMN IF NOT EXISTS night_number INTEGER,
  ADD COLUMN IF NOT EXISTS total_nights INTEGER,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS is_weather_dependent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_indoor BOOLEAN;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_items_flight_id_fkey'
  ) THEN
    ALTER TABLE itinerary_items
      ADD CONSTRAINT itinerary_items_flight_id_fkey
      FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itinerary_items_hotel_booking_id_fkey'
  ) THEN
    ALTER TABLE itinerary_items
      ADD CONSTRAINT itinerary_items_hotel_booking_id_fkey
      FOREIGN KEY (hotel_booking_id) REFERENCES hotel_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- TRIP COLLABORATORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trip_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(trip_id, email)
);

-- ============================================
-- TRIP NOTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trip_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  day INTEGER,
  content TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIP ATTACHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trip_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  url TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_flights_trip ON flights(trip_id);
CREATE INDEX IF NOT EXISTS idx_flights_day ON flights(trip_id, day);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_trip ON hotel_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_dates ON hotel_bookings(trip_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_flight ON itinerary_items(flight_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_hotel ON itinerary_items(hotel_booking_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_category ON itinerary_items(trip_id, category);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_email ON trip_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_trip_notes_trip ON trip_notes(trip_id, day);
CREATE INDEX IF NOT EXISTS idx_trip_attachments_trip ON trip_attachments(trip_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users access own trip flights" ON flights;
DROP POLICY IF EXISTS "Users access own trip hotels" ON hotel_bookings;
DROP POLICY IF EXISTS "Users access own trip collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users access own trip notes" ON trip_notes;
DROP POLICY IF EXISTS "Users access own trip attachments" ON trip_attachments;

-- Flights: Users can access flights for their own trips or trips they collaborate on
CREATE POLICY "Users access own trip flights" ON flights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = flights.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = flights.trip_id AND trip_collaborators.user_id = auth.uid())
  );

-- Hotel bookings: Users can access hotel bookings for their own trips or trips they collaborate on
CREATE POLICY "Users access own trip hotels" ON hotel_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = hotel_bookings.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = hotel_bookings.trip_id AND trip_collaborators.user_id = auth.uid())
  );

-- Collaborators: Trip owners can manage collaborators, collaborators can see their own invites
CREATE POLICY "Users access own trip collaborators" ON trip_collaborators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_collaborators.trip_id AND trips.user_id = auth.uid())
    OR user_id = auth.uid()
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Notes: Users can access notes for their own trips or trips they collaborate on
CREATE POLICY "Users access own trip notes" ON trip_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_notes.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = trip_notes.trip_id AND trip_collaborators.user_id = auth.uid())
  );

-- Attachments: Users can access attachments for their own trips or trips they collaborate on
CREATE POLICY "Users access own trip attachments" ON trip_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_attachments.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = trip_attachments.trip_id AND trip_collaborators.user_id = auth.uid())
  );

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

-- Create a reusable trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to new tables
DROP TRIGGER IF EXISTS flights_updated_at ON flights;
CREATE TRIGGER flights_updated_at
  BEFORE UPDATE ON flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS hotel_bookings_updated_at ON hotel_bookings;
CREATE TRIGGER hotel_bookings_updated_at
  BEFORE UPDATE ON hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trip_notes_updated_at ON trip_notes;
CREATE TRIGGER trip_notes_updated_at
  BEFORE UPDATE ON trip_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
