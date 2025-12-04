-- Migration: Create trip_reminders_sent table
-- Purpose: Track which trip reminders have been sent to avoid duplicates

CREATE TABLE IF NOT EXISTS trip_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_type VARCHAR(50) NOT NULL, -- 'week_before', '3_days_before', 'day_before'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, reminder_type)
);

-- Index for efficient lookups by trip_id
CREATE INDEX IF NOT EXISTS idx_trip_reminders_sent_trip_id ON trip_reminders_sent(trip_id);

-- Index for cleanup queries (delete old reminders)
CREATE INDEX IF NOT EXISTS idx_trip_reminders_sent_sent_at ON trip_reminders_sent(sent_at);

-- RLS policies (service role only - cron jobs use service role)
ALTER TABLE trip_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for cron job)
CREATE POLICY "Service role can manage trip reminders"
  ON trip_reminders_sent
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE trip_reminders_sent IS 'Tracks sent trip reminder emails to prevent duplicate sends';
COMMENT ON COLUMN trip_reminders_sent.reminder_type IS 'Type of reminder: week_before, 3_days_before, day_before';
