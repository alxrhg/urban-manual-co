-- Opportunity Alerts Triggers (idempotent)

-- Function: on forecasting_data insert, compute change vs previous and enqueue alerts
CREATE OR REPLACE FUNCTION handle_forecasting_insert()
RETURNS TRIGGER AS $$
DECLARE
  prev RECORD;
  delta FLOAT;
  threshold FLOAT := 0.15; -- 15% change threshold
  price_threshold FLOAT := 0.08; -- 8% price drop threshold
BEGIN
  IF NEW.metric_type = 'popularity' THEN
    SELECT * INTO prev FROM forecasting_data fd
      WHERE fd.metric_type = 'popularity'
      ORDER BY recorded_at DESC
      LIMIT 1 OFFSET 1;
    IF prev.metric_value IS NOT NULL THEN
      delta := (NEW.metric_value - prev.metric_value) / GREATEST(prev.metric_value, 1e-6);
      IF delta >= threshold THEN
        INSERT INTO opportunity_alerts (
          opportunity_type, city, category, title, description, opportunity_data, urgency, is_active
        ) VALUES (
          'trending',
          COALESCE(NEW.metadata->>'city', NULL),
          NULL,
          'Trending now',
          'Demand is rising significantly in this area — plan ahead.',
          jsonb_build_object('delta', delta, 'interest_score', NEW.metric_value),
          'medium',
          TRUE
        );
        -- Optionally nudge discovery prompts weight for this city
        UPDATE discovery_prompts
          SET weight = LEAST(weight * 1.1, 5.0)
          WHERE city ILIKE COALESCE(NEW.metadata->>'city', '') || '%';
      END IF;
    END IF;
  ELSIF NEW.metric_type = 'price' THEN
    SELECT * INTO prev FROM forecasting_data fd
      WHERE fd.metric_type = 'price'
      AND fd.destination_id = NEW.destination_id
      ORDER BY recorded_at DESC
      LIMIT 1 OFFSET 1;
    IF prev.metric_value IS NOT NULL THEN
      delta := (NEW.metric_value - prev.metric_value) / GREATEST(prev.metric_value, 1e-6);
      IF delta <= -price_threshold THEN
        INSERT INTO opportunity_alerts (
          opportunity_type, destination_id, title, description, opportunity_data, urgency, is_active
        ) VALUES (
          'price_drop',
          NEW.destination_id,
          'Price drop alert',
          'Good timing — prices just dropped here.',
          jsonb_build_object('delta', delta, 'current', NEW.metric_value, 'previous', prev.metric_value),
          'high',
          TRUE
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_handle_forecasting_insert ON forecasting_data;
CREATE TRIGGER trg_handle_forecasting_insert
AFTER INSERT ON forecasting_data
FOR EACH ROW
EXECUTE FUNCTION handle_forecasting_insert();
