/**
 * Reviews API endpoints
 * GET /api/reviews - Get reviews (with optional destination filter)
 * POST /api/reviews - Create a new review
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { CreateReviewInput } from '@/types/features';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const destinationId = searchParams.get('destination_id');
  const destinationSlug = searchParams.get('destination_slug');
  const userId = searchParams.get('user_id');
  const sort = searchParams.get('sort') || 'newest';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServerClient();

  let query = supabase
    .from('reviews')
    .select(`
      *,
      photos:review_photos(id, url, caption, order_index),
      user:user_profiles!user_id(id, display_name, username, avatar_url),
      destination:destinations!destination_id(slug, name, city, image)
    `)
    .eq('status', 'published');

  // Filters
  if (destinationId) {
    query = query.eq('destination_id', parseInt(destinationId));
  }

  if (destinationSlug) {
    // Get destination ID from slug
    const { data: dest } = await supabase
      .from('destinations')
      .select('id')
      .eq('slug', destinationSlug)
      .single();

    if (dest) {
      query = query.eq('destination_id', dest.id);
    }
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Sorting
  switch (sort) {
    case 'helpful':
      query = query.order('helpful_count', { ascending: false });
      break;
    case 'rating_high':
      query = query.order('rating', { ascending: false });
      break;
    case 'rating_low':
      query = query.order('rating', { ascending: true });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: reviews, error, count } = await query;

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch reviews', 500);
  }

  // Get user's votes if authenticated
  let userVotes: Record<string, string> = {};
  if (user && reviews?.length) {
    const reviewIds = reviews.map((r) => r.id);
    const { data: votes } = await supabase
      .from('review_votes')
      .select('review_id, vote_type')
      .eq('user_id', user.id)
      .in('review_id', reviewIds);

    if (votes) {
      userVotes = votes.reduce(
        (acc, v) => ({ ...acc, [v.review_id]: v.vote_type }),
        {}
      );
    }
  }

  // Add user vote to each review
  const reviewsWithVotes = reviews?.map((review) => ({
    ...review,
    user_vote: userVotes[review.id] || null,
  }));

  return NextResponse.json({
    reviews: reviewsWithVotes || [],
    count: count || reviews?.length || 0,
    hasMore: (reviews?.length || 0) === limit,
  });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body: CreateReviewInput = await request.json();
  const { destination_id, rating, title, content, visit_date, photos } = body;

  // Validation
  if (!destination_id || !rating) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Destination ID and rating are required', 400);
  }

  if (rating < 1 || rating > 5) {
    throw new CustomError(ErrorCode.VALIDATION_ERROR, 'Rating must be between 1 and 5', 400);
  }

  const supabase = await createServerClient();

  // Check if destination exists
  const { data: destination } = await supabase
    .from('destinations')
    .select('id')
    .eq('id', destination_id)
    .single();

  if (!destination) {
    throw new CustomError(ErrorCode.NOT_FOUND, 'Destination not found', 404);
  }

  // Check if user already reviewed this destination
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('destination_id', destination_id)
    .eq('user_id', user.id)
    .single();

  if (existingReview) {
    throw new CustomError(ErrorCode.DUPLICATE_RESOURCE, 'You have already reviewed this destination', 409);
  }

  // Check if user has visited this destination (for verified badge)
  const { data: visited } = await supabase
    .from('visited_places')
    .select('id')
    .eq('destination_id', destination_id)
    .eq('user_id', user.id)
    .single();

  // Create review
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      destination_id,
      user_id: user.id,
      rating,
      title,
      content,
      visit_date,
      is_verified: !!visited,
      status: 'published',
    })
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to create review', 500);
  }

  // Add photos if provided
  if (photos && photos.length > 0) {
    const photoInserts = photos.map((photo, index) => ({
      review_id: review.id,
      url: photo.url,
      caption: photo.caption,
      order_index: index,
    }));

    await supabase.from('review_photos').insert(photoInserts);
  }

  // Check achievements
  await supabase.rpc('check_achievements', { p_user_id: user.id });

  return NextResponse.json({ review }, { status: 201 });
});
