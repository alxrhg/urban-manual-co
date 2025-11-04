import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { openai } from '@/lib/openai';
import { embedText } from '@/lib/llm';

const SYSTEM_PROMPT = `You are Urban Manual's travel editor — conversational, cultured, design-savvy.

Rules:
- Respond in ≤2 sentences
- Start with acknowledgment: "Noted.", "Got it.", "Good call."
- If context incomplete, ask ONE clarifying question
- Reference location/weather/time naturally when available
- Stay warm, witty, never robotic

Return JSON:
{
  "message": "your reply to user",
  "intent": {
    "city": string | null,
    "category": "restaurant"|"hotel"|"cafe"|"attraction" | null,
    "meal": "breakfast"|"lunch"|"dinner" | null,
    "cuisine": string | null,
    "mood": string | null,
    "price_level": 1-4 | null
  },
  "needs_clarification": boolean
}`;

/**
 * Get location context from IP address
 */
async function getLocationContext(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             '0.0.0.0';

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();

    return {
      city: data.city || 'Unknown',
      country: data.country_name || 'Unknown',
      timezone: data.timezone || 'UTC',
      localTime: new Date().toLocaleTimeString('en-US', { 
        timeZone: data.timezone,
        hour: '2-digit',
        minute: '2-digit'
      }),
    };
  } catch {
    return {
      city: 'Unknown',
      country: 'Unknown',
      timezone: 'UTC',
      localTime: new Date().toLocaleTimeString(),
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create session
    let conversationSession;
    if (sessionId) {
      const { data } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', session.user.id)
        .single();
      conversationSession = data;
    }

    if (!conversationSession) {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .insert({ user_id: session.user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }

      conversationSession = data;
    }

    // Get conversation history (last 10 messages)
    const { data: history } = await supabase
      .from('conversation_messages')
      .select('role, content')
      .eq('session_id', conversationSession.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get location context
    const locationContext = await getLocationContext(request);

    // Build conversation payload
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'system', 
        content: `Context: User in ${locationContext.city}, ${locationContext.country}. Local time: ${locationContext.localTime}. Previous intent: ${JSON.stringify(conversationSession.context)}`
      },
      ...(history?.reverse() || []),
      { role: 'user', content: message }
    ];

    // Call GPT-4o
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages as any,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 200,
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    // Generate embedding for user message
    const userEmbedding = await embedText(message);

    // Save messages
    const messageInserts = [
      {
        session_id: conversationSession.id,
        user_id: session.user.id,
        role: 'user',
        content: message,
        embedding: userEmbedding ? `[${userEmbedding.join(',')}]` : null,
      },
      {
        session_id: conversationSession.id,
        user_id: session.user.id,
        role: 'assistant',
        content: response.message,
        intent_data: response.intent,
      }
    ];

    await supabase.from('conversation_messages').insert(messageInserts);

    // Update session context (merge, don't overwrite)
    const updatedContext = {
      ...conversationSession.context,
      ...response.intent,
      location: locationContext,
    };

    await supabase
      .from('conversation_sessions')
      .update({ 
        context: updatedContext,
        last_updated: new Date().toISOString()
      })
      .eq('id', conversationSession.id);

    return NextResponse.json({
      sessionId: conversationSession.id,
      message: response.message,
      intent: response.intent,
      needsClarification: response.needs_clarification,
      context: updatedContext,
    });

  } catch (error: any) {
    console.error('Conversation API error:', error);
    return NextResponse.json(
      { error: 'Failed to process conversation', details: error.message },
      { status: 500 }
    );
  }
}

