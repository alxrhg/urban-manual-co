# Analytics Dashboard & Monitoring (Phase 11)

Comprehensive system analytics and performance monitoring.

## Features

- **System Metrics**: Track KPIs (DAU, MAU, engagement)
- **User Analytics**: Daily user activity summaries
- **Recommendation Performance**: Algorithm CTR and quality metrics
- **Health Monitoring**: Service uptime and response times
- **Materialized Views**: Pre-computed dashboard data
- **Real-time Dashboards**: View system health at a glance

## Quick Start

### Run Migration

```sql
-- Execute: migrations/019_analytics_monitoring.sql
```

### Get Daily Stats

```sql
SELECT * FROM get_daily_stats(CURRENT_DATE);
```

### Refresh Analytics Views

```sql
SELECT refresh_analytics_views();
```

## Database Schema

- `system_metrics`: System-wide KPIs
- `user_analytics_summary`: Daily user engagement
- `recommendation_performance`: Algorithm effectiveness
- `system_health_checks`: Service health monitoring

## Materialized Views

- `daily_active_users`: DAU trends
- `recommendation_ctr_by_algorithm`: CTR by algorithm type

## Key Metrics

### Engagement
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Sessions per user
- Time spent

### Recommendations
- Click-through rate (CTR)
- Average match score
- Average confidence
- User ratings

### System Health
- API response times
- Error rates
- Database performance
- Cache hit rates

## License

Proprietary - Urban Manual
