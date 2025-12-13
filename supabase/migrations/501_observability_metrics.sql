-- Migration: Create observability_metrics table
-- Purpose: Store search quality and planner failure metrics for monitoring

-- Create the observability_metrics table
CREATE TABLE IF NOT EXISTS observability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('search', 'planner')),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_observability_metrics_event_type
  ON observability_metrics(event_type);

CREATE INDEX IF NOT EXISTS idx_observability_metrics_event_name
  ON observability_metrics(event_name);

CREATE INDEX IF NOT EXISTS idx_observability_metrics_created_at
  ON observability_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_observability_metrics_user_id
  ON observability_metrics(user_id)
  WHERE user_id IS NOT NULL;

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_observability_metrics_type_created
  ON observability_metrics(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE observability_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for metrics collection)
CREATE POLICY "Service role can manage observability_metrics"
  ON observability_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to insert their own metrics
CREATE POLICY "Authenticated users can insert metrics"
  ON observability_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admin users can read all metrics
CREATE POLICY "Admins can read all metrics"
  ON observability_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE observability_metrics IS 'Stores search quality and trip planner observability metrics';
COMMENT ON COLUMN observability_metrics.event_type IS 'Category of event: search or planner';
COMMENT ON COLUMN observability_metrics.event_name IS 'Specific event name (e.g., search_performed, planner_failure)';
COMMENT ON COLUMN observability_metrics.payload IS 'JSON payload with event-specific data';
