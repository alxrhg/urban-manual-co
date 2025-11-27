-- Migration: Add notes column to trips table for rich notes/checklist storage
-- Run this in your Supabase SQL Editor

-- Add notes column to trips table (stores JSON with text and checklist items)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS notes TEXT;

-- Comment describing the structure
COMMENT ON COLUMN trips.notes IS 'JSON field storing trip notes with structure: { items: [{ id, type: "text"|"checkbox", content, checked? }] }';
