-- Add optional budget tracking to trips
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS budget numeric;

COMMENT ON COLUMN public.trips.budget IS 'Optional total budget for the trip';
