# Personalization KPI Review Playbook

This guide explains how to monitor personalization experiments, analyze recommendation quality metrics, and configure alerting when KPIs regress.

## Data sources

- **Supabase `personalization_metrics`** – primary fact table with click-through, dwell time, and experiment metadata. Each row contains:
  - `user_id`
  - `surface` (e.g., `for_you`, `recently_viewed`, `visit_history`)
  - `experiment_key` / `variation`
  - `click_through` (boolean)
  - `dwell_time_ms` (nullable number)
  - `recommendation_id`, `destination_slug`, and JSON `metadata`
- **`user_interactions`** – supporting table for engagement counts and saves.
- **Experiment assignments** – pulled from Supabase tables/views `experiments` and `experiment_assignments`.

## Suggested dashboards

1. **Experiment Overview**
   - KPI tiles for click-through rate (CTR), average dwell time, and session coverage per surface.
   - Filters for experiment key, variation, geography, and time window.
   - Time-series line charts for CTR and dwell time with comparison between control vs treatment.

2. **Surface Deep-Dives**
   - Create separate tabs for `for_you`, `recently_viewed`, and `visit_history`.
   - Plot funnel-style charts: impressions → clicks → downstream conversions (saves).
   - Include histogram of dwell times to detect long-tail outliers.

3. **Recommendation Payload Quality**
   - Table of top recommendation payload attributes (category, city, personalization score) vs. CTR.
   - Scatter plot of dwell time vs. personalization score (requires joining metrics table with recommendation payload metadata if available).

### Tooling options

- **Supabase Dashboard** – build quick SQL-based charts using Supabase's built-in visualizer. Recommended queries are saved under `/docs/personalization/sql/` (create as needed).
- **GrowthBook / DataDog / Grafana** – if a BI stack already exists, connect to Supabase via Postgres connection string and reproduce the above charts.
- **Notebooks (Jupyter / Observable)** – for exploratory analysis, query Supabase with SQLAlchemy or the Supabase JS client. Store reusable notebooks in `docs/personalization/notebooks/`.

## Example SQL snippets

```sql
-- Daily CTR and dwell time by experiment variation
SELECT
  date_trunc('day', created_at) AS day,
  experiment_key,
  variation,
  COUNT(*) FILTER (WHERE click_through IS TRUE) AS clicks,
  COUNT(*) AS impressions,
  AVG(dwell_time_ms) AS avg_dwell_ms,
  COUNT(*) FILTER (WHERE click_through IS TRUE)::float / NULLIF(COUNT(*), 0) AS ctr
FROM personalization_metrics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2, 3
ORDER BY day DESC;
```

```sql
-- Identify surfaces with regressing CTR week-over-week
WITH weekly AS (
  SELECT
    date_trunc('week', created_at) AS week,
    surface,
    COUNT(*) FILTER (WHERE click_through) AS clicks,
    COUNT(*) AS impressions
  FROM personalization_metrics
  WHERE created_at >= NOW() - INTERVAL '8 weeks'
  GROUP BY 1, 2
)
SELECT
  curr.surface,
  curr.week,
  curr.clicks::float / NULLIF(curr.impressions, 0) AS ctr,
  (curr.clicks::float / NULLIF(curr.impressions, 0)) -
  (prev.clicks::float / NULLIF(prev.impressions, 0)) AS wow_change
FROM weekly curr
LEFT JOIN weekly prev
  ON prev.surface = curr.surface
  AND prev.week = curr.week - INTERVAL '1 week'
WHERE curr.week >= NOW() - INTERVAL '4 weeks'
ORDER BY wow_change ASC;
```

## Alerting recommendations

1. **Threshold-based alerts**
   - Define minimum acceptable CTR and dwell time per surface (e.g., CTR ≥ 4%).
   - Use Supabase Functions or external cron jobs to run the SQL above daily and push alerts to Slack when thresholds are breached.

2. **Anomaly detection**
   - Use a notebook or BI tool to implement z-score detection over rolling 7-day averages.
   - Trigger alerts when deviation exceeds 2 standard deviations for consecutive days.

3. **Experiment guardrails**
   - For each experiment, set guardrail metrics (bounce rate, time-on-destination) and automatically pause the rollout if they drop below historical baselines.

## Operational workflow

1. **Daily** – Review Supabase dashboard for spikes/drops, annotate anomalies, and verify alerts.
2. **Weekly** – Export notebook summaries (CTR, dwell time, saves) and circulate to product stakeholders.
3. **Release planning** – Before enabling new experiments, seed the `experiments` table with default configurations and ensure metrics appear in `personalization_metrics`.

Keeping dashboards and notebooks up-to-date ensures we can respond quickly to personalization regressions and continually improve recommendation quality.

