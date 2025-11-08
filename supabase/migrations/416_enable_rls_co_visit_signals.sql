-- Migration: Enable RLS on co_visit_signals table
-- This table stores co-visitation scores for recommendations
-- Security: Read-only for public, write-only for service role

-- Enable RLS on co_visit_signals
ALTER TABLE IF EXISTS co_visit_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone (anon/authenticated) to read co-visitation signals
-- This is safe because it only contains aggregated scores, no user data
CREATE POLICY "Allow public read access to co_visit_signals"
  ON co_visit_signals
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Only service role can insert/update/delete
-- This is needed for the compute_co_visitation() function
CREATE POLICY "Allow service role to manage co_visit_signals"
  ON co_visit_signals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE co_visit_signals IS 'Co-visitation signals for destination recommendations. Public read access, service role write access.';

