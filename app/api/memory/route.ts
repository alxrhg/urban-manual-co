/**
 * Memory API - Mem0 Integration
 * Provides endpoints for managing user memories for personalized AI interactions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError, createUnauthorizedError } from '@/lib/errors';
import { mem0Service, isMem0Available } from '@/lib/ai/mem0';
import type { MemoryMetadata, TravelMemory } from '@/types/mem0';

/**
 * GET /api/memory
 * Get memories for the authenticated user
 * Query params:
 *   - query: Search query (optional - if provided, searches; otherwise returns all)
 *   - limit: Max results (default: 20)
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  if (!isMem0Available()) {
    return NextResponse.json(
      { error: 'Memory service not configured' },
      { status: 503 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw createUnauthorizedError('Authentication required');
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  let memories;

  if (query) {
    // Search memories
    memories = await mem0Service.search(query, {
      user_id: user.id,
      limit,
    });
  } else {
    // Get all memories
    memories = await mem0Service.getAll({ user_id: user.id });
  }

  return NextResponse.json({
    memories,
    count: memories.length,
    user_id: user.id,
  });
});

/**
 * POST /api/memory
 * Add a new memory for the authenticated user
 * Body:
 *   - content: string (required) - The memory content
 *   - type?: TravelMemoryType - Type of travel memory
 *   - metadata?: MemoryMetadata - Additional metadata
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!isMem0Available()) {
    return NextResponse.json(
      { error: 'Memory service not configured' },
      { status: 503 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw createUnauthorizedError('Authentication required');
  }

  const body = await request.json();
  const { content, type, metadata } = body as {
    content?: string;
    type?: TravelMemory['type'];
    metadata?: MemoryMetadata;
  };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw createValidationError('Content is required');
  }

  let result;

  if (type) {
    // Add as a travel memory with specific type
    result = await mem0Service.addTravelMemory(user.id, {
      type,
      content: content.trim(),
      metadata: metadata || {},
    });
  } else {
    // Add as a generic memory
    result = await mem0Service.add(content.trim(), {
      user_id: user.id,
      metadata,
    });
  }

  if (!result) {
    return NextResponse.json(
      { error: 'Failed to add memory' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    result,
    user_id: user.id,
  });
});

/**
 * DELETE /api/memory
 * Delete all memories for the authenticated user
 * Use with caution!
 */
export const DELETE = withErrorHandling(async (_request: NextRequest) => {
  if (!isMem0Available()) {
    return NextResponse.json(
      { error: 'Memory service not configured' },
      { status: 503 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw createUnauthorizedError('Authentication required');
  }

  const success = await mem0Service.deleteAll(user.id);

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to delete memories' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'All memories deleted',
    user_id: user.id,
  });
});
