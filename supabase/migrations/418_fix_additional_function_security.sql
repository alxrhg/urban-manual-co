-- Migration: Fix additional functions with mutable search_path
-- Addresses 17 more functions that have mutable search_path security issues

-- ============================================================================
-- FIX MUTABLE SEARCH_PATH FOR ADDITIONAL FUNCTIONS
-- ============================================================================

DO $$
DECLARE
  func_name TEXT;
  func_list TEXT[] := ARRAY[
    'increment_preference_count',
    'increment_saves',
    'increment_views_by_slug',
    'increment_views',
    'match_destinations',
    'notify_asimov_sync',
    'refresh_destination_stats',
    'search_destinations',
    'search_tags',
    'update_destination_save_count',
    'update_destinations_search_text',
    'update_discovery_prompts_updated_at',
    'update_review_helpful_count',
    'update_search_text',
    'update_session_activity',
    'update_session_context',
    'update_updated_at_column'
  ];
BEGIN
  FOREACH func_name IN ARRAY func_list
  LOOP
    -- Only update if function exists
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = func_name
    ) THEN
      -- Set search_path to immutable (only public schema)
      EXECUTE format('ALTER FUNCTION public.%I SET search_path = public', func_name);
      RAISE NOTICE 'Fixed search_path for function: %', func_name;
    ELSE
      RAISE NOTICE 'Function not found, skipping: %', func_name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- NOTE ON PASSWORD PROTECTION
-- ============================================================================

-- The password protection feature (HavelBeenPwned.org check) should be enabled
-- via the Supabase Dashboard:
-- Settings → Authentication → Password Protection
-- 
-- This cannot be enabled via SQL migration, it's a dashboard setting.

COMMENT ON SCHEMA public IS 'Security: All functions have immutable search_path to prevent injection attacks';

