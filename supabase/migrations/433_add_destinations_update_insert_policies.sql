-- Migration 433: Add UPDATE and INSERT policies for destinations table
-- This enables authenticated admin users to update and insert destinations via the admin UI
-- Without these policies, UPDATE and INSERT operations fail due to RLS restrictions

BEGIN;

-- Drop existing policies if they exist (cleanup)
DROP POLICY IF EXISTS "Service role can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Service role can update destinations" ON destinations;
DROP POLICY IF EXISTS "Admin users can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Admin users can update destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated admin users can insert destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated admin users can update destinations" ON destinations;

-- Create INSERT policy for service_role (for backend operations)
CREATE POLICY "Service role can insert destinations"
ON destinations FOR INSERT
TO service_role
WITH CHECK (true);

-- Create UPDATE policy for service_role (for backend operations)
CREATE POLICY "Service role can update destinations"
ON destinations FOR UPDATE
TO service_role
USING (true);

-- Create INSERT policy for authenticated users with admin role
-- This allows admin users to create destinations from the admin UI
CREATE POLICY "Authenticated admin users can insert destinations"
ON destinations FOR INSERT
TO authenticated
WITH CHECK (
  -- Check if user has admin role in app_metadata
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Create UPDATE policy for authenticated users with admin role
-- This allows admin users to update destinations from the admin UI
CREATE POLICY "Authenticated admin users can update destinations"
ON destinations FOR UPDATE
TO authenticated
USING (
  -- Check if user has admin role in app_metadata
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  -- Also check on the new values being written
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ UPDATE and INSERT policies added for destinations table';
  RAISE NOTICE '';
  RAISE NOTICE 'Service role can insert/update destinations (backend)';
  RAISE NOTICE 'Authenticated admin users can insert/update destinations (admin UI)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run this migration in Supabase SQL Editor';
  RAISE NOTICE '2. Test update functionality in admin panel at /admin';
  RAISE NOTICE '3. Test insert functionality (create new POI)';
END $$;
