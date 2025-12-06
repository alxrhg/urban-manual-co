-- ============================================================================
-- Content Audit Log Table
--
-- Tracks all content changes from Sanity CMS syncs
-- Used for versioning, debugging, and compliance
-- ============================================================================

-- Create the content_audit_log table
CREATE TABLE IF NOT EXISTS content_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was changed
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'unpublish', 'conflict', 'publish', 'schedule')),
    document_id VARCHAR(255) NOT NULL,  -- Sanity document ID
    slug VARCHAR(255) NOT NULL,          -- Destination slug

    -- Who/what made the change
    source VARCHAR(50) NOT NULL DEFAULT 'unknown' CHECK (source IN ('sanity_webhook', 'admin_dashboard', 'api', 'script', 'unknown')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Change details (JSON for flexibility)
    changes JSONB,     -- { field: { old: value, new: value } }
    conflicts JSONB,   -- Any detected conflicts during sync
    metadata JSONB,    -- Additional context (IP, user agent, etc.)

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_log_slug ON content_audit_log(slug);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON content_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON content_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_document_id ON content_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_source ON content_audit_log(source);

-- Enable RLS
ALTER TABLE content_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON content_audit_log
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin'
    );

-- Policy: Service role can insert (for webhooks)
CREATE POLICY "Service role can insert audit logs"
    ON content_audit_log
    FOR INSERT
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE content_audit_log IS 'Tracks all content changes from Sanity CMS syncs for versioning and debugging';

-- ============================================================================
-- Helper function to get recent changes for a destination
-- ============================================================================

CREATE OR REPLACE FUNCTION get_destination_history(
    p_slug VARCHAR(255),
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    action VARCHAR(50),
    source VARCHAR(50),
    changes JSONB,
    conflicts JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cal.id,
        cal.action,
        cal.source,
        cal.changes,
        cal.conflicts,
        cal.created_at
    FROM content_audit_log cal
    WHERE cal.slug = p_slug
    ORDER BY cal.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- Helper function to get conflict summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recent_conflicts(
    p_hours INTEGER DEFAULT 24,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    slug VARCHAR(255),
    document_id VARCHAR(255),
    conflicts JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cal.id,
        cal.slug,
        cal.document_id,
        cal.conflicts,
        cal.created_at
    FROM content_audit_log cal
    WHERE
        cal.action = 'conflict'
        AND cal.created_at > NOW() - (p_hours || ' hours')::INTERVAL
    ORDER BY cal.created_at DESC
    LIMIT p_limit;
END;
$$;
