/**
 * Extended Conversation Memory Service
 * Adds hot-cache support, queue-backed summarisation, and structured context helpers
 */

import { createServiceRoleClient } from '@/lib/supabase-server';
import { getRedisClient } from '@/lib/redis-client';

export interface ConversationPreferences {
  budget?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  favoredCategories?: string[];
  favoredCuisines?: string[];
  dislikedCategories?: string[];
  travelPace?: 'slow' | 'balanced' | 'fast';
  partySize?: number;
}

export interface ConversationContext {
  city?: string;
  neighborhood?: string;
  category?: string;
  travelDates?: { start?: string; end?: string };
  preferences?: ConversationPreferences;
  constraints?: {
    mobility?: 'limited' | 'standard';
    dietary?: string[];
    schedule?: string;
  };
}

export interface ConversationMemory {
  sessionId: string;
  userId?: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    intent?: unknown;
    metadata?: Record<string, unknown> | null;
  }>;
  summary?: string;
  context?: ConversationContext;
  createdAt: Date;
  lastUpdated: Date;
}

export interface ReusableConversationContext {
  recentCities: string[];
  lastSummary?: string;
  preferences: Required<Pick<ConversationPreferences, 'favoredCategories' | 'favoredCuisines'>> & {
    budget?: ConversationPreferences['budget'];
    travelPace?: ConversationPreferences['travelPace'];
  };
}

interface CachedConversationMemory {
  sessionId: string;
  userId?: string;
  messages: ConversationMemory['messages'];
  summary?: string;
  context?: ConversationContext;
  createdAt: string;
  lastUpdated: string;
}

type ConversationMessageRow = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  intent_data?: unknown;
  metadata?: Record<string, unknown> | null;
};

type ConversationSessionRow = {
  id?: string;
  context?: ConversationContext | null;
  user_id?: string | null;
  created_at?: string | null;
  last_updated?: string | null;
  summary?: string | null;
  context_summary?: string | null;
  preference_categories?: string[] | null;
  preference_cuisines?: string[] | null;
  preference_budget_min?: number | null;
  preference_budget_max?: number | null;
  preference_currency?: string | null;
};

class ConversationMemoryCache {
  private ttlSeconds: number;
  private maxCachedMessages: number;
  private redis = getRedisClient();

  constructor(ttlSeconds: number, maxCachedMessages: number) {
    this.ttlSeconds = ttlSeconds;
    this.maxCachedMessages = maxCachedMessages;
  }

  private getKey(sessionId: string) {
    return `conversation:memory:${sessionId}`;
  }

  async get(sessionId: string): Promise<ConversationMemory | null> {
    if (!this.redis) return null;
    const raw = await this.redis.get<string>(this.getKey(sessionId));
    if (!raw) return null;

    try {
      const cached = JSON.parse(raw) as CachedConversationMemory;
      return {
        sessionId: cached.sessionId,
        userId: cached.userId,
        messages: cached.messages.map(message => ({
          ...message,
          timestamp: new Date(message.timestamp),
        })),
        summary: cached.summary,
        context: cached.context,
        createdAt: new Date(cached.createdAt),
        lastUpdated: new Date(cached.lastUpdated),
      };
    } catch (error) {
      console.warn('Failed to parse cached conversation memory', error);
      return null;
    }
  }

  async set(memory: ConversationMemory): Promise<void> {
    if (!this.redis) return;
    const payload: CachedConversationMemory = {
      ...memory,
      createdAt: memory.createdAt.toISOString(),
      lastUpdated: memory.lastUpdated.toISOString(),
      messages: memory.messages.slice(-this.maxCachedMessages),
    };
    await this.redis.set(this.getKey(memory.sessionId), JSON.stringify(payload), {
      ex: this.ttlSeconds,
    });
  }

  async appendMessage(
    sessionId: string,
    message: ConversationMemory['messages'][number]
  ): Promise<void> {
    if (!this.redis) return;
    const cached = await this.get(sessionId);
    if (!cached) return;

    const messages = [...cached.messages, message].slice(-this.maxCachedMessages);
    await this.set({
      ...cached,
      messages,
      lastUpdated: message.timestamp,
    });
  }

  async updateContext(
    sessionId: string,
    context: ConversationContext,
    summary?: string
  ): Promise<void> {
    if (!this.redis) return;
    const cached = await this.get(sessionId);
    if (!cached) return;

    await this.set({
      ...cached,
      context,
      summary: summary ?? cached.summary,
    });
  }

  async invalidate(sessionId: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(this.getKey(sessionId));
  }
}

export class ExtendedConversationMemoryService {
  private supabase;
  private cache: ConversationMemoryCache;
  private summaryTriggerThreshold = 40;
  private summaryInterval = 10;
  private cacheTtlSeconds = 60 * 30; // 30 minutes
  private maxCachedMessages = 75;
  private sessionTtlDays = parseInt(process.env.CONVERSATION_SESSION_TTL_DAYS || '30', 10);

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      console.warn('ExtendedConversationMemoryService: Supabase client unavailable', error);
      this.supabase = null;
    }

    this.cache = new ConversationMemoryCache(this.cacheTtlSeconds, this.maxCachedMessages);
  }

  /**
   * Save conversation message to database
   */
  async saveMessage(
    sessionId: string,
    userId: string | undefined,
    role: 'user' | 'assistant' | 'system',
    content: string,
    intent?: unknown,
    metadata?: Record<string, unknown> | null
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('conversation_messages')
        .insert({
          session_id: sessionId,
          user_id: userId,
          role,
          content,
          intent_data: intent,
          metadata: metadata ?? {},
        });

      if (error) throw error;

      // Update session last_updated
      await this.supabase
        .from('conversation_sessions')
        .update({
          last_updated: new Date().toISOString(),
          ttl_expires_at: this.computeTtlExpiry().toISOString(),
        })
        .eq('id', sessionId);

      await this.cache.appendMessage(sessionId, {
        role,
        content,
        timestamp: new Date(),
        intent,
        metadata: metadata ?? null,
      });

      await this.scheduleSummaryJobIfNeeded(sessionId, userId);

      return true;
    } catch (error) {
      console.error('Error saving conversation message:', error);
      return false;
    }
  }

  /**
   * Get conversation history with cached hot context
   */
  async getConversationHistory(
    sessionId: string,
    maxMessages: number = 50,
    summarizeIfLong: boolean = true
  ): Promise<ConversationMemory | null> {
    if (!this.supabase) return null;

    try {
      if (maxMessages <= this.maxCachedMessages) {
        const cached = await this.cache.get(sessionId);
        if (cached) {
          return {
            ...cached,
            messages: cached.messages.slice(-maxMessages),
          };
        }
      }

      const { data: messages, error, count } = await this.supabase
        .from('conversation_messages')
        .select('*', { count: 'exact' })
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(maxMessages);

      if (error) throw error;
      if (!messages || messages.length === 0) {
        return null;
      }

      if (summarizeIfLong && (count || 0) > this.summaryTriggerThreshold) {
        const { data: sessionMeta } = await this.supabase
          .from('conversation_sessions')
          .select('user_id')
          .eq('id', sessionId)
          .single();
        await this.scheduleSummaryJobIfNeeded(sessionId, sessionMeta?.user_id);
      }

      const { data: session } = await this.supabase
        .from('conversation_sessions')
        .select('context, user_id, created_at, last_updated, summary, context_summary')
        .eq('id', sessionId)
        .single();

      if (!session) {
        return null;
      }

      const typedMessages = (messages as ConversationMessageRow[]) || [];
      const conversation: ConversationMemory = {
        sessionId,
        userId: session.user_id,
        messages: typedMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(m.created_at),
          intent: m.intent_data,
          metadata: m.metadata ?? null,
        })),
        summary: session.summary || session.context_summary,
        context: (session.context as ConversationContext) || {},
        createdAt: new Date(session.created_at || Date.now()),
        lastUpdated: new Date(session.last_updated || Date.now()),
      };

      if (maxMessages <= this.maxCachedMessages) {
        await this.cache.set(conversation);
      }

      return conversation;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return null;
    }
  }

  /**
   * Get cross-session context (previous conversations)
   */
  async getCrossSessionContext(userId: string, limit: number = 5): Promise<Array<{
    sessionId: string;
    summary: string;
    context: ConversationContext;
    lastUpdated: Date;
  }>> {
    if (!this.supabase || !userId) return [];

    try {
      const { data: sessions, error } = await this.supabase
        .from('conversation_sessions')
        .select('id, context, last_updated, summary, context_summary')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (sessions || []).map((s: ConversationSessionRow) => ({
        sessionId: s.id || '',
        summary: s.summary || s.context_summary || '',
        context: s.context || {},
        lastUpdated: new Date(s.last_updated || Date.now()),
      }));
    } catch (error) {
      console.error('Error getting cross-session context:', error);
      return [];
    }
  }

  /**
   * Update conversation context
   */
  async updateContext(
    sessionId: string,
    context: Partial<ConversationContext>
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { data: session } = await this.supabase
        .from('conversation_sessions')
        .select('context')
        .eq('id', sessionId)
        .single();

      const currentContext = (session?.context as ConversationContext) || {};
      const mergedPreferences: ConversationPreferences = {
        ...(currentContext.preferences || {}),
        ...(context.preferences || {}),
      };

      const updatedContext: ConversationContext = {
        ...currentContext,
        ...context,
        preferences: {
          ...mergedPreferences,
          favoredCategories: Array.from(
            new Set([
              ...(currentContext.preferences?.favoredCategories || []),
              ...(context.preferences?.favoredCategories || []),
            ])
          ),
          favoredCuisines: Array.from(
            new Set([
              ...(currentContext.preferences?.favoredCuisines || []),
              ...(context.preferences?.favoredCuisines || []),
            ])
          ),
        },
      };

      const preferenceBudget = context.preferences?.budget || currentContext.preferences?.budget;

      const { error } = await this.supabase
        .from('conversation_sessions')
        .update({
          context: updatedContext,
          preference_budget_min: preferenceBudget?.min ?? null,
          preference_budget_max: preferenceBudget?.max ?? null,
          preference_currency: preferenceBudget?.currency ?? null,
          preference_categories: updatedContext.preferences?.favoredCategories || null,
          preference_cuisines: updatedContext.preferences?.favoredCuisines || null,
        })
        .eq('id', sessionId);

      if (error) throw error;
      await this.cache.updateContext(sessionId, updatedContext);
      return true;
    } catch (error) {
      console.error('Error updating context:', error);
      return false;
    }
  }

  async getReusableContext(userId: string): Promise<ReusableConversationContext | null> {
    if (!this.supabase || !userId) return null;

    try {
      const { data: sessions } = await this.supabase
        .from('conversation_sessions')
        .select('context, summary, context_summary, preference_categories, preference_cuisines, preference_budget_min, preference_budget_max, preference_currency, last_updated')
        .eq('user_id', userId)
        .order('last_updated', { ascending: false })
        .limit(5);

      if (!sessions || sessions.length === 0) {
        return null;
      }

      const recentCities = sessions
        .map((session: ConversationSessionRow) => (session.context?.city ? String(session.context.city) : undefined))
        .filter(Boolean) as string[];

      const favoredCategories = Array.from(
        new Set(
          sessions.flatMap(
            (session: ConversationSessionRow) => session.preference_categories || session.context?.preferences?.favoredCategories || []
          )
        )
      );

      const favoredCuisines = Array.from(
        new Set(
          sessions.flatMap(
            (session: ConversationSessionRow) => session.preference_cuisines || session.context?.preferences?.favoredCuisines || []
          )
        )
      );

      const budget = sessions
        .map((session: ConversationSessionRow) => ({
          min: session.preference_budget_min,
          max: session.preference_budget_max,
          currency: session.preference_currency,
        }))
        .find(entry => entry.min || entry.max);

      return {
        recentCities,
        lastSummary: sessions[0]?.summary || sessions[0]?.context_summary,
        preferences: {
          favoredCategories,
          favoredCuisines,
          budget,
          travelPace: sessions[0]?.context?.preferences?.travelPace,
        },
      };
    } catch (error) {
      console.error('Error building reusable context', error);
      return null;
    }
  }

  private async scheduleSummaryJobIfNeeded(sessionId: string, userId?: string): Promise<void> {
    if (!this.supabase) return;

    const { count } = await this.supabase
      .from('conversation_messages')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (!count || count < this.summaryTriggerThreshold) {
      return;
    }

    if (count % this.summaryInterval !== 0) {
      return;
    }

    const { data: existing } = await this.supabase
      .from('conversation_summary_jobs')
      .select('id')
      .eq('session_id', sessionId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    await this.supabase.from('conversation_summary_jobs').insert({
      session_id: sessionId,
      user_id: userId || null,
      status: 'pending',
      priority: 5,
      scheduled_at: new Date().toISOString(),
    });
  }

  private computeTtlExpiry(): Date {
    const expires = new Date();
    expires.setDate(expires.getDate() + this.sessionTtlDays);
    return expires;
  }
}

export const extendedConversationMemoryService = new ExtendedConversationMemoryService();
