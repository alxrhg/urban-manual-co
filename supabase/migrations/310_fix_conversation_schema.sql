-- Migration 310: Fix conversation schema conflicts
-- Reconciles differences between old migration 025 and new migration 300
-- Safe to run even if already on correct schema

BEGIN;

-- ============================================================================
-- FIX CONVERSATION_MESSAGES SCHEMA
-- ============================================================================

-- Rename old columns to new schema if they exist
DO $$
BEGIN
  -- Fix message_text -> content
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages'
    AND column_name = 'message_text'
  ) THEN
    ALTER TABLE conversation_messages RENAME COLUMN message_text TO content;
  END IF;

  -- Fix message_type -> role
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages'
    AND column_name = 'message_type'
  ) THEN
    ALTER TABLE conversation_messages RENAME COLUMN message_type TO role;
  END IF;

  -- Fix detected_intent -> intent_data and change to JSONB
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages'
    AND column_name = 'detected_intent'
  ) THEN
    -- Add new intent_data column
    ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS intent_data JSONB;

    -- Try to migrate data if possible
    UPDATE conversation_messages
    SET intent_data = jsonb_build_object('intent', detected_intent)
    WHERE detected_intent IS NOT NULL AND intent_data IS NULL;

    -- Drop old column
    ALTER TABLE conversation_messages DROP COLUMN IF EXISTS detected_intent;
  END IF;

  -- Remove extracted_entities if it exists (not used in new schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_messages'
    AND column_name = 'extracted_entities'
  ) THEN
    ALTER TABLE conversation_messages DROP COLUMN extracted_entities;
  END IF;
END $$;

-- Add missing columns from new schema
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS destinations JSONB;
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Ensure role CHECK constraint is correct
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_message_type_check;
  ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_role_check;

  -- Add correct constraint
  ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_role_check
    CHECK (role IN ('user', 'assistant', 'system'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FIX CONVERSATION_SESSIONS SCHEMA
-- ============================================================================

-- Add missing columns from new schema
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS context_summary TEXT;
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS session_token TEXT;

-- Rename last_updated to updated_at if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_sessions'
    AND column_name = 'last_updated'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_sessions'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE conversation_sessions RENAME COLUMN last_updated TO updated_at;
  END IF;
END $$;

-- Ensure session_token is unique
CREATE UNIQUE INDEX IF NOT EXISTS conversation_sessions_session_token_key
  ON conversation_sessions(session_token)
  WHERE session_token IS NOT NULL;

-- ============================================================================
-- ENSURE ALL INDEXES EXIST
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user
  ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_activity
  ON conversation_sessions(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_token
  ON conversation_sessions(session_token)
  WHERE session_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conv_sessions_user
  ON conversation_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_sessions_active
  ON conversation_sessions(user_id, ended_at)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_messages_session
  ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created
  ON conversation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user
  ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_messages_session
  ON conversation_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_messages_user
  ON conversation_messages(user_id, created_at DESC);

-- Index for embedding similarity search (if pgvector extension is enabled)
DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_conv_messages_embedding
    ON conversation_messages USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
    WHERE embedding IS NOT NULL;
EXCEPTION
  WHEN undefined_object THEN
    -- pgvector not installed, skip embedding index
    NULL;
END $$;

COMMIT;
