-- Rename trips to itineraries
ALTER TABLE IF EXISTS trips RENAME TO itineraries;

-- Add a new UUID id column, populate it, and then replace the old id
ALTER TABLE itineraries ADD COLUMN uuid_id UUID DEFAULT gen_random_uuid();
UPDATE itineraries SET uuid_id = gen_random_uuid() WHERE uuid_id IS NULL;

-- Add itinerary_id to itinerary_items and populate it
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS itinerary_id UUID;
UPDATE itinerary_items SET itinerary_id = itineraries.uuid_id FROM itineraries WHERE itinerary_items.trip_id = itineraries.id;

-- Now that the data is migrated, we can drop the old columns and add the foreign key
ALTER TABLE itineraries DROP COLUMN id;
ALTER TABLE itineraries RENAME COLUMN uuid_id TO id;
ALTER TABLE itineraries ADD PRIMARY KEY (id);
ALTER TABLE itinerary_items DROP COLUMN trip_id;
ALTER TABLE itinerary_items ADD CONSTRAINT fk_itinerary FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE;


-- Add new columns to itineraries
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS hotel TEXT;
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS budget NUMERIC;

-- Add emoji to collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS emoji TEXT;

-- Create itinerary_days table
CREATE TABLE IF NOT EXISTS itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT
);
