/**
 * Chat memory schema for Drizzle ORM migrations.
 * Defines how conversation summaries and persistent memory
 * snapshots are stored in the database.
 */

export const CHAT_MEMORY_TABLE = 'chat_memory_items';

export type ChatMemoryType = 'summary' | 'preference' | 'suggestion';

export interface ChatMemoryTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatMemoryRow {
  id: string;
  userId: string | null;
  sessionId: string | null;
  sessionToken: string | null;
  memoryType: ChatMemoryType;
  summary: string;
  turnWindow: ChatMemoryTurn[];
  metadata: Record<string, any> | null;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InsertChatMemoryRow = Omit<ChatMemoryRow, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type UpdateChatMemoryRow = Partial<Omit<ChatMemoryRow, 'createdAt' | 'updatedAt'>> & {
  id: string;
};
