/**
 * Similar Places Discovery API
 *
 * Find deeply similar places using embeddings and taste profile.
 * Example: "More like Narisawa" or "Similar to Blue Bottle"
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { createServerClient } from '@/lib/supabase/server';
import { smartConversationEngine } from '@/services/intelligence/smart-conversation-engine';
import { unifiedIntelligenceCore } from '@/services/intelligence/unified-intelligence-core';
import {
  SimilarPlacesRequestSchema,
  createValidationErrorResponse,
} from '@/lib/schemas/intelligence';

// ============================================
// FIND SIMILAR PLACES
// ============================================

export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Validate request body with Zod
    const rawBody = await request.json();
    const parseResult = SimilarPlacesRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(createValidationErrorResponse(parseResult.error), { status: 400 });
    }

    const { destinationSlug, destinationName, sessionId, limit } = parseResult.data;

    // Get session context
    const session = await smartConversationEngine.getOrCreateSession(sessionId, userId);

    // Get intelligence context if logged in
    let intelligenceContext = null;
    if (userId) {
      try {
        const result = await unifiedIntelligenceCore.processIntelligentQuery(
          `similar to ${destinationSlug || destinationName}`,
          userId,
          session.id,
          {}
        );
        intelligenceContext = result.context;
      } catch (error) {
        console.error('Error getting intelligence context:', error);
      }
    }

    // If we only have name, try to find the slug
    let searchSlug = destinationSlug;
    if (!searchSlug && destinationName) {
      // Convert name to likely slug format
      searchSlug = destinationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Find similar places
    const similarPlaces = await smartConversationEngine.findSimilarPlaces(
      searchSlug,
      session,
      intelligenceContext,
      limit
    );

    if (similarPlaces.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No similar places found for "${destinationSlug || destinationName}"`,
        suggestion: 'Try a different destination or check the spelling',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        sourceSlug: searchSlug,
        similarPlaces,
        count: similarPlaces.length,
        // Average match score
        avgMatchScore: Math.round(
          (similarPlaces.reduce((sum, p) => sum + p.reasoning.matchScore, 0) / similarPlaces.length) * 100
        ),
      },
    });
  } catch (error: any) {
    console.error('[Similar Places] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to find similar places',
    }, { status: 500 });
  }
});

// ============================================
// GET SIMILAR BY ID
// ============================================

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!slug) {
      return NextResponse.json({
        success: false,
        error: 'Slug parameter is required',
      }, { status: 400 });
    }

    const supabase = await createServerClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const userId = authSession?.user?.id;

    // Get session context
    const session = await smartConversationEngine.getOrCreateSession(null, userId);

    // Get intelligence context if logged in
    let intelligenceContext = null;
    if (userId) {
      try {
        const result = await unifiedIntelligenceCore.processIntelligentQuery(
          `similar to ${slug}`,
          userId,
          session.id,
          {}
        );
        intelligenceContext = result.context;
      } catch (error) {
        console.error('Error getting intelligence context:', error);
      }
    }

    // Find similar places
    const similarPlaces = await smartConversationEngine.findSimilarPlaces(
      slug,
      session,
      intelligenceContext,
      limit
    );

    return NextResponse.json({
      success: true,
      data: {
        sourceSlug: slug,
        similarPlaces,
        count: similarPlaces.length,
      },
    });
  } catch (error: any) {
    console.error('[Similar Places GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to find similar places',
    }, { status: 500 });
  }
});
