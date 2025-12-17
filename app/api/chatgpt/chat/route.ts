/**
 * ChatGPT-style Chat API
 * Streaming chat completions using OpenAI or Gemini
 */

import { NextRequest } from 'next/server';
import { openai, OPENAI_MODEL } from '@/lib/openai';
import { genAI, GEMINI_MODEL } from '@/lib/gemini';
import {
  conversationRatelimit,
  memoryConversationRatelimit,
  getIdentifier,
  isUpstashConfigured,
} from '@/lib/rate-limit';
import { getUser } from '@/lib/errors';

const SYSTEM_PROMPT = `You are ChatGPT, a helpful AI assistant created by OpenAI. You are knowledgeable, friendly, and helpful.

For this Urban Manual travel app, you have special expertise in:
- Travel recommendations and trip planning
- Restaurant, hotel, and cafe suggestions
- City guides and destination advice
- Local experiences and hidden gems

Be conversational, helpful, and provide detailed responses when appropriate. Format your responses with markdown when it helps readability (bullet points, headers, etc).`;

function createSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const user = await getUser(request);
    const userId = user?.id;

    // Rate limiting
    const identifier = getIdentifier(request, userId);
    const ratelimit = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
    const { success } = await ratelimit.limit(identifier);

    if (!success) {
      return new Response(
        encoder.encode(createSSEMessage({
          type: 'error',
          error: 'Too many requests. Please wait a moment.',
        })),
        {
          status: 429,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        encoder.encode(createSSEMessage({ type: 'error', error: 'Messages array is required' })),
        {
          status: 400,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          // Try OpenAI first
          if (openai?.chat) {
            try {
              const openaiMessages = [
                { role: 'system' as const, content: SYSTEM_PROMPT },
                ...messages.map((msg: { role: string; content: string }) => ({
                  role: msg.role as 'user' | 'assistant',
                  content: msg.content,
                })),
              ];

              const response = await openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: openaiMessages,
                temperature: 0.7,
                max_tokens: 2000,
                stream: true,
              });

              for await (const chunk of response) {
                const content = chunk.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  controller.enqueue(encoder.encode(createSSEMessage({
                    type: 'chunk',
                    content,
                  })));
                }
              }
            } catch (openaiError) {
              console.error('OpenAI error, falling back to Gemini:', openaiError);
              // Fall through to Gemini
            }
          }

          // Fallback to Gemini if OpenAI failed or unavailable
          if (!fullResponse && genAI) {
            try {
              const model = genAI.getGenerativeModel({
                model: GEMINI_MODEL,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2000,
                },
                systemInstruction: SYSTEM_PROMPT,
              });

              // Convert messages to Gemini format
              const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
              }));

              const lastMessage = messages[messages.length - 1]?.content || '';

              let result;
              if (history.length > 0) {
                const chat = model.startChat({ history });
                result = await chat.sendMessageStream(lastMessage);
              } else {
                result = await model.generateContentStream(lastMessage);
              }

              for await (const chunk of result.stream) {
                const content = chunk.text();
                if (content) {
                  fullResponse += content;
                  controller.enqueue(encoder.encode(createSSEMessage({
                    type: 'chunk',
                    content,
                  })));
                }
              }
            } catch (geminiError) {
              console.error('Gemini error:', geminiError);
            }
          }

          // Final fallback
          if (!fullResponse) {
            fullResponse = "I apologize, but I'm having trouble connecting to my language model. Please try again in a moment.";
            controller.enqueue(encoder.encode(createSSEMessage({
              type: 'chunk',
              content: fullResponse,
            })));
          }

          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'complete',
          })));

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'error',
            error: 'Failed to generate response',
          })));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      encoder.encode(createSSEMessage({
        type: 'error',
        error: 'Failed to process request',
      })),
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }
    );
  }
}
