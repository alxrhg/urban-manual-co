import { TRPCError } from '@trpc/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { router, protectedProcedure } from '..';
import type { ConversationMessage } from '@/drizzle/schema/conversations';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { formatFewShots } from '@/lib/ai/fewShots';
import { getModelForQuery, openai, OPENAI_MODEL } from '@/lib/openai';

const MAX_CONTEXT_MESSAGES = 12;
const SUMMARY_TRIGGER_MESSAGES = 8;
const RESPONSE_TIMEOUT_MS = 8000;

type StoredMessage = Pick<ConversationMessage, 'role' | 'content'> & { created_at: string };

type GenerateResponseParams = {
  history: StoredMessage[];
  summary: string | null;
  message: string;
};

type GenerateResponseResult = {
  text: string;
  model: string;
};

async function loadConversationMessages(
  supabase: SupabaseClient,
  sessionId: string
): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to load conversation history',
      cause: error,
    });
  }

  return (data || []).map((item) => ({
    role: item.role as StoredMessage['role'],
    content: item.content as string,
    created_at: item.created_at as string,
  }));
}

async function summarizeOldMessages(
  olderMessages: StoredMessage[],
  previousSummary: string | null
): Promise<string | null> {
  if (olderMessages.length === 0) {
    return previousSummary;
  }

  const conversationText = olderMessages
    .map((msg) => `${msg.role === 'assistant' ? 'Assistant' : 'User'}: ${msg.content}`)
    .join('\n');

  const instructions = `Summarize this travel planning conversation in 3 concise sentences. Capture:
- Cities or neighbourhoods of interest
- Desired vibes, cuisines, budgets, or constraints
- Key recommendations already shared or next steps

${previousSummary ? `Existing summary (for reference):\n${previousSummary}\n\n` : ''}Conversation:\n${conversationText}`;

  const chatClient: any = openai.chat?.completions;
  if (chatClient?.create) {
    try {
      const response = await withTimeout(
        chatClient.create({
          model: OPENAI_MODEL,
          temperature: 0.2,
          max_tokens: 180,
          messages: [
            {
              role: 'system',
              content: 'You condense travel-planning chats into short, information-rich summaries. Keep it focused and factual.',
            },
            { role: 'user', content: instructions },
          ],
        }),
        RESPONSE_TIMEOUT_MS,
        null
      );

      const text = (response as any)?.choices?.[0]?.message?.content?.trim();
      if (text) {
        return text;
      }
    } catch (error) {
      console.error('Conversation summary failed:', error);
    }
  }

  const fallbackTail = olderMessages
    .slice(-4)
    .map((msg) => `${msg.role === 'assistant' ? 'Guide' : 'Traveler'}: ${msg.content}`)
    .join(' ');

  const combined = [previousSummary, fallbackTail].filter(Boolean).join(' ');
  return combined ? combined.slice(0, 500) : null;
}

async function prepareConversationContext(
  messages: StoredMessage[],
  existingSummary: string | null
): Promise<{ summary: string | null; messages: StoredMessage[] }> {
  if (messages.length <= SUMMARY_TRIGGER_MESSAGES) {
    return {
      summary: existingSummary,
      messages,
    };
  }

  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
  const olderMessages = messages.slice(0, messages.length - recentMessages.length);
  const summary = await summarizeOldMessages(olderMessages, existingSummary);

  return {
    summary,
    messages: recentMessages,
  };
}

function buildSystemPrompt(summary: string | null): string {
  const fewShots = formatFewShots(3);
  const summaryBlock = summary ? `\n\nConversation so far (summary):\n${summary}` : '';
  return `${URBAN_MANUAL_EDITOR_SYSTEM_PROMPT}\n\n${fewShots}${summaryBlock}`;
}

async function generateAssistantResponse(
  params: GenerateResponseParams
): Promise<GenerateResponseResult> {
  const { history, summary, message } = params;
  const systemPrompt = buildSystemPrompt(summary);

  const conversationHistory = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  const model = getModelForQuery(message, [
    ...conversationHistory,
    { role: 'user', content: message },
  ]);

  const chatClient: any = openai.chat?.completions;
  if (chatClient?.create) {
    try {
      const response = await withTimeout(
        chatClient.create({
          model,
          temperature: 0.8,
          max_tokens: 200,
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message },
          ],
        }),
        RESPONSE_TIMEOUT_MS,
        null
      );

      const text = (response as any)?.choices?.[0]?.message?.content?.trim();
      if (text) {
        return { text, model };
      }
    } catch (error) {
      console.error('Assistant response failed:', error);
    }
  }

  return {
    text: "I'll keep that in mind and look for spots that match. Feel free to share more details!",
    model: 'fallback',
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export const chatRouter = router({
  send: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1, 'Message is required'),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const message = input.message.trim();

      if (!message) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Message cannot be empty' });
      }

      const sessionId = input.sessionId || crypto.randomUUID();
      const nowIso = new Date().toISOString();

      const { error: sessionError } = await supabase.from('conversation_sessions').upsert(
        {
          id: sessionId,
          user_id: userId,
          started_at: nowIso,
          last_activity: nowIso,
        },
        { onConflict: 'id' }
      );

      if (sessionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create conversation session',
          cause: sessionError,
        });
      }

      const { data: sessionRow, error: fetchSessionError } = await supabase
        .from('conversation_sessions')
        .select('context_summary')
        .eq('id', sessionId)
        .maybeSingle();

      if (fetchSessionError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load session metadata',
          cause: fetchSessionError,
        });
      }

      const existingSummary = (sessionRow?.context_summary as string | null) || null;

      const storedMessages = await loadConversationMessages(supabase, sessionId);
      const { summary, messages: historyMessages } = await prepareConversationContext(
        storedMessages,
        existingSummary
      );

      if (summary !== existingSummary) {
        await supabase
          .from('conversation_sessions')
          .update({
            context_summary: summary ?? null,
            last_activity: nowIso,
          })
          .eq('id', sessionId);
      } else {
        await supabase
          .from('conversation_sessions')
          .update({ last_activity: nowIso })
          .eq('id', sessionId);
      }

      const { error: insertUserError } = await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: message,
      });

      if (insertUserError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to store message',
          cause: insertUserError,
        });
      }

      const { text: assistantText, model: usedModel } = await generateAssistantResponse({
        history: historyMessages,
        summary,
        message,
      });

      const { error: insertAssistantError } = await supabase.from('conversation_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantText,
      });

      if (insertAssistantError) {
        console.error('Failed to store assistant reply:', insertAssistantError);
      }

      const augmentedHistory: StoredMessage[] = [
        ...historyMessages,
        { role: 'user', content: message, created_at: nowIso },
        { role: 'assistant', content: assistantText, created_at: new Date().toISOString() },
      ];

      const recentMessages = augmentedHistory.slice(-MAX_CONTEXT_MESSAGES);

      return {
        sessionId,
        response: assistantText,
        summary,
        model: usedModel,
        messages: recentMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          createdAt: msg.created_at,
        })),
      };
    }),

  history: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { supabase, userId } = ctx;
      const nowIso = new Date().toISOString();
      const sessionId = input.sessionId || crypto.randomUUID();

      if (!input.sessionId) {
        await supabase.from('conversation_sessions').upsert(
          {
            id: sessionId,
            user_id: userId,
            started_at: nowIso,
            last_activity: nowIso,
          },
          { onConflict: 'id' }
        );
      }

      const { data: sessionRow } = await supabase
        .from('conversation_sessions')
        .select('context_summary')
        .eq('id', sessionId)
        .maybeSingle();

      const { data, error } = await supabase
        .from('conversation_messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load conversation history',
          cause: error,
        });
      }

      const orderedMessages = (data || []).slice().reverse();

      return {
        sessionId,
        summary: (sessionRow?.context_summary as string | null) || null,
        messages: orderedMessages.map((msg) => ({
          role: msg.role as StoredMessage['role'],
          content: msg.content as string,
          createdAt: msg.created_at as string,
        })),
      };
    }),
});
