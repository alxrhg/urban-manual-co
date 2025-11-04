-- Migration Status Check Script
-- Run this in Supabase SQL Editor to see what's already implemented
-- Date: November 4, 2025

-- ============================================================================
-- PART 1: CORE TABLES CHECK
-- ============================================================================

SELECT 
  'CORE TABLES' as category,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places') THEN '✅ saved_places'
    ELSE '❌ saved_places MISSING'
  END as status
UNION ALL
SELECT 
  'CORE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places') THEN '✅ visited_places'
    ELSE '❌ visited_places MISSING'
  END
UNION ALL
SELECT 
  'CORE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_sessions') THEN '✅ conversation_sessions'
    ELSE '❌ conversation_sessions MISSING'
  END
UNION ALL
SELECT 
  'CORE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_messages') THEN '✅ conversation_messages'
    ELSE '❌ conversation_messages MISSING'
  END
UNION ALL
SELECT 
  'INTELLIGENCE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_visit_signals') THEN '✅ co_visit_signals'
    ELSE '❌ co_visit_signals MISSING'
  END
UNION ALL
SELECT 
  'INTELLIGENCE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personalization_scores') THEN '✅ personalization_scores'
    ELSE '❌ personalization_scores MISSING'
  END
UNION ALL
SELECT 
  'INTELLIGENCE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forecasting_data') THEN '✅ forecasting_data'
    ELSE '❌ forecasting_data MISSING'
  END
UNION ALL
SELECT 
  'INTELLIGENCE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opportunity_alerts') THEN '✅ opportunity_alerts'
    ELSE '❌ opportunity_alerts MISSING'
  END
UNION ALL
SELECT 
  'INTELLIGENCE TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'destination_relationships') THEN '✅ destination_relationships'
    ELSE '❌ destination_relationships MISSING'
  END
UNION ALL
SELECT 
  'LOCATION TABLES',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations') THEN '✅ locations'
    ELSE '❌ locations MISSING'
  END
ORDER BY category, status;

-- ============================================================================
-- PART 2: DESTINATIONS TABLE COLUMNS CHECK
-- ============================================================================

SELECT 
  'DESTINATIONS COLUMNS' as category,
  column_name,
  data_type,
  CASE 
    WHEN column_name IS NOT NULL THEN '✅'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.columns 
WHERE table_name = 'destinations' 
  AND column_name IN (
    -- Core columns (should always exist)
    'id', 'slug', 'name', 'city', 'category',
    -- Vector search (023)
    'embedding',
    -- Intelligence (018, 200)
    'rank_score', 'is_open_now', 'views_count', 'saves_count', 'trending_score',
    -- Enrichment (026)
    'photos_json', 'primary_photo_url', 'photo_count',
    'current_weather_json', 'weather_forecast_json', 'weather_updated_at',
    'nearby_events_json', 'events_updated_at', 'upcoming_event_count',
    'route_from_city_center_json', 'walking_time_from_center_minutes',
    'static_map_url', 'currency_code', 'exchange_rate_to_usd',
    'advanced_enrichment_at', 'enrichment_version'
  )
ORDER BY 
  CASE 
    WHEN column_name IN ('id', 'slug', 'name', 'city', 'category') THEN 1
    WHEN column_name = 'embedding' THEN 2
    WHEN column_name IN ('rank_score', 'is_open_now') THEN 3
    WHEN column_name LIKE '%_json' OR column_name LIKE '%_url' THEN 4
    ELSE 5
  END,
  column_name;

-- ============================================================================
-- PART 3: FUNCTIONS CHECK
-- ============================================================================

SELECT 
  'FUNCTIONS' as category,
  routine_name as function_name,
  CASE 
    WHEN routine_name IS NOT NULL THEN '✅'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    -- Core helpers (021, 022)
    'get_user_saved_destinations',
    'get_user_visited_destinations',
    -- Vector search (024, 025)
    'search_destinations_hybrid',
    'match_destinations',
    -- Intelligence (200)
    'compute_rank_scores',
    'compute_trending_scores',
    -- Conversational AI (300)
    'get_or_create_session',
    'get_conversation_history',
    'update_session_context',
    'end_session'
  )
ORDER BY routine_name;

-- ============================================================================
-- PART 4: EXTENSIONS CHECK
-- ============================================================================

SELECT 
  'EXTENSIONS' as category,
  extname as extension_name,
  CASE 
    WHEN extname IS NOT NULL THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED'
  END as status
FROM pg_extension
WHERE extname IN ('vector', 'pg_trgm', 'uuid-ossp');

-- ============================================================================
-- PART 5: CONVERSATION MESSAGES COLUMNS CHECK
-- ============================================================================

SELECT 
  'CONVERSATION MESSAGES COLUMNS' as category,
  column_name,
  data_type,
  CASE 
    WHEN column_name IS NOT NULL THEN '✅'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.columns 
WHERE table_name = 'conversation_messages' 
  AND column_name IN (
    'id', 'session_id', 'user_id', 'role', 'content',
    'embedding', 'intent_data', 'created_at'
  )
ORDER BY column_name;

-- ============================================================================
-- PART 6: MIGRATION SUMMARY
-- ============================================================================

SELECT 
  'MIGRATION SUMMARY' as category,
  migration_name,
  CASE 
    WHEN all_checks_pass THEN '✅ COMPLETE'
    ELSE '⚠️ INCOMPLETE'
  END as status,
  all_checks_pass
FROM (
  SELECT 
    '019_audit_current_state' as migration_name,
    TRUE as all_checks_pass  -- Schema audit, always passes
  UNION ALL
  SELECT 
    '020_consolidate_schema',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places')
  UNION ALL
  SELECT 
    '021_add_helper_functions',
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_saved_destinations')
      AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_visited_destinations')
  UNION ALL
  SELECT 
    '022_add_tags_to_rpc',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'saved_places' AND column_name = 'tags'
    )
  UNION ALL
  SELECT 
    '023_enable_vector_search',
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'destinations' AND column_name = 'embedding'
      )
  UNION ALL
  SELECT 
    '024_hybrid_search_function',
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'search_destinations_hybrid')
  UNION ALL
  SELECT 
    '025_fix_embedding_dimension',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destinations' 
        AND column_name = 'embedding'
        AND udt_name = 'vector'
    )
  UNION ALL
  SELECT 
    '018_intelligence',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destinations' 
        AND column_name IN ('rank_score', 'is_open_now')
    )
  UNION ALL
  SELECT 
    '200_complete_intelligence',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_visit_signals')
      AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'compute_rank_scores')
  UNION ALL
  SELECT 
    '210_location_relationships',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'locations')
  UNION ALL
  SELECT 
    '026_add_advanced_enrichment_fields',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destinations' 
        AND column_name IN ('photos_json', 'current_weather_json', 'nearby_events_json')
    )
  UNION ALL
  SELECT 
    '025_conversation_tables',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_sessions')
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversation_messages')
  UNION ALL
  SELECT 
    '300_conversational_ai',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'conversation_sessions' 
        AND column_name = 'context'
    )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_messages' 
          AND column_name = 'embedding'
      )
  UNION ALL
  SELECT 
    '301_asimov_sync_trigger',
    EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name LIKE '%asimov%'
    )
) migration_checks
ORDER BY 
  CASE 
    WHEN all_checks_pass THEN 1
    ELSE 2
  END,
  migration_name;

-- ============================================================================
-- PART 7: QUICK CHECK - What Needs to Run?
-- ============================================================================

SELECT 
  '⚠️ NEEDS TO RUN' as action,
  string_agg(migration_name, ', ' ORDER BY migration_name) as missing_migrations
FROM (
  SELECT 
    '019_audit_current_state' as migration_name,
    FALSE as is_complete  -- Always run audit
  UNION ALL
  SELECT 
    '020_consolidate_schema',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places')
  UNION ALL
  SELECT 
    '021_add_helper_functions',
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_user_saved_destinations')
  UNION ALL
  SELECT 
    '022_add_tags_to_rpc',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_places' AND column_name = 'tags')
  UNION ALL
  SELECT 
    '023_enable_vector_search',
    EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'destinations' AND column_name = 'embedding')
  UNION ALL
  SELECT 
    '024_hybrid_search_function',
    EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'search_destinations_hybrid')
  UNION ALL
  SELECT 
    '025_fix_embedding_dimension',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destinations' 
        AND column_name = 'embedding'
        AND udt_name = 'vector'
    )
  UNION ALL
  SELECT 
    '026_add_advanced_enrichment_fields',
    EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destinations' 
        AND column_name IN ('photos_json', 'current_weather_json')
    )
) checks
WHERE NOT is_complete;

