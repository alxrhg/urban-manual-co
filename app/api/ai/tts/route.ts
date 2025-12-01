/**
 * OpenAI Text-to-Speech API endpoint
 * Convert text to speech
 */

import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech } from '@/lib/openai/tts';
import { withErrorHandling } from '@/lib/errors';
import { conversationRatelimit, memoryConversationRatelimit, getIdentifier, createRateLimitResponse, isUpstashConfigured } from '@/lib/rate-limit';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting for AI endpoints
  const identifier = getIdentifier(request);
  const limiter = isUpstashConfigured() ? conversationRatelimit : memoryConversationRatelimit;
  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  if (!success) {
    return createRateLimitResponse('Rate limit exceeded. Please try again later.', limit, remaining, reset);
  }

  const { text, voice, format, speed } = await request.json();

  if (!text) {
    return NextResponse.json(
      { error: 'text is required' },
      { status: 400 }
    );
  }

  const audioBuffer = await textToSpeech(text, {
    voice: voice || 'nova',
    format: format || 'mp3',
    speed: speed || 1.0
  });

  if (!audioBuffer) {
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }

  // Return audio as base64
  const base64 = audioBuffer.toString('base64');
  const mimeType = format === 'mp3' ? 'audio/mpeg' :
                   format === 'opus' ? 'audio/opus' :
                   format === 'aac' ? 'audio/aac' : 'audio/flac';

  return NextResponse.json({
    audio: `data:${mimeType};base64,${base64}`,
    format: format || 'mp3',
    mimeType
  });
});

