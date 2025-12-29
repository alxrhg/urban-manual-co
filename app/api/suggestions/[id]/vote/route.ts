/**
 * Suggestion voting API
 * POST /api/suggestions/[id]/vote - Vote on suggestion
 * DELETE /api/suggestions/[id]/vote - Remove vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: suggestionId } = await context.params;
  const body = await request.json();
  const { vote_type } = body;

  if (!vote_type || !['up', 'down'].includes(vote_type)) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'vote_type must be "up" or "down"', 400);
  }

  const supabase = await createServerClient();

  // Check if suggestion exists
  const { data: suggestion } = await supabase
    .from('destination_suggestions')
    .select('id, user_id, upvotes, downvotes')
    .eq('id', suggestionId)
    .single();

  if (!suggestion) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Suggestion not found', 404);
  }

  // Can't vote on own suggestion
  if (suggestion.user_id === user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot vote on your own suggestion', 403);
  }

  // Check existing vote
  const { data: existingVote } = await supabase
    .from('suggestion_votes')
    .select('id, vote_type')
    .eq('suggestion_id', suggestionId)
    .eq('user_id', user.id)
    .single();

  if (existingVote) {
    if (existingVote.vote_type === vote_type) {
      return NextResponse.json({
        message: 'Already voted',
        vote_type,
        upvotes: suggestion.upvotes,
        downvotes: suggestion.downvotes,
      });
    }

    // Change vote
    await supabase
      .from('suggestion_votes')
      .update({ vote_type })
      .eq('id', existingVote.id);

    // Update counts
    const upvotes = vote_type === 'up'
      ? suggestion.upvotes + 1
      : suggestion.upvotes - 1;
    const downvotes = vote_type === 'down'
      ? suggestion.downvotes + 1
      : suggestion.downvotes - 1;

    await supabase
      .from('destination_suggestions')
      .update({ upvotes, downvotes })
      .eq('id', suggestionId);

    return NextResponse.json({ success: true, vote_type, upvotes, downvotes });
  }

  // New vote
  const { error } = await supabase.from('suggestion_votes').insert({
    suggestion_id: suggestionId,
    user_id: user.id,
    vote_type,
  });

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to record vote', 500);
  }

  // Update counts
  const upvotes = vote_type === 'up' ? suggestion.upvotes + 1 : suggestion.upvotes;
  const downvotes = vote_type === 'down' ? suggestion.downvotes + 1 : suggestion.downvotes;

  await supabase
    .from('destination_suggestions')
    .update({ upvotes, downvotes })
    .eq('id', suggestionId);

  return NextResponse.json({ success: true, vote_type, upvotes, downvotes }, { status: 201 });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: suggestionId } = await context.params;

  const supabase = await createServerClient();

  // Get current vote
  const { data: existingVote } = await supabase
    .from('suggestion_votes')
    .select('vote_type')
    .eq('suggestion_id', suggestionId)
    .eq('user_id', user.id)
    .single();

  if (!existingVote) {
    return NextResponse.json({ message: 'No vote to remove' });
  }

  // Get current counts
  const { data: suggestion } = await supabase
    .from('destination_suggestions')
    .select('upvotes, downvotes')
    .eq('id', suggestionId)
    .single();

  if (!suggestion) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Suggestion not found', 404);
  }

  // Remove vote
  await supabase
    .from('suggestion_votes')
    .delete()
    .eq('suggestion_id', suggestionId)
    .eq('user_id', user.id);

  // Update counts
  const upvotes = existingVote.vote_type === 'up'
    ? Math.max(suggestion.upvotes - 1, 0)
    : suggestion.upvotes;
  const downvotes = existingVote.vote_type === 'down'
    ? Math.max(suggestion.downvotes - 1, 0)
    : suggestion.downvotes;

  await supabase
    .from('destination_suggestions')
    .update({ upvotes, downvotes })
    .eq('id', suggestionId);

  return NextResponse.json({ success: true, upvotes, downvotes });
});
