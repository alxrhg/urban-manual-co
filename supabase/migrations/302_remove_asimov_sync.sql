-- Migration 302: Remove Asimov Sync Trigger
-- Removes the Asimov sync trigger, function, and queue table

BEGIN;

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_asimov_sync ON destinations;

-- Drop the function
DROP FUNCTION IF EXISTS notify_asimov_sync();

-- Drop the sync queue table if it exists
DROP TABLE IF EXISTS asimov_sync_queue;

COMMIT;

