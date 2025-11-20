-- Migration 010: Ensure brand column exists in destinations table
-- This migration is idempotent and safe to run multiple times

BEGIN;

-- Add brand column if it doesn't exist
ALTER TABLE public.destinations
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_destinations_brand 
ON public.destinations(brand);

-- Add comment
COMMENT ON COLUMN public.destinations.brand IS 'Brand or hotel group name (e.g., Aman, Ace Hotel)';

COMMIT;

-- Verification query (uncomment to run after migration)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'destinations' AND column_name = 'brand';

