-- Migration: Remove the unused budget column from trips
-- Trips no longer track budget information, so drop the column to resolve schema cache errors

ALTER TABLE IF EXISTS public.trips
  DROP COLUMN IF EXISTS budget;

-- Surface a confirmation row for CLI logs
SELECT 'Removed trips.budget column (if it existed)' AS status;
