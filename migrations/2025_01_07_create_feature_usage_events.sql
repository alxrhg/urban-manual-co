-- Track chat feature usage analytics events
CREATE TABLE IF NOT EXISTS feature_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_events_type ON feature_usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_feature_usage_events_created_at ON feature_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_events_user ON feature_usage_events(user_id);
