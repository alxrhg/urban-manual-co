-- Migration: Create co_visitation_graph table for graph-based sequencing
-- This table stores edges representing "visited A then B" patterns

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS co_visitation_graph (
    id BIGSERIAL PRIMARY KEY,
    destination_a_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    destination_b_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    weight DECIMAL(10, 2) NOT NULL DEFAULT 1.0,
    frequency INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(destination_a_id, destination_b_id)
  );

  -- Indexes for fast lookups
  CREATE INDEX IF NOT EXISTS idx_co_visitation_a ON co_visitation_graph(destination_a_id);
  CREATE INDEX IF NOT EXISTS idx_co_visitation_b ON co_visitation_graph(destination_b_id);
  CREATE INDEX IF NOT EXISTS idx_co_visitation_weight ON co_visitation_graph(weight DESC);
  CREATE INDEX IF NOT EXISTS idx_co_visitation_updated ON co_visitation_graph(updated_at DESC);

  -- Add comment
  COMMENT ON TABLE co_visitation_graph IS 'Co-visitation graph edges: represents "visited destination_a then destination_b" patterns';
  COMMENT ON COLUMN co_visitation_graph.weight IS 'Edge weight based on co-visitation frequency';
  COMMENT ON COLUMN co_visitation_graph.frequency IS 'Number of users who visited A then B';

EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error creating co_visitation_graph table: %', SQLERRM;
END $$;

