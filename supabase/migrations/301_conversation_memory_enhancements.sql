-- Migration 301: Conversation memory cache + summarization queue
-- Adds summary queue, embedding storage, structured context columns, and archiving table

BEGIN;

ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_embedding vector(1536),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ttl_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS preference_budget_min NUMERIC,
  ADD COLUMN IF NOT EXISTS preference_budget_max NUMERIC,
  ADD COLUMN IF NOT EXISTS preference_currency TEXT,
  ADD COLUMN IF NOT EXISTS preference_categories TEXT[],
  ADD COLUMN IF NOT EXISTS preference_cuisines TEXT[];

CREATE TABLE IF NOT EXISTS conversation_summary_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  priority SMALLINT DEFAULT 5,
  attempts INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_summary_jobs_status
  ON conversation_summary_jobs(status, priority, scheduled_at);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conv_summary_jobs_active
  ON conversation_summary_jobs(session_id)
  WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS conversation_session_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_session_summaries_session
  ON conversation_session_summaries(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS conversation_session_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID,
  summary TEXT,
  context JSONB,
  message_count INT,
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_session_archives_user
  ON conversation_session_archives(user_id, archived_at DESC);

COMMIT;
