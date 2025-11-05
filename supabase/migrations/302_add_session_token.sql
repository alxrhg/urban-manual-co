-- Migration 302: Add session_token for anonymous user support
-- Allows anonymous users to maintain conversation sessions across page refreshes

BEGIN;

-- Add session_token column to conversation_sessions
ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS session_token TEXT UNIQUE;

-- Create index for fast lookups by session_token
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_token
ON conversation_sessions(session_token)
WHERE session_token IS NOT NULL;

-- Update RLS policies to allow anonymous sessions via session_token
-- Drop and recreate the view policy to include session_token
DROP POLICY IF EXISTS "Users can view own sessions" ON conversation_sessions;
CREATE POLICY "Users can view own sessions"
  ON conversation_sessions FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL
  );

-- Update RLS for messages to allow access via session relationship
DROP POLICY IF EXISTS "Users can view own messages" ON conversation_messages;
CREATE POLICY "Users can view own messages"
  ON conversation_messages FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL
    OR EXISTS (
      SELECT 1 FROM conversation_sessions
      WHERE conversation_sessions.id = conversation_messages.session_id
      AND (conversation_sessions.user_id = auth.uid() OR conversation_sessions.user_id IS NULL)
    )
  );

COMMIT;
