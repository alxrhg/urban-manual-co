import { serve } from 'https://deno.land/std@0.210.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type EventType = 'view' | 'save' | 'visited';

type DestinationDetails = {
  category?: string | null;
  city?: string | null;
  price_level?: number | null;
};

type EventRow = {
  user_id: string;
  event_type: EventType;
  destinations: DestinationDetails | null;
};

type PreferenceAccumulator = {
  categories: Record<string, number>;
  cities: Record<string, number>;
  priceTiers: Record<string, number>;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function applyWeight(eventType: EventType): number {
  switch (eventType) {
    case 'visited':
      return 3;
    case 'save':
      return 2;
    default:
      return 1;
  }
}

function normaliseScores(counts: Record<string, number>, limit = 10): Record<string, number> {
  const entries = Object.entries(counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (entries.length === 0) {
    return {};
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  const normalised: Record<string, number> = {};
  for (const [key, value] of entries) {
    normalised[key] = Number((value / total).toFixed(4));
  }
  return normalised;
}

function resolvePriceTier(priceLevel: number | null | undefined): string {
  if (priceLevel === null || priceLevel === undefined) {
    return 'unknown';
  }

  if (Number.isNaN(priceLevel)) {
    return 'unknown';
  }

  const rounded = Math.max(0, Math.min(4, Math.round(priceLevel)));
  return `tier_${rounded}`;
}

serve(async (request: Request) => {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  const cronSecret = Deno.env.get('PREFERENCE_CRON_SECRET');
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const windowDays = parseInt(Deno.env.get('PREFERENCE_WINDOW_DAYS') ?? '30', 10);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (Number.isNaN(windowDays) ? 30 : windowDays));
  const sinceIso = since.toISOString();

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        'x-aggregate-source': 'aggregate-user-preferences',
      },
    },
  });

  const { data: rows, error } = await supabase
    .from('user_event_log')
    .select(
      `
        user_id,
        event_type,
        destinations:destination_id (
          category,
          city,
          price_level
        )
      `,
    )
    .gte('occurred_at', sinceIso);

  if (error) {
    return new Response(JSON.stringify({ error: error.message ?? 'Failed to load events' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const events = (rows ?? []) as EventRow[];

  if (events.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0, updated: 0 }), {
      status: 200,
      headers: jsonHeaders,
    });
  }

  const aggregates = new Map<string, PreferenceAccumulator>();

  for (const event of events) {
    if (!event.user_id || !event.destinations) {
      continue;
    }

    const weight = applyWeight(event.event_type);
    const accumulator = aggregates.get(event.user_id) ?? {
      categories: {},
      cities: {},
      priceTiers: {},
    };

    const category = event.destinations.category?.toLowerCase();
    if (category) {
      accumulator.categories[category] = (accumulator.categories[category] ?? 0) + weight;
    }

    const city = event.destinations.city?.toLowerCase();
    if (city) {
      accumulator.cities[city] = (accumulator.cities[city] ?? 0) + weight;
    }

    const priceKey = resolvePriceTier(event.destinations.price_level ?? null);
    accumulator.priceTiers[priceKey] = (accumulator.priceTiers[priceKey] ?? 0) + weight;

    aggregates.set(event.user_id, accumulator);
  }

  const nowIso = new Date().toISOString();
  let successCount = 0;
  let failureCount = 0;

  for (const [userId, preferenceCounts] of aggregates.entries()) {
    const categoryScores = normaliseScores(preferenceCounts.categories);
    const cityScores = normaliseScores(preferenceCounts.cities);
    const priceTierScores = normaliseScores(preferenceCounts.priceTiers);

    const { error: upsertError } = await supabase.from('user_preferences').upsert(
      {
        user_id: userId,
        category_scores: categoryScores,
        city_scores: cityScores,
        price_tier_scores: priceTierScores,
        last_updated: nowIso,
      },
      { onConflict: 'user_id' },
    );

    if (upsertError) {
      failureCount += 1;
    } else {
      successCount += 1;
    }
  }

  return new Response(
    JSON.stringify({
      success: failureCount === 0,
      processed: aggregates.size,
      updated: successCount,
      failures: failureCount,
      window_start: sinceIso,
    }),
    {
      status: failureCount === 0 ? 200 : 207,
      headers: jsonHeaders,
    },
  );
});
