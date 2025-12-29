/**
 * Single review API endpoints
 * GET /api/reviews/[id] - Get a specific review
 * PUT /api/reviews/[id] - Update own review
 * DELETE /api/reviews/[id] - Delete own review
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { UpdateReviewInput } from '@/types/features';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = withOptionalAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const supabase = await createServerClient();

  const { data: review, error } = await supabase
    .from('reviews')
    .select(`
      *,
      photos:review_photos(id, url, caption, order_index),
      user:user_profiles!user_id(id, display_name, username, avatar_url),
      destination:destinations!destination_id(slug, name, city, image)
    `)
    .eq('id', id)
    .single();

  if (error || !review) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Review not found', 404);
  }

  // Get user's vote if authenticated
  let userVote = null;
  if (user) {
    const { data: vote } = await supabase
      .from('review_votes')
      .select('vote_type')
      .eq('review_id', id)
      .eq('user_id', user.id)
      .single();

    userVote = vote?.vote_type || null;
  }

  return NextResponse.json({
    review: { ...review, user_vote: userVote },
  });
});

export const PUT = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const body: UpdateReviewInput = await request.json();
  const { rating, title, content, visit_date } = body;

  const supabase = await createServerClient();

  // Check ownership
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existingReview) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Review not found', 404);
  }

  if (existingReview.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only edit your own reviews', 403);
  }

  // Validate rating if provided
  if (rating !== undefined && (rating < 1 || rating > 5)) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Rating must be between 1 and 5', 400);
  }

  // Update review
  const updateData: Partial<UpdateReviewInput> = {};
  if (rating !== undefined) updateData.rating = rating;
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (visit_date !== undefined) updateData.visit_date = visit_date;

  const { data: review, error } = await supabase
    .from('reviews')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to update review', 500);
  }

  return NextResponse.json({ review });
});

export const DELETE = withAuth(async (request: NextRequest, { user }, context: RouteContext) => {
  const { id } = await context.params;
  const supabase = await createServerClient();

  // Check ownership
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existingReview) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Review not found', 404);
  }

  if (existingReview.user_id !== user.id) {
    throw new CustomError(ErrorCode.FORBIDDEN, 'You can only delete your own reviews', 403);
  }

  const { error } = await supabase.from('reviews').delete().eq('id', id);

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to delete review', 500);
  }

  return NextResponse.json({ success: true });
});
