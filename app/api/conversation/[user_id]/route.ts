/**
 * Conversation API with GPT-5-turbo and Memory
 * Handles multi-turn conversations with context summarization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { openai, OPENAI_MODEL } from '@/lib/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { URBAN_MANUAL_EDITOR_SYSTEM_PROMPT } from '@/lib/ai/systemPrompts';
import { formatFewShots } from '@/lib/ai/fewShots';
import {
  getOrCreateSession,
  getConversationMessages,
  saveMessage,
  updateContext,
  summarizeContext,
  getContextSuggestions,
  type ConversationContext,
  type ConversationMessage,
} from '../utils/contextHandler';
import { extractIntent } from '@/app/api/intent/schema';
import { logConversationMetrics } from '@/lib/metrics/conversationMetrics';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Use GPT-5-turbo if available, otherwise fall back to OpenAI model or Gemini
const CONVERSATION_MODEL = process.env.OPENAI_CONVERSATION_MODEL || OPENAI_MODEL;

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const { message, session_token } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get user context
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const paramsValue = context?.params && typeof context.params.then === 'function'
      ? await context.params
      : context?.params;
    const { user_id } = paramsValue || {};
    const userId = user?.id || user_id || undefined;

    // Get or create session
    const session = await getOrCreateSession(userId, session_token);
    if (!session) {
      return NextResponse.json({ error: 'Failed to initialize session' }, { status: 500 });
    }

    // Get conversation history
    let messages = await getConversationMessages(session.sessionId, 20);

    // Extract intent from new message
    let userContext: any = {};
    if (userId && supabase) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('favorite_cities, favorite_categories, travel_style')
          .eq('user_id', userId)
          .single();
        // Handle errors gracefully - user_profiles might not exist or RLS might block
        if (!profileError && profile) {
          userContext = {
            favoriteCities: profile.favorite_cities,
            favoriteCategories: profile.favorite_categories,
            travelStyle: profile.travel_style,
          };
        }
      } catch (error) {
        // Silently fail - user context is optional
        console.debug('User profile fetch failed (optional):', error);
      }
    }

    const intent = await extractIntent(message, messages, userContext);

    // Save user message
    await saveMessage(session.sessionId, {
      role: 'user',
      content: message,
      intent_data: intent,
    });

    // Update context from intent
    const contextUpdates: Partial<ConversationContext> = {};
    if (intent.city) contextUpdates.city = intent.city;
    if (intent.category) contextUpdates.category = intent.category;
    if (intent.temporalContext?.timeframe === 'now') {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) contextUpdates.meal = 'breakfast';
      else if (hour >= 12 && hour < 17) contextUpdates.meal = 'lunch';
      else if (hour >= 17 && hour < 22) contextUpdates.meal = 'dinner';
    }
    if (intent.constraints?.preferences?.length) {
      const prefs = intent.constraints.preferences;
      if (prefs.some((p: string) => p.toLowerCase().includes('romantic'))) contextUpdates.mood = 'romantic';
      if (prefs.some((p: string) => p.toLowerCase().includes('cozy'))) contextUpdates.mood = 'cozy';
      if (prefs.some((p: string) => p.toLowerCase().includes('buzzy'))) contextUpdates.mood = 'buzzy';
    }

    await updateContext(session.sessionId, contextUpdates);

    // Build messages for LLM
    const systemPrompt = `${URBAN_MANUAL_EDITOR_SYSTEM_PROMPT}\n\n${formatFewShots(3)}\n\nCurrent context: ${JSON.stringify({ ...session.context, ...contextUpdates })}`;
    
    const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 messages to avoid token limits)
    const recentMessages = messages.slice(-10);
    for (const msg of recentMessages) {
      llmMessages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    // Add current user message
    llmMessages.push({ role: 'user', content: message });

    // Generate response using GPT-5-turbo or fallback
    let assistantResponse = '';
    let usedModel = 'unknown';

    if (openai && CONVERSATION_MODEL.startsWith('gpt')) {
      try {
        // Separate system from conversation messages for OpenAI
        const systemMsg = llmMessages.find(m => m.role === 'system');
        const conversationMsgs = llmMessages.filter(m => m.role !== 'system');
        
        const openaiMessages = [
          ...(systemMsg ? [{ role: 'system' as const, content: systemMsg.content }] : []),
          ...conversationMsgs.map((msg) => ({
            role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: msg.content,
          })),
        ];

        const response = await openai.chat.completions.create({
          model: CONVERSATION_MODEL,
          messages: openaiMessages,
          temperature: 0.8,
          max_tokens: 150,
        });

        assistantResponse = response.choices?.[0]?.message?.content || '';
        usedModel = CONVERSATION_MODEL;
      } catch (error) {
        console.error('OpenAI error, falling back:', error);
      }
    }

    // Fallback to Gemini if OpenAI failed or not configured
    if (!assistantResponse && genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const prompt = llmMessages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
        const result = await model.generateContent(prompt);
        assistantResponse = result.response.text();
        usedModel = GEMINI_MODEL;
      } catch (error) {
        console.error('Gemini error:', error);
      }
    }

    // Final fallback
    if (!assistantResponse) {
      const fallbackSuggestions = await getContextSuggestions({ ...session.context, ...contextUpdates });
      assistantResponse = fallbackSuggestions.length > 0
        ? fallbackSuggestions[0]
        : "Noted. I'll help you find something great.";
    }

    // Save assistant message
    await saveMessage(session.sessionId, {
      role: 'assistant',
      content: assistantResponse,
    });

    // Check if summarization is needed (every 5 turns)
    if (messages.length >= 10 && messages.length % 5 === 0) {
      await summarizeContext(session.sessionId, [
        ...messages,
        { role: 'user', content: message },
        { role: 'assistant', content: assistantResponse },
      ]);
    }

    // Log metrics
    await logConversationMetrics({
      userId: userId || session_token || 'anonymous',
      messageCount: messages.length + 2,
      intentType: intent.primaryIntent,
      modelUsed: usedModel,
      hasContext: Object.keys(session.context).length > 0,
    });

    // Get suggestions for next turn
    const suggestions = await getContextSuggestions({ ...session.context, ...contextUpdates });

    return NextResponse.json({
      message: assistantResponse,
      context: { ...session.context, ...contextUpdates },
      intent,
      suggestions: suggestions.slice(0, 3),
      session_id: session.sessionId,
      model: usedModel,
    });
  } catch (error: any) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process conversation', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Retrieve conversation history
 */
export async function GET(
  _request: NextRequest,
  context: any
) {
  try {
    const { searchParams } = new URL(_request.url);
    const session_token = searchParams.get('session_token') || undefined;

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const paramsValue = context?.params && typeof context.params.then === 'function'
      ? await context.params
      : context?.params;
    const { user_id } = paramsValue || {};
    const userId = user?.id || user_id || undefined;

    const session = await getOrCreateSession(userId, session_token);
    if (!session) {
      return NextResponse.json({ messages: [], context: {} });
    }

    const messages = await getConversationMessages(session.sessionId, 20);

    return NextResponse.json({
      messages,
      context: session.context,
      session_id: session.sessionId,
    });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 });
  }
}

