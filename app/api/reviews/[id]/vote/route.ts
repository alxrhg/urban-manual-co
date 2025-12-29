/**
 * Review voting API
 * POST /api/reviews/[id]/vote - Vote on a review
 * DELETE /api/reviews/[id]/vote - Remove vote
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: reviewId } = await context.params;
  const body = await request.json();
  const { vote_type } = body;

  if (!vote_type || !['helpful', 'not_helpful'].includes(vote_type)) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'vote_type must be "helpful" or "not_helpful"', 400);
  }

  const supabase = await createServerClient();

  // Check if review exists
  const { data: review } = await supabase
    .from('reviews')
    .select('id, user_id')
    .eq('id', reviewId)
    .single();

  if (!review) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Review not found', 404);
  }

  // Can't vote on own review
  if (review.user_id === user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You cannot vote on your own review', 403);
  }

  // Upsert vote
  const { error } = await supabase
    .from('review_votes')
    .upsert(
      {
        review_id: reviewId,
        user_id: user.id,
        vote_type,
      },
      { onConflict: 'review_id,user_id' }
    );

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to record vote', 500);
  }

  // Get updated counts
  const { data: updatedReview } = await supabase
    .from('reviews')
    .select('helpful_count, not_helpful_count')
    .eq('id', reviewId)
    .single();

  return NextResponse.json({
    success: true,
    vote_type,
    helpful_count: updatedReview?.helpful_count || 0,
    not_helpful_count: updatedReview?.not_helpful_count || 0,
  });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id: reviewId } = await context.params;
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('review_votes')
    .delete()
    .eq('review_id', reviewId)
    .eq('user_id', user.id);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to remove vote', 500);
  }

  // Get updated counts
  const { data: updatedReview } = await supabase
    .from('reviews')
    .select('helpful_count, not_helpful_count')
    .eq('id', reviewId)
    .single();

  return NextResponse.json({
    success: true,
    helpful_count: updatedReview?.helpful_count || 0,
    not_helpful_count: updatedReview?.not_helpful_count || 0,
  });
});
