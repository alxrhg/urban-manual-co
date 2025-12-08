-- Create AI Usage Logs table for cost tracking
-- This table stores AI API usage records for monitoring and analytics

CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimated_cost DECIMAL(10, 8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_timestamp ON ai_usage_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON ai_usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_endpoint ON ai_usage_logs(endpoint);

-- Create a composite index for time-range queries with filters
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_timestamp_model ON ai_usage_logs(timestamp DESC, model);

-- Enable Row Level Security
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role has full access to ai_usage_logs"
  ON ai_usage_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all ai_usage_logs"
  ON ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Users can view their own usage
CREATE POLICY "Users can view their own ai_usage_logs"
  ON ai_usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create a function to get usage summary
CREATE OR REPLACE FUNCTION get_ai_usage_summary(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_requests BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_cost DECIMAL(12, 6),
  avg_cost_per_request DECIMAL(12, 8)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COALESCE(SUM(input_tokens), 0)::BIGINT as total_input_tokens,
    COALESCE(SUM(output_tokens), 0)::BIGINT as total_output_tokens,
    COALESCE(SUM(estimated_cost), 0)::DECIMAL(12, 6) as total_cost,
    CASE
      WHEN COUNT(*) > 0 THEN (SUM(estimated_cost) / COUNT(*))::DECIMAL(12, 8)
      ELSE 0
    END as avg_cost_per_request
  FROM ai_usage_logs
  WHERE timestamp >= start_date
    AND timestamp <= end_date;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_ai_usage_summary TO authenticated;

COMMENT ON TABLE ai_usage_logs IS 'Tracks AI API usage for cost monitoring and analytics';
COMMENT ON COLUMN ai_usage_logs.model IS 'The AI model used (e.g., gpt-4o-mini, gemini-1.5-flash)';
COMMENT ON COLUMN ai_usage_logs.endpoint IS 'The API endpoint that made the request';
COMMENT ON COLUMN ai_usage_logs.estimated_cost IS 'Estimated cost in USD based on current pricing';
