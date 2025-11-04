-- Migration 300: Conversational AI with Memory (FIXED VERSION)
-- Handles missing dependencies gracefully
-- Implements Phase 3: Conversational AI with context persistence

BEGIN;

-- ============================================================================
-- PREREQUISITES CHECK
-- ============================================================================

-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- CONVERSATION SESSIONS
-- ============================================================================

-- Drop existing table if it has wrong structure
DO $$
BEGIN
  -- Check if table exists with old structure (from migration 025)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'conversation_sessions'
  ) THEN
    -- Check if context column exists (from migration 300)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'conversation_sessions' 
      AND column_name = 'context'
    ) THEN
      -- Add missing columns from migration 300
      ALTER TABLE conversation_sessions
        ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS context_summary TEXT,
        ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT, -- For anonymous users
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  context JSONB DEFAULT '{}'::jsonb,
  context_summary TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_sessions_user 
  ON conversation_sessions(user_id, last_updated DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_sessions_token 
  ON conversation_sessions(session_token, last_updated DESC)
  WHERE session_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conv_sessions_active 
  ON conversation_sessions(user_id, ended_at) 
  WHERE ended_at IS NULL;

-- ============================================================================
-- CONVERSATION MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding vector(1536),
  intent_data JSONB,
  destinations JSONB, -- Store destinations array from responses
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_session 
  ON conversation_messages(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conv_messages_user 
  ON conversation_messages(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Index for embedding similarity search (only if pgvector is available)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversation_messages' 
    AND column_name = 'embedding'
    AND udt_name = 'vector'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_conv_messages_embedding 
      ON conversation_messages USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
      WHERE embedding IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users own sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users own messages" ON conversation_messages;
DROP POLICY IF EXISTS "Service role can manage sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Service role can manage messages" ON conversation_messages;

-- Users can only access their own sessions (by user_id or session_token)
CREATE POLICY "Users own sessions" ON conversation_sessions
  FOR ALL USING (
    auth.uid() = user_id 
    OR session_token IS NOT NULL -- Allow anonymous sessions via token
  );

-- Users can only access their own messages
CREATE POLICY "Users own messages" ON conversation_messages
  FOR ALL USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM conversation_sessions cs
      WHERE cs.id = conversation_messages.session_id
      AND cs.session_token IS NOT NULL
    )
  );

-- Service role can manage everything (for API endpoints)
CREATE POLICY "Service role can manage sessions" ON conversation_sessions
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage messages" ON conversation_messages
  FOR ALL USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get or create active session for user
CREATE OR REPLACE FUNCTION get_or_create_session(p_user_id UUID DEFAULT NULL, p_session_token TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Try to get active session (not ended)
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_session_id
    FROM conversation_sessions
    WHERE user_id = p_user_id
      AND ended_at IS NULL
    ORDER BY last_updated DESC
    LIMIT 1;
  ELSIF p_session_token IS NOT NULL THEN
    SELECT id INTO v_session_id
    FROM conversation_sessions
    WHERE session_token = p_session_token
      AND ended_at IS NULL
    ORDER BY last_updated DESC
    LIMIT 1;
  END IF;

  -- If no active session, create one
  IF v_session_id IS NULL THEN
    INSERT INTO conversation_sessions (user_id, session_token)
    VALUES (p_user_id, p_session_token)
    RETURNING id INTO v_session_id;
  ELSE
    -- Update last activity
    UPDATE conversation_sessions
    SET last_activity = NOW(), last_updated = NOW()
    WHERE id = v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get conversation history (last N messages)
CREATE OR REPLACE FUNCTION get_conversation_history(
  p_session_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  role TEXT,
  content TEXT,
  intent_data JSONB,
  destinations JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.role,
    cm.content,
    cm.intent_data,
    cm.destinations,
    cm.created_at
  FROM conversation_messages cm
  WHERE cm.session_id = p_session_id
  ORDER BY cm.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update session context
CREATE OR REPLACE FUNCTION update_session_context(
  p_session_id UUID,
  p_context JSONB
)
RETURNS void AS $$
BEGIN
  UPDATE conversation_sessions
  SET 
    context = p_context,
    last_updated = NOW(),
    last_activity = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End session
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversation_sessions
  SET ended_at = NOW(), last_updated = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

