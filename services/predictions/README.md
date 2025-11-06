# Best Time to Visit Predictions (Phase 7)

Predicts optimal visiting times based on weather patterns, crowd levels, and seasonal data.

## Features

- **Monthly Predictions**: Best/worst months to visit
- **Weekly Patterns**: Best days of the week
- **Hourly Timing**: Optimal hours to avoid crowds
- **Crowd Levels**: Historical crowd data (1-10 scale)
- **Weather Integration**: Weather suitability by season
- **Time Scoring**: Real-time appropriateness score (0-1)

## Quick Start

### Run Migration

```sql
-- Execute: migrations/015_best_time_to_visit.sql
```

### Calculate Time Score

```sql
-- Score for current time
SELECT calculate_time_score(123);

-- Score for specific time
SELECT calculate_time_score(123, 5, 1, 10); -- May, Monday, 10am
```

### Get Best Times

```sql
SELECT * FROM get_best_time_to_visit(123);
```

## Database Schema

- `destination_best_times`: Optimal times for each destination
- `destination_visit_patterns`: Historical visit data
- `user_visit_history`: User visit feedback

## License

Proprietary - Urban Manual
