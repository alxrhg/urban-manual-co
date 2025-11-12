import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import PlannerPageClient from '@/components/planner/PlannerPageClient';
import { createServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Collaborative Planner — Urban Manual',
  description:
    'Coordinate day-by-day itineraries with collaborators, live Supabase syncing, and travel intelligence recommendations.',
};

export default async function PlannerPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in?redirect=/planner');
  }

  const { data: existingTrip } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let tripId = existingTrip?.id ?? null;

  if (!tripId) {
    const now = new Date().toISOString();
    const insert = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        title: 'New collaborative trip',
        status: 'planning',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (insert.error) {
      console.error('Failed to initialize planner trip', insert.error);
      throw insert.error;
    }

    tripId = insert.data.id;
  }

  return <PlannerPageClient tripId={tripId} />;
}
