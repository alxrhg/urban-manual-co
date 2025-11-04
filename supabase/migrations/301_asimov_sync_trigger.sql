-- Migration 301: Asimov Sync Triggers
-- Automatically sync destinations to Asimov when created/updated

BEGIN;

-- Create a function to trigger Asimov sync via Edge Function or webhook
-- Note: This uses pg_net extension if available, otherwise falls back to HTTP
CREATE OR REPLACE FUNCTION trigger_asimov_sync()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSONB;
BEGIN
  -- Build payload with destination data
  v_payload := jsonb_build_object(
    'id', NEW.id,
    'slug', NEW.slug,
    'name', NEW.name,
    'city', NEW.city,
    'category', NEW.category,
    'description', NEW.description,
    'content', NEW.content,
    'rating', NEW.rating,
    'michelin_stars', NEW.michelin_stars,
    'price_level', NEW.price_level,
    'tags', NEW.tags,
    'action', TG_OP -- 'INSERT' or 'UPDATE'
  );

  -- Try to call Edge Function if available
  -- Note: This requires pg_net extension or a custom webhook setup
  -- For now, we'll log the event and the application can handle sync
  -- In production, you might want to use Supabase Edge Functions or webhooks
  
  -- Log the sync event (you can query this to trigger syncs)
  INSERT INTO asimov_sync_queue (destination_id, action, payload, created_at)
  VALUES (NEW.id, TG_OP, v_payload, NOW())
  ON CONFLICT (destination_id) DO UPDATE
    SET action = TG_OP,
        payload = v_payload,
        created_at = NOW(),
        synced_at = NULL; -- Reset sync status

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sync queue table (if doesn't exist)
CREATE TABLE IF NOT EXISTS asimov_sync_queue (
  destination_id INTEGER PRIMARY KEY REFERENCES destinations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_asimov_sync_pending 
  ON asimov_sync_queue(synced_at) 
  WHERE synced_at IS NULL;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_destination_asimov_sync ON destinations;
CREATE TRIGGER trigger_destination_asimov_sync
  AFTER INSERT OR UPDATE ON destinations
  FOR EACH ROW
  WHEN (
    -- Only sync if key fields changed
    (TG_OP = 'INSERT') OR
    (TG_OP = 'UPDATE' AND (
      OLD.name IS DISTINCT FROM NEW.name OR
      OLD.description IS DISTINCT FROM NEW.description OR
      OLD.content IS DISTINCT FROM NEW.content OR
      OLD.city IS DISTINCT FROM NEW.city OR
      OLD.category IS DISTINCT FROM NEW.category
    ))
  )
  EXECUTE FUNCTION trigger_asimov_sync();

-- Create trigger for DELETE
CREATE OR REPLACE FUNCTION trigger_asimov_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO asimov_sync_queue (destination_id, action, payload, created_at)
  VALUES (OLD.id, 'DELETE', jsonb_build_object('id', OLD.id, 'slug', OLD.slug), NOW())
  ON CONFLICT (destination_id) DO UPDATE
    SET action = 'DELETE',
        payload = jsonb_build_object('id', OLD.id, 'slug', OLD.slug),
        created_at = NOW(),
        synced_at = NULL;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_destination_asimov_delete ON destinations;
CREATE TRIGGER trigger_destination_asimov_delete
  AFTER DELETE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_asimov_delete();

COMMIT;

