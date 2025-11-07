-- Migration: Create tables for Phase 3 advanced features
-- Sentiment analysis, topic modeling, anomaly detection, event correlation

-- Sentiment analysis results
CREATE TABLE IF NOT EXISTS destination_sentiment (
    id SERIAL PRIMARY KEY,
    destination_id INT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    positive_count INT DEFAULT 0,
    negative_count INT DEFAULT 0,
    neutral_count INT DEFAULT 0,
    average_score FLOAT DEFAULT 0.0,
    sentiment_score FLOAT DEFAULT 0.0, -- -1 to 1 scale
    total_reviews INT DEFAULT 0,
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(destination_id)
);

CREATE INDEX IF NOT EXISTS idx_destination_sentiment_destination ON destination_sentiment(destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_sentiment_score ON destination_sentiment(sentiment_score DESC);

-- Topic modeling results
CREATE TABLE IF NOT EXISTS destination_topics (
    id SERIAL PRIMARY KEY,
    destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
    city TEXT,
    topic_id INT NOT NULL,
    keywords TEXT[] NOT NULL,
    keywords_with_scores JSONB,
    document_count INT DEFAULT 0,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(destination_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_destination_topics_destination ON destination_topics(destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_topics_city ON destination_topics(city);

-- City-level topics
CREATE TABLE IF NOT EXISTS city_topics (
    id SERIAL PRIMARY KEY,
    city TEXT NOT NULL,
    topic_id INT NOT NULL,
    keywords TEXT[] NOT NULL,
    keywords_with_scores JSONB,
    document_count INT DEFAULT 0,
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(city, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_city_topics_city ON city_topics(city);

-- Anomaly detection results
CREATE TABLE IF NOT EXISTS destination_anomalies (
    id SERIAL PRIMARY KEY,
    destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
    city TEXT,
    anomaly_type TEXT NOT NULL, -- 'traffic_spike', 'sentiment_drop', 'popularity_spike', etc.
    anomaly_date DATE NOT NULL,
    metrics JSONB NOT NULL, -- Store metrics at time of anomaly
    anomaly_score FLOAT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    is_resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_destination_anomalies_destination ON destination_anomalies(destination_id);
CREATE INDEX IF NOT EXISTS idx_destination_anomalies_city ON destination_anomalies(city);
CREATE INDEX IF NOT EXISTS idx_destination_anomalies_date ON destination_anomalies(anomaly_date DESC);
CREATE INDEX IF NOT EXISTS idx_destination_anomalies_resolved ON destination_anomalies(is_resolved);

-- Event correlation data
CREATE TABLE IF NOT EXISTS event_correlations (
    id SERIAL PRIMARY KEY,
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'festival', 'exhibition', 'weather', etc.
    city TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
    traffic_impact JSONB, -- Store before/during/after metrics
    impact_multiplier FLOAT DEFAULT 1.0,
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_correlations_event ON event_correlations(event_name, city);
CREATE INDEX IF NOT EXISTS idx_event_correlations_dates ON event_correlations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_event_correlations_destination ON event_correlations(destination_id);

-- Event-destination mappings (for recommendations)
CREATE TABLE IF NOT EXISTS event_destination_mappings (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    city TEXT NOT NULL,
    destination_id INT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    relevance_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_type, city, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_event_mappings_event_type ON event_destination_mappings(event_type, city);
CREATE INDEX IF NOT EXISTS idx_event_mappings_destination ON event_destination_mappings(destination_id);

COMMENT ON TABLE destination_sentiment IS 'Stores sentiment analysis results for destinations';
COMMENT ON TABLE destination_topics IS 'Stores topic modeling results for destinations';
COMMENT ON TABLE city_topics IS 'Stores topic modeling results for cities';
COMMENT ON TABLE destination_anomalies IS 'Stores detected anomalies for destinations';
COMMENT ON TABLE event_correlations IS 'Stores event impact correlations with destinations';
COMMENT ON TABLE event_destination_mappings IS 'Maps event types to relevant destinations for recommendations';

