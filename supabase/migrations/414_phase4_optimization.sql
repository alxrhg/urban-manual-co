-- Migration: Create tables for Phase 4 optimization features
-- Explainable AI explanations, bandit statistics, sequence patterns

-- Model explanations storage
CREATE TABLE IF NOT EXISTS model_explanations (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
    model_type TEXT NOT NULL, -- 'collaborative_filtering', 'forecast', etc.
    explanation_method TEXT NOT NULL, -- 'shap', 'lime', 'simple'
    explanation_data JSONB NOT NULL,
    feature_importance JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_explanations_user ON model_explanations(user_id);
CREATE INDEX IF NOT EXISTS idx_model_explanations_destination ON model_explanations(destination_id);
CREATE INDEX IF NOT EXISTS idx_model_explanations_model_type ON model_explanations(model_type);

-- Bandit algorithm statistics
CREATE TABLE IF NOT EXISTS bandit_statistics (
    id SERIAL PRIMARY KEY,
    bandit_type TEXT NOT NULL, -- 'prompt_selection', 'recommendation_ranking', etc.
    user_segment TEXT NOT NULL,
    arm_id TEXT NOT NULL, -- Prompt type, recommendation strategy, etc.
    pulls INT DEFAULT 0,
    total_rewards FLOAT DEFAULT 0.0,
    mean_reward FLOAT DEFAULT 0.0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bandit_type, user_segment, arm_id)
);

CREATE INDEX IF NOT EXISTS idx_bandit_statistics_type_segment ON bandit_statistics(bandit_type, user_segment);
CREATE INDEX IF NOT EXISTS idx_bandit_statistics_arm ON bandit_statistics(arm_id);

-- Bandit reward history
CREATE TABLE IF NOT EXISTS bandit_rewards (
    id SERIAL PRIMARY KEY,
    bandit_type TEXT NOT NULL,
    user_segment TEXT NOT NULL,
    arm_id TEXT NOT NULL,
    reward FLOAT NOT NULL,
    context JSONB, -- Additional context about the selection
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bandit_rewards_type_segment ON bandit_rewards(bandit_type, user_segment);
CREATE INDEX IF NOT EXISTS idx_bandit_rewards_recorded ON bandit_rewards(recorded_at DESC);

-- Sequence patterns and predictions
CREATE TABLE IF NOT EXISTS sequence_patterns (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    session_id TEXT,
    sequence_type TEXT NOT NULL, -- 'browsing', 'search', 'planning', etc.
    action_sequence TEXT[] NOT NULL,
    predicted_next_actions JSONB,
    pattern_classification TEXT,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sequence_patterns_user ON sequence_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_patterns_session ON sequence_patterns(session_id);
CREATE INDEX IF NOT EXISTS idx_sequence_patterns_type ON sequence_patterns(sequence_type);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    operation_name TEXT NOT NULL,
    duration_ms FLOAT NOT NULL,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded ON performance_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_success ON performance_metrics(success);

COMMENT ON TABLE model_explanations IS 'Stores model explanations for transparency and debugging';
COMMENT ON TABLE bandit_statistics IS 'Stores bandit algorithm statistics for optimization';
COMMENT ON TABLE bandit_rewards IS 'Stores reward history for bandit algorithms';
COMMENT ON TABLE sequence_patterns IS 'Stores browsing sequence patterns and predictions';
COMMENT ON TABLE performance_metrics IS 'Stores performance metrics for monitoring and optimization';

