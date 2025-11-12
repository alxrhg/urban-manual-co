-- User event tracking tables for personalization
CREATE TABLE IF NOT EXISTS public.user_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id BIGINT NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'save', 'visited')),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  metadata JSONB DEFAULT '{}'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_event_log_user_date ON public.user_event_log (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_event_log_destination ON public.user_event_log (destination_id);

ALTER TABLE public.user_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can insert own event log" ON public.user_event_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own event log" ON public.user_event_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Daily metrics rollups per user
CREATE TABLE IF NOT EXISTS public.user_daily_metrics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  visited INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT user_daily_metrics_unique UNIQUE (user_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_metrics_user_date ON public.user_daily_metrics (user_id, event_date DESC);

ALTER TABLE public.user_daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own daily metrics" ON public.user_daily_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own daily metrics" ON public.user_daily_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own daily metrics" ON public.user_daily_metrics
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Extend user_preferences with price tier vectors if missing
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS price_tier_scores JSONB DEFAULT '{}'::jsonb;

UPDATE public.user_preferences
SET price_tier_scores = COALESCE(price_tier_scores, '{}'::jsonb);
