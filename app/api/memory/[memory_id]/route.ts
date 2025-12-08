/**
 * Memory API - Single Memory Operations
 * Provides endpoints for managing individual memories
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { withErrorHandling, createValidationError, createUnauthorizedError } from '@/lib/errors';
import { mem0Service, isMem0Available } from '@/lib/ai/mem0';

/**
 * GET /api/memory/[memory_id]
 * Get a specific memory by ID
 */
export const GET = withErrorHandling(async (
  _request: NextRequest,
  context: { params: Promise<{ memory_id: string }> }
) => {
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

  const params = await context.params;
  const { memory_id } = params;

  if (!memory_id) {
    throw createValidationError('Memory ID is required');
  }

  const memory = await mem0Service.get(memory_id);

  if (!memory) {
    return NextResponse.json(
      { error: 'Memory not found' },
      { status: 404 }
    );
  }

  // Verify the memory belongs to the user
  if (memory.user_id && memory.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Not authorized to access this memory' },
      { status: 403 }
    );
  }

  return NextResponse.json({ memory });
});

/**
 * PUT /api/memory/[memory_id]
 * Update a specific memory
 * Body:
 *   - content: string (required) - The updated memory content
 */
export const PUT = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ memory_id: string }> }
) => {
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

  const params = await context.params;
  const { memory_id } = params;

  if (!memory_id) {
    throw createValidationError('Memory ID is required');
  }

  const body = await request.json();
  const { content } = body as { content?: string };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw createValidationError('Content is required');
  }

  // Verify the memory exists and belongs to the user
  const existingMemory = await mem0Service.get(memory_id);

  if (!existingMemory) {
    return NextResponse.json(
      { error: 'Memory not found' },
      { status: 404 }
    );
  }

  if (existingMemory.user_id && existingMemory.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Not authorized to update this memory' },
      { status: 403 }
    );
  }

  const success = await mem0Service.update(memory_id, content.trim());

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    memory_id,
    message: 'Memory updated successfully',
  });
});

/**
 * DELETE /api/memory/[memory_id]
 * Delete a specific memory
 */
export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  context: { params: Promise<{ memory_id: string }> }
) => {
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

  const params = await context.params;
  const { memory_id } = params;

  if (!memory_id) {
    throw createValidationError('Memory ID is required');
  }

  // Verify the memory exists and belongs to the user
  const existingMemory = await mem0Service.get(memory_id);

  if (!existingMemory) {
    return NextResponse.json(
      { error: 'Memory not found' },
      { status: 404 }
    );
  }

  if (existingMemory.user_id && existingMemory.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Not authorized to delete this memory' },
      { status: 403 }
    );
  }

  const success = await mem0Service.delete(memory_id);

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    memory_id,
    message: 'Memory deleted successfully',
  });
});
