import { mysqlTable, int, varchar, text, timestamp, json } from 'drizzle-orm/mysql-core';

export const userPreferences = mysqlTable('user_preferences', {
  id: int('id').primaryKey().autoincrement(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  favoriteCategories: text('favorite_categories'),
  favoriteCities: text('favorite_cities'),
  interests: text('interests'),
  budgetRange: json('budget_range'),
  travelVibes: json('travel_vibes'),
  mobilityPreferences: json('mobility_preferences'),
  travelParty: json('travel_party'),
  updatedAt: timestamp('updated_at').notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;
