-- 439_user_credits.sql
-- Freemium credits system for AI trip planning features

-- User credits table - tracks remaining credits per user
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'unlimited')),
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  credits_total INTEGER NOT NULL DEFAULT 3,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_credits UNIQUE (user_id)
);

-- Credit usage log - audit trail for credit transactions
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('plan_trip', 'plan_day', 'smart_suggestions', 'multi_day_plan', 'credit_reset', 'credit_purchase')),
  credits_used INTEGER NOT NULL DEFAULT 0,
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for user_credits
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_reset_at ON user_credits(reset_at);
CREATE INDEX IF NOT EXISTS idx_user_credits_plan_tier ON user_credits(plan_tier);

-- Indexes for credit_usage
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_usage_operation ON credit_usage(operation_type, created_at DESC);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_credits
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
CREATE POLICY "Users can update own credits" ON user_credits
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage credits" ON user_credits;
CREATE POLICY "Service role can manage credits" ON user_credits
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for credit_usage
DROP POLICY IF EXISTS "Users can view own usage" ON credit_usage;
CREATE POLICY "Users can view own usage" ON credit_usage
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON credit_usage;
CREATE POLICY "Users can insert own usage" ON credit_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage usage" ON credit_usage;
CREATE POLICY "Service role can manage usage" ON credit_usage
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Auto-update updated_at trigger for user_credits
CREATE OR REPLACE FUNCTION update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_credits_updated_at ON user_credits;
CREATE TRIGGER trigger_update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_user_credits_updated_at();

-- Function to initialize credits for new users (called by application)
CREATE OR REPLACE FUNCTION initialize_user_credits(p_user_id UUID)
RETURNS user_credits AS $$
DECLARE
  result user_credits;
BEGIN
  INSERT INTO user_credits (user_id, plan_tier, credits_remaining, credits_total, reset_at)
  VALUES (p_user_id, 'free', 3, 3, NOW() + INTERVAL '30 days')
  ON CONFLICT (user_id) DO NOTHING
  RETURNING * INTO result;

  -- If no insert happened (user already exists), fetch existing
  IF result IS NULL THEN
    SELECT * INTO result FROM user_credits WHERE user_id = p_user_id;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset credits for free tier users (for scheduled job)
CREATE OR REPLACE FUNCTION reset_expired_credits()
RETURNS INTEGER AS $$
DECLARE
  reset_count INTEGER;
BEGIN
  WITH reset_users AS (
    UPDATE user_credits
    SET
      credits_remaining = credits_total,
      reset_at = NOW() + INTERVAL '30 days',
      updated_at = NOW()
    WHERE reset_at <= NOW()
      AND plan_tier = 'free'
    RETURNING user_id, credits_total
  ),
  logged AS (
    INSERT INTO credit_usage (user_id, operation_type, credits_used, credits_before, credits_after, metadata)
    SELECT
      user_id,
      'credit_reset',
      0,
      0, -- We don't track exact before value in bulk reset
      credits_total,
      jsonb_build_object('reset_type', 'monthly_automatic')
    FROM reset_users
  )
  SELECT COUNT(*) INTO reset_count FROM reset_users;

  RETURN reset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
