/**
 * Mem0 Type Definitions
 * Types for the Mem0 memory layer integration
 */

/**
 * Memory entry stored in Mem0
 */
export interface Memory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: MemoryMetadata;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  agent_id?: string;
  run_id?: string;
}

/**
 * Custom metadata stored with each memory
 */
export interface MemoryMetadata {
  source?: 'conversation' | 'interaction' | 'preference' | 'trip' | 'feedback';
  category?: string;
  city?: string;
  destination_id?: number;
  destination_slug?: string;
  confidence?: number;
  context_type?: 'business' | 'leisure' | 'romantic' | 'family';
  preference_type?: 'like' | 'dislike' | 'neutral';
  price_level?: number;
  timestamp?: string;
  session_id?: string;
  tags?: string[];
}

/**
 * Options for adding a memory
 */
export interface AddMemoryOptions {
  user_id?: string;
  agent_id?: string;
  run_id?: string;
  metadata?: MemoryMetadata;
  filters?: Record<string, string | string[]>;
  prompt?: string;
}

/**
 * Options for searching memories
 */
export interface SearchMemoryOptions {
  user_id?: string;
  agent_id?: string;
  run_id?: string;
  limit?: number;
  filters?: Record<string, string | string[]>;
}

/**
 * Options for getting all memories
 */
export interface GetAllMemoriesOptions {
  user_id?: string;
  agent_id?: string;
  run_id?: string;
  limit?: number;
  page?: number;
}

/**
 * Result from adding a memory
 */
export interface AddMemoryResult {
  results: Array<{
    id: string;
    memory: string;
    event: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE';
  }>;
  relations?: Array<{
    source: string;
    relationship: string;
    target: string;
  }>;
}

/**
 * Result from searching memories
 */
export interface SearchMemoryResult {
  results: Memory[];
}

/**
 * Memory history entry
 */
export interface MemoryHistory {
  id: string;
  memory_id: string;
  old_memory?: string;
  new_memory?: string;
  event: 'ADD' | 'UPDATE' | 'DELETE';
  created_at: string;
  is_deleted: boolean;
}

/**
 * Mem0 configuration options
 */
export interface Mem0Config {
  apiKey?: string;
  orgId?: string;
  projectId?: string;
  baseUrl?: string;
}

/**
 * Travel-specific memory types for Urban Manual
 */
export interface TravelMemory {
  type: TravelMemoryType;
  content: string;
  metadata: TravelMemoryMetadata;
}

export type TravelMemoryType =
  | 'destination_preference'
  | 'cuisine_preference'
  | 'budget_preference'
  | 'travel_style'
  | 'visited_place'
  | 'saved_place'
  | 'trip_plan'
  | 'feedback'
  | 'conversation_context';

export interface TravelMemoryMetadata extends MemoryMetadata {
  preference_type?: 'like' | 'dislike' | 'neutral';
  price_level?: number;
  rating?: number;
  visited_date?: string;
  trip_context?: string;
}

/**
 * Aggregated user memory profile
 */
export interface UserMemoryProfile {
  userId: string;
  memories: Memory[];
  summary?: string;
  preferences: {
    categories: string[];
    cities: string[];
    cuisines: string[];
    priceRange?: { min: number; max: number };
    travelStyle?: string;
  };
  recentContext?: {
    lastCity?: string;
    lastCategory?: string;
    currentTrip?: string;
  };
  lastUpdated: Date;
}

/**
 * Message format for conversation memory
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    intent?: string;
    entities?: string[];
    timestamp?: string;
  };
}

/**
 * Memory extraction result from conversation
 */
export interface ExtractedMemories {
  preferences: string[];
  facts: string[];
  context: string[];
}
