-- Create destination_reports table for tracking user-reported issues
CREATE TABLE IF NOT EXISTS destination_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'closed_permanently',
    'wrong_hours',
    'wrong_location',
    'wrong_contact',
    'wrong_description',
    'duplicate',
    'inappropriate',
    'other'
  )),
  details TEXT,
  reporter_email TEXT,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_destination_reports_destination_id ON destination_reports(destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_reports_status ON destination_reports(status);
CREATE INDEX IF NOT EXISTS idx_destination_reports_created_at ON destination_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_destination_reports_issue_type ON destination_reports(issue_type);

-- Enable RLS
ALTER TABLE destination_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY "Anyone can create reports" ON destination_reports
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports" ON destination_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports" ON destination_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policy: Admins can update reports
CREATE POLICY "Admins can update reports" ON destination_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_destination_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_destination_reports_updated_at
  BEFORE UPDATE ON destination_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_destination_reports_updated_at();
