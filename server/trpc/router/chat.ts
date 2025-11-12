import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';
import type { ChatMemoryTurn } from '@/drizzle/schema/chat_memory';
import { loadMemoryBundle } from '@/services/intelligence/context';

const CHAT_MEMORY_TABLE = 'chat_memory_items';

type MemoryKind = 'summary' | 'preference' | 'suggestion';

interface MemoryRow {
  id: string;
  user_id: string | null;
  session_id: string | null;
  session_token: string | null;
  memory_type: MemoryKind;
  summary: string;
  turn_window: ChatMemoryTurn[] | null;
  metadata: Record<string, any> | null;
  is_pinned: boolean | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: MemoryRow) {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    sessionId: row.session_id ?? undefined,
    sessionToken: row.session_token ?? undefined,
    type: row.memory_type,
    summary: row.summary,
    turnWindow: row.turn_window ?? [],
    metadata: row.metadata ?? {},
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateSummaryFromTurns(turns: ChatMemoryTurn[]): string {
  if (!turns.length) return '';
  const latest = turns.at(-1);
  const userMessage = turns.findLast((turn) => turn.role === 'user');
  const assistantMessage = turns.findLast((turn) => turn.role === 'assistant');

  const parts: string[] = [];
  if (userMessage) {
    parts.push(`User: ${userMessage.content}`);
  }
  if (assistantMessage) {
    parts.push(`Assistant: ${assistantMessage.content}`);
  } else if (latest) {
    parts.push(`${latest.role === 'user' ? 'User' : 'Assistant'}: ${latest.content}`);
  }

  return parts.join(' \u2014 ').slice(0, 400);
}

export const chatRouter = router({
  getMemoryBundle: publicProcedure
    .input(z.object({
      sessionId: z.string().optional(),
      sessionToken: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId ?? undefined;
      const sessionToken = input?.sessionToken;
      const sessionId = input?.sessionId;

      if (!userId && !sessionToken && !sessionId) {
        return { bundle: { recentTrips: [], pinnedPreferences: [], priorSuggestions: [], turnSummaries: [] } };
      }

      const bundle = await loadMemoryBundle({
        userId,
        sessionToken,
        sessionId,
      });

      return { bundle };
    }),

  persistSummary: protectedProcedure
    .input(z.object({
      sessionId: z.string(),
      sessionToken: z.string().optional(),
      turns: z.array(z.object({
        role: z.union([z.literal('user'), z.literal('assistant'), z.literal('system')]),
        content: z.string(),
        timestamp: z.string().optional(),
      })).min(1),
      summary: z.string().optional(),
      metadata: z.record(z.any()).optional(),
      type: z.union([z.literal('summary'), z.literal('suggestion'), z.literal('preference')]).default('summary'),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase;
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Supabase client unavailable' });
      }

      const summary = input.summary?.trim() || generateSummaryFromTurns(input.turns);

      const payload = {
        user_id: ctx.userId,
        session_id: input.sessionId,
        session_token: input.sessionToken || null,
        memory_type: input.type,
        summary,
        turn_window: input.turns,
        metadata: input.metadata || {},
        is_pinned: input.isPinned ?? (input.type === 'preference'),
      };

      const { data, error } = await supabase
        .from<MemoryRow>(CHAT_MEMORY_TABLE)
        .insert(payload)
        .select('*')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Unable to persist memory' });
      }

      return mapRow(data);
    }),

  updateMemory: protectedProcedure
    .input(z.object({
      id: z.string(),
      summary: z.string().min(1).optional(),
      isPinned: z.boolean().optional(),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase;
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Supabase client unavailable' });
      }

      const updates: Record<string, any> = {};
      if (typeof input.summary === 'string') {
        updates.summary = input.summary.trim();
      }
      if (typeof input.isPinned === 'boolean') {
        updates.is_pinned = input.isPinned;
      }
      if (input.metadata) {
        updates.metadata = input.metadata;
      }

      if (Object.keys(updates).length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'No updates provided' });
      }

      const { data, error } = await supabase
        .from<MemoryRow>(CHAT_MEMORY_TABLE)
        .update(updates)
        .eq('id', input.id)
        .eq('user_id', ctx.userId)
        .select('*')
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message || 'Unable to update memory' });
      }

      return mapRow(data);
    }),

  deleteMemory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const supabase = ctx.supabase;
      if (!supabase) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Supabase client unavailable' });
      }

      const { error } = await supabase
        .from(CHAT_MEMORY_TABLE)
        .delete()
        .eq('id', input.id)
        .eq('user_id', ctx.userId);

      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return { success: true };
    }),
});
