import { datetime, json, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const conversationSessions = mysqlTable("conversation_sessions", {
  id: varchar("id", { length: 191 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 191 }),
  sessionToken: varchar("session_token", { length: 191 }),
  startedAt: datetime("started_at").default(sql`CURRENT_TIMESTAMP`),
  lastActivity: datetime("last_activity").default(sql`CURRENT_TIMESTAMP`),
  contextSummary: text("context_summary"),
  metadata: json("metadata"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export type ConversationSession = typeof conversationSessions.$inferSelect;
export type InsertConversationSession = typeof conversationSessions.$inferInsert;

export const conversationMessages = mysqlTable("conversation_messages", {
  id: varchar("id", { length: 191 }).primaryKey().default(sql`(UUID())`),
  sessionId: varchar("session_id", { length: 191 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  intentData: json("intent_data"),
  destinations: json("destinations"),
  metadata: json("metadata"),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = typeof conversationMessages.$inferInsert;
