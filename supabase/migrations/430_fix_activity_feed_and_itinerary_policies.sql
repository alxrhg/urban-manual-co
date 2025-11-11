BEGIN;

-- Ensure activity feed table exists and has sane policies
DO $$
DECLARE
  activity_table_name text;
BEGIN
  IF to_regclass('public.activities') IS NOT NULL THEN
    activity_table_name := 'activities';
  ELSIF to_regclass('public.activity_feed') IS NOT NULL THEN
    activity_table_name := 'activity_feed';
  ELSIF to_regclass('public."activity-feed"') IS NOT NULL THEN
    activity_table_name := 'activity-feed';
  ELSE
    -- Create canonical activity feed table
    EXECUTE '
      CREATE TABLE activities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        activity_type text NOT NULL,
        entity_type text,
        entity_id text,
        metadata jsonb DEFAULT ''{}''::jsonb,
        created_at timestamptz NOT NULL DEFAULT timezone(''utc'', now())
      );
    ';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activities_user_created ON activities(user_id, created_at DESC);';
    activity_table_name := 'activities';
  END IF;

  -- Ensure the table has required columns (add them if they are missing)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = activity_table_name
      AND column_name = 'user_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN user_id uuid;', activity_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = activity_table_name
      AND column_name = 'activity_type'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN activity_type text;', activity_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = activity_table_name
      AND column_name = 'entity_type'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN entity_type text;', activity_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = activity_table_name
      AND column_name = 'entity_id'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN entity_id text;', activity_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = activity_table_name
      AND column_name = 'metadata'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN metadata jsonb DEFAULT ''{}''::jsonb;', activity_table_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = activity_table_name
      AND column_name = 'created_at'
  ) THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN created_at timestamptz NOT NULL DEFAULT timezone(''utc'', now());', activity_table_name);
  END IF;

  -- Basic index to keep feed queries fast
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I(user_id, created_at DESC);',
    'idx_' || replace(activity_table_name, '-', '_') || '_user_created',
    activity_table_name
  );

  -- Enable RLS and recreate policies
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', activity_table_name);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Users can view their activity feed', activity_table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Users can insert activity feed events', activity_table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Service role can manage activity feed', activity_table_name);

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR SELECT USING (user_id = auth.uid());',
    'Users can view their activity feed',
    activity_table_name
  );

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());',
    'Users can insert activity feed events',
    activity_table_name
  );

  EXECUTE format(
    'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);',
    'Service role can manage activity feed',
    activity_table_name
  );
END $$;

-- Refresh itinerary collaborator policies to avoid recursion and allow proper access
DO $$
BEGIN
  IF to_regclass('public.itinerary_collaborators') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE itinerary_collaborators ENABLE ROW LEVEL SECURITY;';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view collaborators for their trips" ON itinerary_collaborators;';
    EXECUTE 'DROP POLICY IF EXISTS "Users can manage collaborators for their trips" ON itinerary_collaborators;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can view collaborators" ON itinerary_collaborators;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip owners can add collaborators" ON itinerary_collaborators;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can update collaborators" ON itinerary_collaborators;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can remove collaborators" ON itinerary_collaborators;';

    EXECUTE $$
      CREATE POLICY "Trip members can view collaborators"
      ON itinerary_collaborators FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_collaborators.trip_id
            AND trips.user_id = auth.uid()
        )
        OR itinerary_collaborators.user_id = auth.uid()
      );
    $$;

    EXECUTE $$
      CREATE POLICY "Trip owners can add collaborators"
      ON itinerary_collaborators FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_collaborators.trip_id
            AND trips.user_id = auth.uid()
        )
      );
    $$;

    EXECUTE $$
      CREATE POLICY "Trip members can update collaborators"
      ON itinerary_collaborators FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_collaborators.trip_id
            AND trips.user_id = auth.uid()
        )
        OR itinerary_collaborators.user_id = auth.uid()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_collaborators.trip_id
            AND trips.user_id = auth.uid()
        )
        OR itinerary_collaborators.user_id = auth.uid()
      );
    $$;

    EXECUTE $$
      CREATE POLICY "Trip members can remove collaborators"
      ON itinerary_collaborators FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_collaborators.trip_id
            AND trips.user_id = auth.uid()
        )
        OR itinerary_collaborators.user_id = auth.uid()
      );
    $$;
  END IF;
END $$;

-- Recreate itinerary item policies so collaborators have access without recursion
DO $$
BEGIN
  IF to_regclass('public.itinerary_items') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;';

    EXECUTE 'DROP POLICY IF EXISTS "Users can view itinerary items for their trips" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create itinerary items for their trips" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update itinerary items for their trips" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete itinerary items for their trips" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can view itinerary items" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can create itinerary items" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can update itinerary items" ON itinerary_items;';
    EXECUTE 'DROP POLICY IF EXISTS "Trip members can delete itinerary items" ON itinerary_items;';

    EXECUTE $$
      CREATE POLICY "Trip members can view itinerary items"
      ON itinerary_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_items.trip_id
            AND trips.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM itinerary_collaborators ic
          WHERE ic.trip_id = itinerary_items.trip_id
            AND ic.user_id = auth.uid()
        )
      );
    $$;

    EXECUTE $$
      CREATE POLICY "Trip members can create itinerary items"
      ON itinerary_items FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_items.trip_id
            AND trips.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM itinerary_collaborators ic
          WHERE ic.trip_id = itinerary_items.trip_id
            AND ic.user_id = auth.uid()
        )
      );
    $$;

    EXECUTE $$
      CREATE POLICY "Trip members can update itinerary items"
      ON itinerary_items FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_items.trip_id
            AND trips.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM itinerary_collaborators ic
          WHERE ic.trip_id = itinerary_items.trip_id
            AND ic.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_items.trip_id
            AND trips.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM itinerary_collaborators ic
          WHERE ic.trip_id = itinerary_items.trip_id
            AND ic.user_id = auth.uid()
        )
      );
    $$;

    EXECUTE $$
      CREATE POLICY "Trip members can delete itinerary items"
      ON itinerary_items FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM trips
          WHERE trips.id = itinerary_items.trip_id
            AND trips.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM itinerary_collaborators ic
          WHERE ic.trip_id = itinerary_items.trip_id
            AND ic.user_id = auth.uid()
        )
      );
    $$;
  END IF;
END $$;

COMMIT;
