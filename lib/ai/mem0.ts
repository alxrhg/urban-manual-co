/**
 * Mem0 Memory Service
 * Provides persistent memory layer for AI interactions in Urban Manual
 *
 * This service wraps the Mem0 SDK to provide:
 * - User preference memory (cuisine, budget, travel style)
 * - Conversation context memory
 * - Trip planning memory
 * - Cross-session personalization
 */

import MemoryClient from 'mem0ai';
import type {
  Memory,
  MemoryMetadata,
  AddMemoryOptions,
  SearchMemoryOptions,
  GetAllMemoriesOptions,
  AddMemoryResult,
  TravelMemory,
  TravelMemoryType,
  UserMemoryProfile,
  ConversationMessage,
  ExtractedMemories,
} from '@/types/mem0';

// Lazy initialization of Mem0 client
let mem0Client: MemoryClient | null = null;

/**
 * Get or initialize the Mem0 client
 */
function getMem0Client(): MemoryClient | null {
  if (mem0Client) return mem0Client;

  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) {
    console.warn('[Mem0] MEM0_API_KEY not configured - memory features disabled');
    return null;
  }

  try {
    mem0Client = new MemoryClient({ apiKey });
    return mem0Client;
  } catch (error) {
    console.error('[Mem0] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Check if Mem0 is available
 */
export function isMem0Available(): boolean {
  return !!process.env.MEM0_API_KEY;
}

/**
 * Mem0 Memory Service for Urban Manual
 */
export class Mem0Service {
  private client: MemoryClient | null;

  constructor() {
    this.client = getMem0Client();
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Add a memory from conversation messages
   */
  async addFromConversation(
    messages: ConversationMessage[],
    userId: string,
    metadata?: MemoryMetadata
  ): Promise<AddMemoryResult | null> {
    if (!this.client) return null;

    try {
      // Filter out system messages as Mem0 only accepts user/assistant
      const formattedMessages = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      if (formattedMessages.length === 0) return null;

      const result = await this.client.add(formattedMessages, {
        user_id: userId,
        metadata: {
          source: 'conversation',
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      });

      return this.normalizeAddResult(result);
    } catch (error) {
      console.error('[Mem0] Error adding conversation memory:', error);
      return null;
    }
  }

  /**
   * Normalize Mem0 API response to consistent AddMemoryResult format
   */
  private normalizeAddResult(result: unknown): AddMemoryResult {
    if (Array.isArray(result)) {
      return {
        results: result.map((r: any) => ({
          id: r.id || '',
          memory: r.memory || '',
          event: (r.event || 'ADD') as 'ADD' | 'UPDATE' | 'DELETE' | 'NONE',
        })),
      };
    }
    if (result && typeof result === 'object' && 'results' in result) {
      return result as AddMemoryResult;
    }
    // Fallback for unexpected formats
    return { results: [] };
  }

  /**
   * Add a single memory with text content
   */
  async add(
    content: string,
    options: AddMemoryOptions
  ): Promise<AddMemoryResult | null> {
    if (!this.client) return null;

    try {
      const result = await this.client.add(
        [{ role: 'user', content }],
        {
          user_id: options.user_id,
          agent_id: options.agent_id,
          run_id: options.run_id,
          metadata: {
            timestamp: new Date().toISOString(),
            ...options.metadata,
          },
        }
      );

      return this.normalizeAddResult(result);
    } catch (error) {
      console.error('[Mem0] Error adding memory:', error);
      return null;
    }
  }

  /**
   * Add a travel-specific memory
   */
  async addTravelMemory(
    userId: string,
    memory: TravelMemory
  ): Promise<AddMemoryResult | null> {
    if (!this.client) return null;

    try {
      const content = this.formatTravelMemoryContent(memory);

      const result = await this.client.add(
        [{ role: 'user', content }],
        {
          user_id: userId,
          metadata: {
            source: this.mapTravelTypeToSource(memory.type),
            ...memory.metadata,
            timestamp: new Date().toISOString(),
          },
        }
      );

      return this.normalizeAddResult(result);
    } catch (error) {
      console.error('[Mem0] Error adding travel memory:', error);
      return null;
    }
  }

  /**
   * Search memories by query
   */
  async search(
    query: string,
    options: SearchMemoryOptions
  ): Promise<Memory[]> {
    if (!this.client) return [];

    try {
      const result = await this.client.search(query, {
        user_id: options.user_id,
        agent_id: options.agent_id,
        run_id: options.run_id,
        limit: options.limit || 10,
      });

      // Handle varying response formats from Mem0 API
      if (Array.isArray(result)) {
        return result as Memory[];
      }
      if (result && typeof result === 'object' && 'results' in result) {
        return (result as { results: Memory[] }).results || [];
      }
      return [];
    } catch (error) {
      console.error('[Mem0] Error searching memories:', error);
      return [];
    }
  }

  /**
   * Search for travel-related memories
   */
  async searchTravelMemories(
    userId: string,
    query: string,
    options?: {
      city?: string;
      category?: string;
      limit?: number;
    }
  ): Promise<Memory[]> {
    if (!this.client) return [];

    const enrichedQuery = this.enrichTravelQuery(query, options);

    return this.search(enrichedQuery, {
      user_id: userId,
      limit: options?.limit || 10,
    });
  }

  /**
   * Get all memories for a user
   */
  async getAll(options: GetAllMemoriesOptions): Promise<Memory[]> {
    if (!this.client) return [];

    try {
      const result = await this.client.getAll({
        user_id: options.user_id,
        agent_id: options.agent_id,
        run_id: options.run_id,
      });

      return (result as Memory[]) || [];
    } catch (error) {
      console.error('[Mem0] Error getting all memories:', error);
      return [];
    }
  }

  /**
   * Get a specific memory by ID
   */
  async get(memoryId: string): Promise<Memory | null> {
    if (!this.client) return null;

    try {
      const result = await this.client.get(memoryId);
      return result as Memory;
    } catch (error) {
      console.error('[Mem0] Error getting memory:', error);
      return null;
    }
  }

  /**
   * Update a memory
   */
  async update(memoryId: string, content: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.update(memoryId, { text: content });
      return true;
    } catch (error) {
      console.error('[Mem0] Error updating memory:', error);
      return false;
    }
  }

  /**
   * Delete a memory
   */
  async delete(memoryId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.delete(memoryId);
      return true;
    } catch (error) {
      console.error('[Mem0] Error deleting memory:', error);
      return false;
    }
  }

  /**
   * Delete all memories for a user
   */
  async deleteAll(userId: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.deleteAll({ user_id: userId });
      return true;
    } catch (error) {
      console.error('[Mem0] Error deleting all memories:', error);
      return false;
    }
  }

  /**
   * Get memory history for a specific memory
   */
  async getHistory(memoryId: string): Promise<any[]> {
    if (!this.client) return [];

    try {
      const result = await this.client.history(memoryId);
      return result as any[];
    } catch (error) {
      console.error('[Mem0] Error getting memory history:', error);
      return [];
    }
  }

  /**
   * Build a user memory profile from all memories
   */
  async getUserMemoryProfile(userId: string): Promise<UserMemoryProfile | null> {
    if (!this.client) return null;

    try {
      const memories = await this.getAll({ user_id: userId });

      if (memories.length === 0) {
        return {
          userId,
          memories: [],
          preferences: {
            categories: [],
            cities: [],
            cuisines: [],
          },
          lastUpdated: new Date(),
        };
      }

      // Extract preferences from memories
      const preferences = this.extractPreferencesFromMemories(memories);
      const recentContext = this.extractRecentContext(memories);

      return {
        userId,
        memories,
        preferences,
        recentContext,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('[Mem0] Error building user memory profile:', error);
      return null;
    }
  }

  /**
   * Record a user interaction (visit, save, view)
   */
  async recordInteraction(
    userId: string,
    interactionType: 'visit' | 'save' | 'view' | 'unsave',
    destination: {
      id?: number;
      slug: string;
      name: string;
      city?: string;
      category?: string;
    }
  ): Promise<boolean> {
    if (!this.client) return false;

    const actionVerb = {
      visit: 'visited',
      save: 'saved',
      view: 'viewed',
      unsave: 'removed from saved places',
    }[interactionType];

    const content = `User ${actionVerb} ${destination.name}${destination.city ? ` in ${destination.city}` : ''}${destination.category ? ` (${destination.category})` : ''}`;

    const result = await this.add(content, {
      user_id: userId,
      metadata: {
        source: 'interaction',
        destination_id: destination.id,
        destination_slug: destination.slug,
        city: destination.city,
        category: destination.category,
        timestamp: new Date().toISOString(),
      },
    });

    return result !== null;
  }

  /**
   * Record user feedback on a recommendation
   */
  async recordFeedback(
    userId: string,
    feedback: {
      type: 'like' | 'dislike' | 'helpful' | 'not_helpful';
      context: string;
      destination?: {
        slug: string;
        name: string;
        city?: string;
      };
    }
  ): Promise<boolean> {
    if (!this.client) return false;

    let content = '';
    if (feedback.type === 'like' || feedback.type === 'dislike') {
      const sentiment = feedback.type === 'like' ? 'liked' : "didn't like";
      content = feedback.destination
        ? `User ${sentiment} the recommendation of ${feedback.destination.name}${feedback.destination.city ? ` in ${feedback.destination.city}` : ''}`
        : `User ${sentiment} the recommendation: ${feedback.context}`;
    } else {
      const sentiment = feedback.type === 'helpful' ? 'found helpful' : "didn't find helpful";
      content = `User ${sentiment}: ${feedback.context}`;
    }

    const result = await this.add(content, {
      user_id: userId,
      metadata: {
        source: 'feedback',
        preference_type: feedback.type === 'like' || feedback.type === 'helpful' ? 'like' : 'dislike',
        destination_slug: feedback.destination?.slug,
        city: feedback.destination?.city,
      },
    });

    return result !== null;
  }

  /**
   * Get context for AI conversation from memories
   */
  async getConversationContext(
    userId: string,
    currentQuery?: string
  ): Promise<string> {
    if (!this.client) return '';

    try {
      let relevantMemories: Memory[] = [];

      // If there's a current query, search for relevant memories
      if (currentQuery) {
        relevantMemories = await this.search(currentQuery, {
          user_id: userId,
          limit: 5,
        });
      }

      // Also get recent memories for general context
      const allMemories = await this.getAll({ user_id: userId });
      const recentMemories = allMemories.slice(0, 10);

      // Combine and deduplicate
      const memoryIds = new Set(relevantMemories.map((m) => m.id));
      const combinedMemories = [
        ...relevantMemories,
        ...recentMemories.filter((m) => !memoryIds.has(m.id)),
      ].slice(0, 10);

      if (combinedMemories.length === 0) {
        return '';
      }

      // Format as context string
      const contextLines = combinedMemories.map((m) => `- ${m.memory}`);

      return `User's known preferences and history:\n${contextLines.join('\n')}`;
    } catch (error) {
      console.error('[Mem0] Error getting conversation context:', error);
      return '';
    }
  }

  // Private helper methods

  private formatTravelMemoryContent(memory: TravelMemory): string {
    const { type, content, metadata } = memory;

    switch (type) {
      case 'destination_preference':
        return `User ${metadata.preference_type === 'like' ? 'likes' : "doesn't like"} ${content}${metadata.city ? ` in ${metadata.city}` : ''}`;
      case 'cuisine_preference':
        return `User ${metadata.preference_type === 'like' ? 'enjoys' : 'avoids'} ${content} cuisine`;
      case 'budget_preference':
        return `User prefers ${content} (price level: ${metadata.price_level || 'unknown'})`;
      case 'travel_style':
        return `User's travel style: ${content}`;
      case 'visited_place':
        return `User visited ${content}${metadata.city ? ` in ${metadata.city}` : ''}${metadata.visited_date ? ` on ${metadata.visited_date}` : ''}`;
      case 'saved_place':
        return `User saved ${content}${metadata.city ? ` in ${metadata.city}` : ''} for later`;
      case 'trip_plan':
        return `User is planning a trip: ${content}`;
      case 'feedback':
        return `User feedback: ${content}`;
      case 'conversation_context':
        return content;
      default:
        return content;
    }
  }

  private mapTravelTypeToSource(
    type: TravelMemoryType
  ): MemoryMetadata['source'] {
    const sourceMap: Record<TravelMemoryType, MemoryMetadata['source']> = {
      destination_preference: 'preference',
      cuisine_preference: 'preference',
      budget_preference: 'preference',
      travel_style: 'preference',
      visited_place: 'interaction',
      saved_place: 'interaction',
      trip_plan: 'trip',
      feedback: 'feedback',
      conversation_context: 'conversation',
    };
    return sourceMap[type];
  }

  private enrichTravelQuery(
    query: string,
    options?: { city?: string; category?: string }
  ): string {
    let enrichedQuery = query;

    if (options?.city) {
      enrichedQuery += ` in ${options.city}`;
    }
    if (options?.category) {
      enrichedQuery += ` ${options.category}`;
    }

    return enrichedQuery;
  }

  private extractPreferencesFromMemories(
    memories: Memory[]
  ): UserMemoryProfile['preferences'] {
    const categories = new Set<string>();
    const cities = new Set<string>();
    const cuisines = new Set<string>();
    const priceLevels: number[] = [];

    for (const memory of memories) {
      const text = memory.memory.toLowerCase();
      const metadata = memory.metadata as MemoryMetadata | undefined;

      // Extract from metadata
      if (metadata?.category) categories.add(metadata.category);
      if (metadata?.city) cities.add(metadata.city);
      if (metadata?.price_level) priceLevels.push(metadata.price_level);

      // Extract from text patterns
      const cuisineMatch = text.match(/(?:enjoys?|likes?|prefers?)\s+(\w+)\s+cuisine/i);
      if (cuisineMatch) cuisines.add(cuisineMatch[1]);

      const cityMatch = text.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (cityMatch) cities.add(cityMatch[1]);
    }

    const priceRange = priceLevels.length > 0
      ? {
          min: Math.min(...priceLevels),
          max: Math.max(...priceLevels),
        }
      : undefined;

    return {
      categories: Array.from(categories),
      cities: Array.from(cities),
      cuisines: Array.from(cuisines),
      priceRange,
    };
  }

  private extractRecentContext(
    memories: Memory[]
  ): UserMemoryProfile['recentContext'] {
    // Get the most recent memories with location context
    const recentWithCity = memories
      .filter((m) => (m.metadata as MemoryMetadata | undefined)?.city)
      .slice(0, 3);

    const lastCity = recentWithCity[0]?.metadata
      ? (recentWithCity[0].metadata as MemoryMetadata).city
      : undefined;

    const lastCategory = memories
      .filter((m) => (m.metadata as MemoryMetadata | undefined)?.category)
      .slice(0, 1)[0]?.metadata
      ? (memories.filter((m) => (m.metadata as MemoryMetadata | undefined)?.category)[0].metadata as MemoryMetadata).category
      : undefined;

    return {
      lastCity,
      lastCategory,
    };
  }
}

// Export singleton instance
export const mem0Service = new Mem0Service();

// Export convenience functions
export async function addMemory(
  content: string,
  userId: string,
  metadata?: MemoryMetadata
): Promise<AddMemoryResult | null> {
  return mem0Service.add(content, { user_id: userId, metadata });
}

export async function searchMemories(
  query: string,
  userId: string,
  limit?: number
): Promise<Memory[]> {
  return mem0Service.search(query, { user_id: userId, limit });
}

export async function getAllMemories(userId: string): Promise<Memory[]> {
  return mem0Service.getAll({ user_id: userId });
}

export async function getMemoryContext(
  userId: string,
  query?: string
): Promise<string> {
  return mem0Service.getConversationContext(userId, query);
}
