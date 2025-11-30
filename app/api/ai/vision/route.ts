/**
 * OpenAI Vision API endpoint
 * Analyze images using GPT-4o with Vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, searchByImage } from '@/lib/openai/vision';
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

  const { imageUrl, prompt, city, searchMode } = await request.json();

  if (!imageUrl) {
    return NextResponse.json(
      { error: 'imageUrl is required' },
      { status: 400 }
    );
  }

  if (searchMode === 'search') {
    // Visual search mode - generate search query from image
    const searchQuery = await searchByImage(imageUrl, city);
    return NextResponse.json({
      searchQuery,
      mode: 'search'
    });
  } else {
    // Analysis mode - detailed image analysis
    const analysis = await analyzeImage(imageUrl, prompt);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Failed to analyze image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis,
      mode: 'analysis'
    });
  }
});

