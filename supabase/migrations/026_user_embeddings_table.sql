-- Migration 026: User Embeddings Table
-- Created: 2025-11-04
-- Purpose: Store user profile embeddings for AI personalization

-- Create user_embeddings table
CREATE TABLE IF NOT EXISTS public.user_embeddings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI text-embedding-3-large dimensions
    interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_embeddings_updated_at ON public.user_embeddings(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_embeddings_interaction_count ON public.user_embeddings(interaction_count);

-- Enable Row Level Security
ALTER TABLE public.user_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only read their own embeddings
CREATE POLICY "Users can view own embeddings"
    ON public.user_embeddings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all embeddings (for system operations)
CREATE POLICY "Service role can manage embeddings"
    ON public.user_embeddings
    FOR ALL
    USING (auth.role() = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_user_embeddings_timestamp
    BEFORE UPDATE ON public.user_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_embeddings_updated_at();

-- Add comment
COMMENT ON TABLE public.user_embeddings IS 'Stores user profile vector embeddings for AI-powered personalization';
COMMENT ON COLUMN public.user_embeddings.embedding IS 'Vector representation of user preferences (1536 dimensions from OpenAI)';
COMMENT ON COLUMN public.user_embeddings.interaction_count IS 'Number of user interactions (saves + visits) at embedding generation time';
