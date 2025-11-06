# Smart Notification System (Phase 9)

Context-aware push notifications with intelligent scheduling and user preferences.

## Features

- **Template System**: Reusable notification templates
- **User Preferences**: Category, frequency, and timing controls
- **Quiet Hours**: Respect user sleep schedules
- **Smart Scheduling**: Send at optimal times
- **Rate Limiting**: Max notifications per day
- **Engagement Tracking**: Click and dismiss metrics
- **Multi-Channel**: Push + Email support

## Quick Start

### Run Migration

```sql
-- Execute: migrations/017_smart_notifications.sql
```

### Check If User Can Receive Notification

```sql
SELECT can_send_notification('user_uuid', 'new_recommendation', 'recommendation');
```

## Database Schema

- `notification_templates`: Reusable templates with variables
- `user_notification_preferences`: User settings and device tokens
- `notification_queue`: Pending notifications
- `notification_history`: Sent notifications and engagement

## Notification Categories

- **Recommendations**: New personalized suggestions
- **Events**: Event reminders and updates
- **Weather**: Weather-based alerts
- **Social**: Social interactions and updates

## License

Proprietary - Urban Manual
