# Event Discovery Pipeline (Phase 8)

Discovers and recommends events happening near destinations.

## Features

- **Event Management**: Store events with location, timing, pricing
- **Event-Destination Linking**: Associate events with nearby destinations
- **User Interests**: Track user interest levels (interested/going/not_interested)
- **Reminders**: Send event reminders to users
- **Categories**: Music, food, art, sports, festivals, etc.
- **Integration**: Support for Ticketmaster, Eventbrite, etc.

## Quick Start

### Run Migration

```sql
-- Execute: migrations/016_event_discovery.sql
```

### Query Upcoming Events

```sql
SELECT * FROM get_upcoming_events_for_city('Paris', 30, 20);
```

## Database Schema

- `events`: Event details with timing and location
- `event_destination_associations`: Links events to destinations
- `user_event_interests`: User event preferences

## License

Proprietary - Urban Manual
