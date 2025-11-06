-- ================================================
-- Phase 9: Smart Notification System
-- ================================================
-- Intelligent push notifications based on context
-- ================================================

-- ================================================
-- Notification Templates
-- ================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'recommendation', 'event', 'weather', 'social'
  
  -- Content
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  action_url_template TEXT,
  
  -- Priority
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Timing
  send_immediately BOOLEAN DEFAULT false,
  optimal_send_time TIME, -- e.g., 09:00:00 for morning notifications
  
  -- Constraints
  max_frequency_per_user_per_day INT DEFAULT 1,
  
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates
INSERT INTO notification_templates (template_key, name, category, title_template, body_template, priority) VALUES
('new_recommendation', 'New Recommendation', 'recommendation', 
  'New place for you: {destination_name}',
  'Based on your taste, we think you''ll love {destination_name} in {city}. {match_percentage}% match!',
  'normal'),
('weather_alert', 'Weather Alert', 'weather',
  'Weather update for {destination_name}',
  'Current conditions: {weather_condition}. {weather_score_message}',
  'low'),
('event_reminder', 'Event Reminder', 'event',
  'Reminder: {event_name}',
  '{event_name} starts in {hours_until} hours at {venue_name}',
  'high'),
('nearby_destination', 'Nearby Destination', 'recommendation',
  'You''re near {destination_name}',
  'You''re close to {destination_name}, a place you saved. Open now!',
  'normal');

-- ================================================
-- User Notification Preferences
-- ================================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Global settings
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  
  -- Category preferences
  recommendations_enabled BOOLEAN DEFAULT true,
  events_enabled BOOLEAN DEFAULT true,
  weather_enabled BOOLEAN DEFAULT false,
  social_enabled BOOLEAN DEFAULT true,
  
  -- Timing preferences
  quiet_hours_start TIME, -- e.g., 22:00:00
  quiet_hours_end TIME, -- e.g., 08:00:00
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Frequency limits
  max_notifications_per_day INT DEFAULT 5,
  
  -- Device tokens (for push notifications)
  device_tokens JSONB, -- [{"token": "...", "platform": "ios", "added_at": "..."}]
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_notif_prefs_user ON user_notification_preferences(user_id);

-- ================================================
-- Notification Queue
-- ================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key VARCHAR(100) REFERENCES notification_templates(template_key),
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  data JSONB, -- Additional context data
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal',
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Delivery
  delivery_channel VARCHAR(20), -- 'push', 'email', 'both'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notif_queue_user ON notification_queue(user_id);
CREATE INDEX idx_notif_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notif_queue_status ON notification_queue(status);

-- ================================================
-- Notification History
-- ================================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key VARCHAR(100),
  
  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Delivery
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_channel VARCHAR(20),
  
  -- Engagement
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP WITH TIME ZONE,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notif_history_user ON notification_history(user_id);
CREATE INDEX idx_notif_history_sent_at ON notification_history(sent_at DESC);

-- ================================================
-- Helper Functions
-- ================================================

-- Check if user can receive notification
CREATE OR REPLACE FUNCTION can_send_notification(
  uid UUID,
  template_key_param VARCHAR(100),
  category_param VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs RECORD;
  today_count INT;
  template RECORD;
BEGIN
  -- Get user preferences
  SELECT * INTO prefs FROM user_notification_preferences WHERE user_id = uid;
  
  IF NOT FOUND OR NOT prefs.push_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check category preference
  IF category_param = 'recommendation' AND NOT prefs.recommendations_enabled THEN
    RETURN FALSE;
  ELSIF category_param = 'event' AND NOT prefs.events_enabled THEN
    RETURN FALSE;
  ELSIF category_param = 'weather' AND NOT prefs.weather_enabled THEN
    RETURN FALSE;
  ELSIF category_param = 'social' AND NOT prefs.social_enabled THEN
    RETURN FALSE;
  END IF;
  
  -- Check daily limit
  SELECT COUNT(*) INTO today_count
  FROM notification_history
  WHERE user_id = uid
    AND sent_at >= CURRENT_DATE;
    
  IF today_count >= prefs.max_notifications_per_day THEN
    RETURN FALSE;
  END IF;
  
  -- Check template frequency limit
  SELECT * INTO template FROM notification_templates WHERE template_key = template_key_param;
  
  IF FOUND AND template.max_frequency_per_user_per_day > 0 THEN
    SELECT COUNT(*) INTO today_count
    FROM notification_history
    WHERE user_id = uid
      AND template_key = template_key_param
      AND sent_at >= CURRENT_DATE;
      
    IF today_count >= template.max_frequency_per_user_per_day THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Public read for active templates
CREATE POLICY "Active notification templates are public" ON notification_templates
  FOR SELECT USING (active = true);

-- Users can read/write their own preferences
CREATE POLICY "Users can manage own notification prefs" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Users can read their own queue and history
CREATE POLICY "Users can read own notification queue" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own notification history" ON notification_history
  FOR SELECT USING (auth.uid() = user_id);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE notification_templates IS 'Reusable notification templates';
COMMENT ON TABLE user_notification_preferences IS 'User notification settings and device tokens';
COMMENT ON TABLE notification_queue IS 'Pending notifications to be sent';
COMMENT ON TABLE notification_history IS 'Delivered notifications and engagement';

COMMENT ON FUNCTION can_send_notification IS 'Checks if user can receive a notification based on preferences and limits';
