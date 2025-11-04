-- Migration 027: Add Session Token for Anonymous Users
-- Created: 2025-11-04
-- Purpose: Enable anonymous users to maintain conversation sessions

BEGIN;

-- Add session_token column to conversation_sessions
ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS session_token TEXT UNIQUE;

-- Add context and context_summary columns if they don't exist
ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}';

ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS context_summary TEXT;

ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for session_token lookups
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_token
ON conversation_sessions(session_token)
WHERE session_token IS NOT NULL;

-- Add role column to conversation_messages (already exists in schema but ensure it's there)
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Update check constraint to include new role types
ALTER TABLE conversation_messages
DROP CONSTRAINT IF EXISTS conversation_messages_role_check;

ALTER TABLE conversation_messages
ADD CONSTRAINT conversation_messages_role_check
CHECK (role IN ('user', 'assistant', 'system'));

-- Add content column (rename from message_text if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages' AND column_name = 'message_text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE conversation_messages RENAME COLUMN message_text TO content;
  END IF;
END $$;

-- Add intent_data and destinations columns for rich context
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS intent_data JSONB;

ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS destinations JSONB;

-- Function to generate secure session tokens
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'sess_' || encode(gen_random_bytes(24), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_conversation_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS conversation_sessions_updated_at ON conversation_sessions;
CREATE TRIGGER conversation_sessions_updated_at
  BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_session_updated_at();

-- Add service role policies for anonymous sessions
DROP POLICY IF EXISTS "Service role can manage all sessions" ON conversation_sessions;
CREATE POLICY "Service role can manage all sessions"
  ON conversation_sessions FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all messages" ON conversation_messages;
CREATE POLICY "Service role can manage all messages"
  ON conversation_messages FOR ALL
  USING (auth.role() = 'service_role');

-- Comments
COMMENT ON COLUMN conversation_sessions.session_token IS 'Unique token for anonymous user sessions';
COMMENT ON COLUMN conversation_sessions.context IS 'Current conversation context (city, category, preferences, etc.)';
COMMENT ON COLUMN conversation_sessions.context_summary IS 'AI-generated summary of conversation for long sessions';
COMMENT ON FUNCTION generate_session_token() IS 'Generates secure session tokens for anonymous users';

COMMIT;
