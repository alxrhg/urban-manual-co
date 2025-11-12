import { mysqlTable, varchar, int, datetime, text } from 'drizzle-orm/mysql-core';

export const itineraryEvents = mysqlTable('itinerary_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  tripId: int('trip_id').notNull(),
  dayIndex: int('day_index').notNull(),
  eventDate: datetime('event_date').notNull(),
  startsAt: datetime('starts_at'),
  endsAt: datetime('ends_at'),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  attractionId: varchar('attraction_id', { length: 255 }),
  destinationSlug: varchar('destination_slug', { length: 255 }).notNull(),
  availability: text('availability'),
  metadata: text('metadata'),
  notes: text('notes'),
  createdAt: datetime('created_at').notNull(),
  updatedAt: datetime('updated_at').notNull(),
});

export type ItineraryEventRow = typeof itineraryEvents.$inferSelect;
export type InsertItineraryEventRow = typeof itineraryEvents.$inferInsert;
