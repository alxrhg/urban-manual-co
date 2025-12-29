/**
 * Destination suggestions API
 * GET /api/suggestions - Get suggestions (with filters)
 * POST /api/suggestions - Submit a new suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withOptionalAuth } from '@/lib/errors/auth';
import { createServerClient } from '@/lib/supabase/server';
import { CustomError, ErrorCode } from '@/lib/errors/types';
import type { CreateSuggestionInput } from '@/types/features';

export const GET = withOptionalAuth(async (request: NextRequest, { user }) => {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const userId = searchParams.get('user_id');
  const sort = searchParams.get('sort') || 'newest';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = await createServerClient();

  let query = supabase
    .from('destination_suggestions')
    .select(`
      *,
      user:user_profiles!user_id(id, display_name, username, avatar_url)
    `);

  // Filters
  if (status) {
    query = query.eq('status', status);
  } else {
    // Default to pending for public view
    query = query.in('status', ['pending', 'reviewing']);
  }

  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  // Sorting
  switch (sort) {
    case 'votes':
      query = query.order('upvotes', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: suggestions, error } = await query;

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to fetch suggestions', 500);
  }

  // Get user's votes if authenticated
  let userVotes: Record<string, string> = {};
  if (user && suggestions?.length) {
    const suggestionIds = suggestions.map((s) => s.id);
    const { data: votes } = await supabase
      .from('suggestion_votes')
      .select('suggestion_id, vote_type')
      .eq('user_id', user.id)
      .in('suggestion_id', suggestionIds);

    if (votes) {
      userVotes = votes.reduce(
        (acc, v) => ({ ...acc, [v.suggestion_id]: v.vote_type }),
        {}
      );
    }
  }

  const suggestionsWithVotes = suggestions?.map((s) => ({
    ...s,
    user_vote: userVotes[s.id] || null,
  }));

  return NextResponse.json({ suggestions: suggestionsWithVotes || [] });
});

export const POST = withAuth(async (request: NextRequest, { user }) => {
  const body: CreateSuggestionInput = await request.json();
  const { name, city, country, category, address, website, instagram_handle, why_add, photo_url, latitude, longitude } =
    body;

  // Validation
  if (!name || !city || !category || !why_add) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      'Name, city, category, and reason are required',
      400
    );
  }

  if (why_add.length < 20) {
    throw new CustomError(
      ErrorCode.VALIDATION_ERROR,
      'Please provide a more detailed reason (at least 20 characters)',
      400
    );
  }

  const supabase = await createServerClient();

  // Check for duplicates (same name and city)
  const { data: existing } = await supabase
    .from('destination_suggestions')
    .select('id')
    .ilike('name', name)
    .ilike('city', city)
    .in('status', ['pending', 'reviewing', 'approved'])
    .single();

  if (existing) {
    throw new CustomError(
      ErrorCode.DUPLICATE_RESOURCE,
      'A suggestion for this place already exists',
      409
    );
  }

  // Also check against existing destinations
  const { data: existingDest } = await supabase
    .from('destinations')
    .select('id')
    .ilike('name', name)
    .ilike('city', city)
    .single();

  if (existingDest) {
    throw new CustomError(
      ErrorCode.DUPLICATE_RESOURCE,
      'This destination already exists in our catalog',
      409
    );
  }

  // Create suggestion
  const { data: suggestion, error } = await supabase
    .from('destination_suggestions')
    .insert({
      user_id: user.id,
      name: name.trim(),
      city: city.trim(),
      country: country?.trim(),
      category,
      address,
      website,
      instagram_handle,
      why_add,
      photo_url,
      latitude,
      longitude,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new CustomError(ErrorCode.DATABASE_ERROR, 'Failed to submit suggestion', 500);
  }

  return NextResponse.json({ suggestion }, { status: 201 });
});
