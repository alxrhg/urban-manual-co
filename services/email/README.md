# Weekly Personalized Email System (Phase 10)

Curated weekly email digests with personalized recommendations, events, and stats.

## Features

- **Weekly Digests**: Personalized recommendations + events + weather
- **Template System**: HTML/text email templates
- **Subscription Management**: Frequency, timing, unsubscribe
- **Engagement Tracking**: Opens and clicks
- **Content Caching**: Pre-generate content for performance
- **Smart Scheduling**: Send at user's preferred time
- **Multi-Provider**: SendGrid, Amazon SES, Resend support

## Quick Start

### Run Migration

```sql
-- Execute: migrations/018_weekly_emails.sql
```

### Get Users Due for Email

```sql
SELECT * FROM get_users_due_for_weekly_email();
```

## Database Schema

- `email_templates`: Reusable email templates
- `email_subscriptions`: User subscription preferences
- `email_send_history`: Sent emails with engagement
- `email_content_cache`: Pre-generated content

## Email Sections

1. **Hero**: Welcome message
2. **Recommendations**: Top 5 personalized places
3. **Events**: Upcoming events (3)
4. **Weather**: Weekly weather outlook
5. **Stats**: User's activity summary

## License

Proprietary - Urban Manual
