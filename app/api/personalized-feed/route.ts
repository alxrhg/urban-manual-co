import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  calculateManualScore,
  getTimeOfDay,
  ManualScoreContext,
  TimeOfDay,
  UserProfileForScoring,
} from '@/lib/manual-score';
import { Destination } from '@/types/destination';

const MAX_FEED_ITEMS = 100;
type DestinationForScoring = Destination & {
  created_at?: string | null;
  review_count?: number | null;
};

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTimeOfDay(value: string | null): TimeOfDay | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'morning' || normalized === 'afternoon' || normalized === 'evening' || normalized === 'night') {
    return normalized as TimeOfDay;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const searchParams = request.nextUrl.searchParams;
    const queryUserId = searchParams.get('userId');
    const userId = queryUserId || user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 401 }
      );
    }

    const lat = parseNumber(searchParams.get('lat'));
    const lng = parseNumber(searchParams.get('lng'));
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      MAX_FEED_ITEMS
    );

    const timeOfDay = parseTimeOfDay(searchParams.get('timeOfDay')) || getTimeOfDay();

    const context: ManualScoreContext = { timeOfDay };
    if (typeof lat === 'number' && typeof lng === 'number') {
      context.userLocation = { lat, lng };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('taste_profile, implicit_interests')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile for personalized feed:', profileError);
      return NextResponse.json(
        { error: 'Failed to load user profile' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    const { data: destinations, error: destinationsError } = await supabase
      .from('destinations')
      .select('*')
      .limit(MAX_FEED_ITEMS * 2);

    if (destinationsError) {
      console.error('Error fetching destinations for personalized feed:', destinationsError);
      return NextResponse.json(
        { error: 'Failed to load destinations' },
        { status: 500 }
      );
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json(
        { error: 'No destinations available' },
        { status: 404 }
      );
    }

    const scored = destinations.map((destination) =>
      calculateManualScore(
        profile as UserProfileForScoring,
        destination as DestinationForScoring,
        context
      )
    );

    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      feed: scored.slice(0, limit),
      count: Math.min(limit, scored.length),
    });
  } catch (error) {
    console.error('Error generating personalized feed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
