-- ================================================
-- Phase 10: Weekly Personalized Email System
-- ================================================
-- Curated weekly email digests with recommendations
-- ================================================

-- ================================================
-- Email Templates
-- ================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT,
  
  -- Sections (JSON array of section configs)
  sections JSONB, -- [{"type": "hero", "title": "...", ...}, ...]
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default weekly digest template
INSERT INTO email_templates (template_key, name, subject_template, html_template, sections) VALUES
('weekly_digest', 'Weekly Digest', 
  'Your weekly Urban Manual digest',
  '<html><body>{{content}}</body></html>',
  '[
    {"type": "hero", "title": "This Week for You"},
    {"type": "recommendations", "count": 5},
    {"type": "events", "count": 3},
    {"type": "weather"},
    {"type": "stats"}
  ]'::jsonb);

-- ================================================
-- Email Subscriptions
-- ================================================

CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  
  -- Subscription preferences
  subscribed BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  preferred_day_of_week INT DEFAULT 1, -- 1 = Monday
  preferred_time TIME DEFAULT '09:00:00',
  
  -- Unsubscribe
  unsubscribe_token VARCHAR(255) UNIQUE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_email_subscriptions_user ON email_subscriptions(user_id);
CREATE INDEX idx_email_subscriptions_subscribed ON email_subscriptions(subscribed);

-- ================================================
-- Email Send History
-- ================================================

CREATE TABLE IF NOT EXISTS email_send_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  template_key VARCHAR(100),
  
  -- Content
  subject TEXT NOT NULL,
  preview_text TEXT,
  
  -- Delivery
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  provider VARCHAR(50), -- 'sendgrid', 'ses', 'resend'
  external_id VARCHAR(255),
  
  -- Engagement
  opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Data
  content_data JSONB, -- Snapshot of recommendations, events, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_history_user ON email_send_history(user_id);
CREATE INDEX idx_email_history_sent_at ON email_send_history(sent_at DESC);

-- ================================================
-- Email Content Cache
-- ================================================

CREATE TABLE IF NOT EXISTS email_content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  
  -- Cached content
  recommendations JSONB,
  events JSONB,
  stats JSONB,
  weather JSONB,
  
  -- Generation
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, week_start_date)
);

CREATE INDEX idx_email_cache_user ON email_content_cache(user_id);
CREATE INDEX idx_email_cache_week ON email_content_cache(week_start_date);

-- ================================================
-- Helper Functions
-- ================================================

-- Get users due for weekly email
CREATE OR REPLACE FUNCTION get_users_due_for_weekly_email()
RETURNS TABLE(
  user_id UUID,
  email VARCHAR(255),
  preferred_time TIME
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.user_id,
    es.email,
    es.preferred_time
  FROM email_subscriptions es
  WHERE es.subscribed = true
    AND es.frequency = 'weekly'
    AND es.preferred_day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INT
    -- Check if not sent today
    AND NOT EXISTS (
      SELECT 1 FROM email_send_history esh
      WHERE esh.user_id = es.user_id
        AND esh.sent_at >= CURRENT_DATE
        AND esh.template_key = 'weekly_digest'
    );
END;
$$ LANGUAGE plpgsql;

-- Generate unsubscribe token
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_content_cache ENABLE ROW LEVEL SECURITY;

-- Public read for active templates
CREATE POLICY "Active email templates are public" ON email_templates
  FOR SELECT USING (active = true);

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own email subscriptions" ON email_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Users can read their own send history
CREATE POLICY "Users can read own email history" ON email_send_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own content cache
CREATE POLICY "Users can read own content cache" ON email_content_cache
  FOR SELECT USING (auth.uid() = user_id);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE email_templates IS 'Email templates with HTML/text versions';
COMMENT ON TABLE email_subscriptions IS 'User email subscription preferences';
COMMENT ON TABLE email_send_history IS 'Sent emails with engagement metrics';
COMMENT ON TABLE email_content_cache IS 'Cached email content for performance';

COMMENT ON FUNCTION get_users_due_for_weekly_email IS 'Returns users who should receive weekly email today';
