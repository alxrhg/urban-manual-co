import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

type ToggleAction = 'add' | 'remove';

interface ToggleRequestBody {
  destination_slug?: string;
  action?: ToggleAction;
  visited_at?: string;
  country_name?: string;
  country_code?: string;
  country_iso2?: string;
  country_iso3?: string;
}

function normalizeCountryCode(body: ToggleRequestBody): { code?: string; name?: string } {
  const code = body.country_iso3 || body.country_code || body.country_iso2;
  if (!code) {
    return { code: undefined, name: undefined };
  }
  return {
    code: code.trim().toUpperCase(),
    name: body.country_name?.trim(),
  };
}

async function verifyVisit(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  destinationSlug: string,
) {
  const { data, error } = await supabase
    .from('visited_places')
    .select('id, visited_at')
    .eq('user_id', userId)
    .eq('destination_slug', destinationSlug)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data ?? null;
}

async function upsertVisitedCountry(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  countryCode?: string,
  countryName?: string,
) {
  if (!countryCode || !countryName) return;

  await supabase
    .from('visited_countries')
    .upsert(
      {
        user_id: userId,
        country_code: countryCode,
        country_name: countryName,
        visited_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,country_code',
      },
    );
}

async function removeVisitedCountryIfNecessary(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  countryCode?: string,
) {
  if (!countryCode) return;

  // Check if the user still has other visited places for this country.
  const { data: remaining, error } = await supabase
    .from('visited_places')
    .select(
      `
        destination_slug,
        destinations!inner(country)
      `,
    )
    .eq('user_id', userId)
    .limit(1)
    .eq('destinations.country', countryCode);

  if (error && error.code !== 'PGRST116') {
    // Unexpected error – do not remove the country record.
    return;
  }

  if (remaining && remaining.length > 0) {
    return;
  }

  await supabase
    .from('visited_countries')
    .delete()
    .eq('user_id', userId)
    .eq('country_code', countryCode);
}

export async function POST(request: NextRequest) {
  try {
    const { destination_slug, action, visited_at, ...rest }: ToggleRequestBody = await request.json();

    if (!destination_slug || typeof destination_slug !== 'string') {
      return NextResponse.json(
        { error: 'Missing destination slug' },
        { status: 400 },
      );
    }

    const normalizedAction: ToggleAction = action === 'remove' ? 'remove' : 'add';

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { code: countryCode, name: countryName } = normalizeCountryCode(rest);

    if (normalizedAction === 'remove') {
      const { error } = await supabase
        .from('visited_places')
        .delete()
        .eq('user_id', user.id)
        .eq('destination_slug', destination_slug);

      if (error) {
        return NextResponse.json(
          { error: error.message || 'Failed to remove visit' },
          { status: 500 },
        );
      }

      await removeVisitedCountryIfNecessary(supabase, user.id, countryCode);

      return NextResponse.json({
        success: true,
        visited: false,
      });
    }

    // Add or update visit
    const visitTimestamp = visited_at || new Date().toISOString();
    const { data, error } = await supabase
      .from('visited_places')
      .upsert(
        {
          user_id: user.id,
          destination_slug,
          visited_at: visitTimestamp,
        },
        {
          onConflict: 'user_id,destination_slug',
        },
      )
      .select()
      .maybeSingle();

    let visitRecord = data ?? null;

    if (error) {
      const message = error.message || '';

      if (
        message.includes('activity_feed') ||
        message.includes('row-level security') ||
        message.toLowerCase().includes('recursion')
      ) {
        visitRecord = await verifyVisit(supabase, user.id, destination_slug);
        if (!visitRecord) {
          return NextResponse.json(
            { error: 'Visit saved but verification failed. Please retry.' },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: message || 'Failed to save visit' },
          { status: 500 },
        );
      }
    }

    if (!visitRecord) {
      visitRecord = await verifyVisit(supabase, user.id, destination_slug);
      if (!visitRecord) {
        return NextResponse.json(
          { error: 'Visit verification failed' },
          { status: 500 },
        );
      }
    }

    await upsertVisitedCountry(supabase, user.id, countryCode, countryName);

    // Fire-and-forget discovery tracking (optional)
    fetch(`${request.nextUrl.origin}/api/discovery/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        eventType: 'visit',
        documentId: destination_slug,
      }),
    }).catch(() => {
      /* ignore tracking errors */
    });

    return NextResponse.json({
      success: true,
      visited: true,
      visit: visitRecord,
    });
  } catch (error: any) {
    console.error('Error in POST /api/visited-places/toggle:', error);
    const message =
      error?.message ||
      error?.toString?.() ||
      'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}


