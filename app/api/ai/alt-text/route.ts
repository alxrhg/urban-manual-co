/**
 * AI Alt Text Generation API endpoint
 * Generate accessible alt text for images using OpenAI Vision
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAltText, generateDestinationAltText, batchGenerateAltText } from '@/lib/openai/alt-text';
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

  const body = await request.json();
  const { imageUrl, images, context, destination, maxLength, detailed } = body;

  // Batch mode: generate alt text for multiple images
  if (images && Array.isArray(images)) {
    if (images.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images per batch request' },
        { status: 400 }
      );
    }

    const results = await batchGenerateAltText(images);
    const response: Record<string, { altText: string; confidence: string; tags?: string[] } | null> = {};

    results.forEach((result, url) => {
      response[url] = result;
    });

    return NextResponse.json({
      results: response,
      mode: 'batch'
    });
  }

  // Single image mode
  if (!imageUrl) {
    return NextResponse.json(
      { error: 'imageUrl is required (or images array for batch mode)' },
      { status: 400 }
    );
  }

  // Destination-specific alt text generation
  if (destination) {
    const altText = await generateDestinationAltText(imageUrl, destination);
    return NextResponse.json({
      altText,
      mode: 'destination'
    });
  }

  // General alt text generation
  const result = await generateAltText(imageUrl, { context, maxLength, detailed });

  if (!result) {
    return NextResponse.json(
      { error: 'Failed to generate alt text' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    altText: result.altText,
    confidence: result.confidence,
    tags: result.tags,
    mode: 'single'
  });
});
