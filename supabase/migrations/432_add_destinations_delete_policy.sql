-- Migration 432: Add DELETE policy for destinations table
-- This enables authenticated admin users to delete destinations via the admin UI
-- Without this policy, DELETE operations fail due to RLS restrictions

BEGIN;

-- Drop existing delete policy if it exists (cleanup)
DROP POLICY IF EXISTS "Service role can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Admin users can delete destinations" ON destinations;
DROP POLICY IF EXISTS "Authenticated admin users can delete destinations" ON destinations;

-- Create DELETE policy for service_role (for backend operations)
CREATE POLICY "Service role can delete destinations"
ON destinations FOR DELETE
TO service_role
USING (true);

-- Create DELETE policy for authenticated users with admin role
-- This allows admin users to delete destinations from the admin UI
CREATE POLICY "Authenticated admin users can delete destinations"
ON destinations FOR DELETE
TO authenticated
USING (
  -- Check if user has admin role in app_metadata
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ DELETE policy added for destinations table';
  RAISE NOTICE '';
  RAISE NOTICE 'Service role can delete destinations (backend)';
  RAISE NOTICE 'Authenticated admin users can delete destinations (admin UI)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run this migration in Supabase SQL Editor';
  RAISE NOTICE '2. Test delete functionality in admin panel at /admin';
END $$;
