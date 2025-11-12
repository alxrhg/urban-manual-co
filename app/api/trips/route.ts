import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError, handleSupabaseError } from '@/lib/errors';
import { requireUser } from '@/app/api/_utils/supabase';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { supabase, user } = await requireUser(request);

  const { data, error } = await supabase
    .from('trips')
    .select('id,title,description,destination,start_date,end_date,status,updated_at,budget')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ trips: data ?? [] });
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { supabase, user } = await requireUser(request);
  const body = await request.json();

  const {
    title,
    destination,
    startDate,
    endDate,
    description,
    status = 'planning',
    budget,
  } = body;

  if (!title || !destination || !startDate || !endDate) {
    throw createValidationError('Trip title, destination, start date, and end date are required.');
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({
      title: title.trim(),
      destination: destination.trim(),
      start_date: startDate,
      end_date: endDate,
      description: description ?? null,
      status,
      budget: typeof budget === 'number' ? budget : null,
      user_id: user.id,
    })
    .select('*')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  return NextResponse.json({ trip: data }, { status: 201 });
});
