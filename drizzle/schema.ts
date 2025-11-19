import { pgTable, varchar, integer, timestamp, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  avatar: varchar("avatar", { length: 500 }),
  createdAt: timestamp("created_at"),
  lastSignedIn: timestamp("last_signed_in"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const savedPlaces = pgTable("saved_places", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }).notNull(),
  savedAt: timestamp("saved_at").notNull(),
  notes: text("notes"),
});

export const visitedPlaces = pgTable("visited_places", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }).notNull(),
  visitedAt: timestamp("visited_at").notNull(),
  rating: integer("rating"), // Optional rating 1-5
  notes: text("notes"),
});

export const userPreferences = pgTable("user_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  favoriteCategories: text("favorite_categories"), // JSON array
  favoriteCities: text("favorite_cities"), // JSON array
  interests: text("interests"), // JSON array
  updatedAt: timestamp("updated_at").notNull(),
});

export const userActivity = pgTable("user_activity", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'view', 'search', 'save', 'unsave'
  timestamp: timestamp("timestamp").notNull(),
  metadata: text("metadata"), // JSON for additional context
});

export const trips = pgTable("trips", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  destination: varchar("destination", { length: 255 }), // Main city/destination
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 50 }).notNull().default("planning"), // 'planning', 'upcoming', 'ongoing', 'completed'
  isPublic: integer("is_public").notNull().default(0), // 0 = private, 1 = public
  coverImage: varchar("cover_image", { length: 500 }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

export const itineraryItems = pgTable("itinerary_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tripId: integer("trip_id").notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }),
  day: integer("day").notNull(), // Day number in the trip (1-indexed)
  orderIndex: integer("order_index").notNull(), // Order within the day
  time: varchar("time", { length: 50 }), // e.g., "9:00 AM", "Morning", "Afternoon"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  notes: text("notes"), // User's personal notes
  createdAt: timestamp("created_at").notNull(),
  travelTimeFromPrev: integer("travel_time_minutes"), // Calculated via API
  rationale: text("rationale"), // "We scheduled this at 2 PM to avoid crowds"
  weatherContext: varchar("weather_context", { length: 50 }), // "Perfect for Rainy Day"
});

export type ItineraryItem = typeof itineraryItems.$inferSelect;
export type InsertItineraryItem = typeof itineraryItems.$inferInsert;

export const candidates = pgTable("candidates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  sourceUrl: text("source_url"), // Where did the AI find it? (ArchDaily, etc)
  aiScore: integer("ai_score"), // 1-100 "Vibe Check"
  aiReasoning: text("ai_reasoning"), // "Selected because it matches your 'Brutalist' preference"
  status: varchar("status", { length: 50 }).default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
});
