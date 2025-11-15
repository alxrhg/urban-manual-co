-- ============================================
-- ALLOW PUBLIC ACCESS TO DESTINATIONS TABLE
-- ============================================
-- Destinations are public data, so we allow anyone to read them
-- Only admins can write (which we'll do via service role key)
-- ============================================

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON destinations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON destinations;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON destinations;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON destinations;

-- Create policy to allow anyone to read destinations
CREATE POLICY "Public destinations are viewable by everyone"
ON destinations FOR SELECT
TO public
USING (true);

-- Create policy to allow service role to insert/update/delete
CREATE POLICY "Service role can insert destinations"
ON destinations FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role can update destinations"
ON destinations FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service role can delete destinations"
ON destinations FOR DELETE
TO service_role
USING (true);

-- Allow authenticated admin users to insert/update/delete destinations
CREATE POLICY "Authenticated admin users can insert destinations"
ON destinations FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Authenticated admin users can update destinations"
ON destinations FOR UPDATE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

CREATE POLICY "Authenticated admin users can delete destinations"
ON destinations FOR DELETE
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Destinations table RLS policies configured!';
  RAISE NOTICE '';
  RAISE NOTICE 'Anyone can read destinations (public data)';
  RAISE NOTICE 'Service role can insert/update/delete (backend)';
  RAISE NOTICE 'Authenticated admin users can insert/update/delete (admin UI)';
END $$;

