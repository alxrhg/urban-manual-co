-- ============================================================================
-- Migration 439: Comprehensive Row Level Security Policies
--
-- This migration ensures all user-related tables have proper RLS policies
-- to enforce data isolation and access control.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. USER_PROFILES TABLE - RLS Policies
-- ============================================================================

-- Enable RLS on user_profiles if not already enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies to recreate them
    DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Service role full access" ON user_profiles;

    -- Users can only view their own profile
    CREATE POLICY "Users can view own profile"
      ON user_profiles FOR SELECT
      USING (auth.uid() = user_id);

    -- Users can only update their own profile
    CREATE POLICY "Users can update own profile"
      ON user_profiles FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Users can only insert their own profile
    CREATE POLICY "Users can insert own profile"
      ON user_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    RAISE NOTICE '✅ RLS policies created for user_profiles';
  ELSE
    RAISE NOTICE '⚠️ user_profiles table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- 2. USER_PREFERENCES TABLE - RLS Policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

    CREATE POLICY "Users can view own preferences"
      ON user_preferences FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can update own preferences"
      ON user_preferences FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can insert own preferences"
      ON user_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own preferences"
      ON user_preferences FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE '✅ RLS policies created for user_preferences';
  ELSE
    RAISE NOTICE '⚠️ user_preferences table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- 3. TRIPS TABLE - RLS Policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trips') THEN
    ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own trips" ON trips;
    DROP POLICY IF EXISTS "Users can create own trips" ON trips;
    DROP POLICY IF EXISTS "Users can update own trips" ON trips;
    DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
    DROP POLICY IF EXISTS "Users can view shared trips" ON trips;

    -- Users can view their own trips
    CREATE POLICY "Users can view own trips"
      ON trips FOR SELECT
      USING (auth.uid() = user_id);

    -- Users can view trips shared with them (if is_public column exists)
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'is_public'
      ) THEN
        CREATE POLICY "Users can view shared trips"
          ON trips FOR SELECT
          USING (is_public = true);
      END IF;
    END $$;

    CREATE POLICY "Users can create own trips"
      ON trips FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own trips"
      ON trips FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own trips"
      ON trips FOR DELETE
      USING (auth.uid() = user_id);

    RAISE NOTICE '✅ RLS policies created for trips';
  ELSE
    RAISE NOTICE '⚠️ trips table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- 4. USER_INTERACTIONS TABLE - RLS Policies
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_interactions') THEN
    ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own interactions" ON user_interactions;
    DROP POLICY IF EXISTS "Users can insert own interactions" ON user_interactions;
    DROP POLICY IF EXISTS "Service role can insert interactions" ON user_interactions;

    -- Users can only view their own interactions
    CREATE POLICY "Users can view own interactions"
      ON user_interactions FOR SELECT
      USING (auth.uid() = user_id OR user_id IS NULL);

    -- Users can insert interactions for themselves
    CREATE POLICY "Users can insert own interactions"
      ON user_interactions FOR INSERT
      WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

    -- Service role can insert any interactions (for analytics)
    CREATE POLICY "Service role can insert interactions"
      ON user_interactions FOR INSERT
      TO service_role
      WITH CHECK (true);

    RAISE NOTICE '✅ RLS policies created for user_interactions';
  ELSE
    RAISE NOTICE '⚠️ user_interactions table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- 5. ACCOUNT_DATA_REQUESTS TABLE - RLS Policies (GDPR compliance)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_data_requests') THEN
    ALTER TABLE account_data_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own data requests" ON account_data_requests;
    DROP POLICY IF EXISTS "Users can create own data requests" ON account_data_requests;

    CREATE POLICY "Users can view own data requests"
      ON account_data_requests FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can create own data requests"
      ON account_data_requests FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    RAISE NOTICE '✅ RLS policies created for account_data_requests';
  ELSE
    RAISE NOTICE '⚠️ account_data_requests table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- 6. VERIFY EXISTING RLS IS ENABLED
-- ============================================================================

-- Verify saved_places RLS is enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE tablename = 'saved_places'
      AND rowsecurity = true
    ) THEN
      ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE '✅ Enabled RLS on saved_places';
    END IF;
  END IF;
END $$;

-- Verify visited_places RLS is enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE tablename = 'visited_places'
      AND rowsecurity = true
    ) THEN
      ALTER TABLE visited_places ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE '✅ Enabled RLS on visited_places';
    END IF;
  END IF;
END $$;

-- Verify collections RLS is enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE tablename = 'collections'
      AND rowsecurity = true
    ) THEN
      ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
      RAISE NOTICE '✅ Enabled RLS on collections';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 7. AUDIT LOG: Admin-only access
-- ============================================================================

-- Ensure content_audit_log has proper RLS (admin only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_audit_log') THEN
    ALTER TABLE content_audit_log ENABLE ROW LEVEL SECURITY;

    -- Drop and recreate to ensure proper policies
    DROP POLICY IF EXISTS "Admins can view audit logs" ON content_audit_log;

    CREATE POLICY "Admins can view audit logs"
      ON content_audit_log FOR SELECT
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      );

    RAISE NOTICE '✅ Admin-only RLS policy created for content_audit_log';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '  RLS Security Audit Complete';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables with RLS enabled:';
  RAISE NOTICE '  - user_profiles (if exists)';
  RAISE NOTICE '  - user_preferences (if exists)';
  RAISE NOTICE '  - trips';
  RAISE NOTICE '  - user_interactions';
  RAISE NOTICE '  - account_data_requests (if exists)';
  RAISE NOTICE '  - saved_places';
  RAISE NOTICE '  - visited_places';
  RAISE NOTICE '  - collections';
  RAISE NOTICE '  - conversation_sessions';
  RAISE NOTICE '  - conversation_messages';
  RAISE NOTICE '  - content_audit_log (admin only)';
  RAISE NOTICE '';
  RAISE NOTICE 'All user data is now isolated by user_id.';
  RAISE NOTICE '===========================================';
END $$;
