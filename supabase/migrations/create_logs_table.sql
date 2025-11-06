-- Create logs table in Supabase
-- Run this migration in your Supabase SQL editor

-- Create logs table
CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level VARCHAR(10) NOT NULL, -- trace, debug, info, warn, error, fatal
  type VARCHAR(50), -- security, performance, rate_limit, upload, etc.
  message TEXT NOT NULL,
  user_id UUID,
  context JSONB, -- Additional context data
  error JSONB, -- Error details (message, stack, name)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_type ON logs(type);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read logs
CREATE POLICY "Admins can read logs"
  ON logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: System can insert logs (service role)
CREATE POLICY "System can insert logs"
  ON logs
  FOR INSERT
  WITH CHECK (true);

-- Create function to clean up old logs (optional - keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Create scheduled job to run cleanup weekly (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-logs', '0 0 * * 0', 'SELECT cleanup_old_logs();');

COMMENT ON TABLE logs IS 'Application logs for monitoring and debugging';
COMMENT ON COLUMN logs.level IS 'Log level: trace, debug, info, warn, error, fatal';
COMMENT ON COLUMN logs.type IS 'Log type/category: security, performance, rate_limit, etc.';
COMMENT ON COLUMN logs.context IS 'Additional context data as JSON';
COMMENT ON COLUMN logs.error IS 'Error details including message and stack trace';
