import { createServiceRoleClient } from '@/lib/supabase-server';

interface PreferencePayload {
  user_id: string;
  category_scores: Record<string, number>;
  city_scores: Record<string, number>;
  style_preferences: Record<string, number>;
  preferred_times: Record<string, string[]>;
  last_updated: string;
}

interface DestinationSummary {
  category?: string | null;
  city?: string | null;
  metadata?: Record<string, any> | string | null;
}

async function main() {
  const supabase = createServiceRoleClient();

  const userIds = await fetchAllUserIds(supabase);
  console.log(`Found ${userIds.length} users to backfill preferences for.`);

  let processed = 0;
  for (const chunk of chunkArray(userIds, 10)) {
    await Promise.all(
      chunk.map(async (userId) => {
        try {
          const payload = await buildPreferencePayload(supabase, userId);
          if (!payload) {
            return;
          }

          const { error } = await (supabase
            .from('user_preferences')
            .upsert as any)(payload, { onConflict: 'user_id' });

          if (error) {
            throw error;
          }

          processed += 1;
          console.log(`\u2714\ufe0f Updated preferences for user ${userId} (${processed}/${userIds.length})`);
        } catch (error) {
          console.error(`\u274c Failed to backfill preferences for user ${userId}:`, error);
        }
      })
    );
  }

  console.log('Backfill complete.');
}

async function fetchAllUserIds(supabase: ReturnType<typeof createServiceRoleClient>): Promise<string[]> {
  const userIds: string[] = [];
  let page = 1;
  const perPage = 500;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw error;
    }

    userIds.push(...(data.users ?? []).map((user) => user.id));

    if (!data.nextPage) {
      break;
    }

    page = data.nextPage;
  }

  return userIds;
}

async function buildPreferencePayload(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<PreferencePayload | null> {
  const [interactionsResult, visitsResult, savedResult] = await Promise.all([
    supabase
      .from('user_interactions')
      .select('interaction_type, destination:destinations(category, city, metadata)')
      .eq('user_id', userId)
      .limit(500),
    supabase
      .from('visit_history')
      .select('visited_at, destination:destinations(category, city, metadata)')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(250),
    supabase
      .from('saved_destinations')
      .select('saved_at, destination:destinations(category, city, metadata)')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .limit(250),
  ]);

  if (interactionsResult.error) throw interactionsResult.error;
  if (visitsResult.error) throw visitsResult.error;
  if (savedResult.error) throw savedResult.error;

  const interactions = (interactionsResult.data as Array<{
    interaction_type: string;
    destination: DestinationSummary | null;
  }> | null) ?? [];
  const visits = (visitsResult.data as Array<{
    visited_at: string | null;
    destination: DestinationSummary | null;
  }> | null) ?? [];
  const saved = (savedResult.data as Array<{
    saved_at: string | null;
    destination: DestinationSummary | null;
  }> | null) ?? [];

  if (
    interactions.length === 0 &&
    visits.length === 0 &&
    saved.length === 0
  ) {
    return null;
  }

  const categoryScores: Record<string, number> = {};
  const cityScores: Record<string, number> = {};
  const styleScores: Record<string, number> = {};
  const preferredTimes: Record<string, Set<string>> = {};

  const addCategory = (category: string | null | undefined, weight: number) => {
    if (!category) return;
    const key = category.toLowerCase();
    categoryScores[key] = (categoryScores[key] ?? 0) + weight;
  };

  const addCity = (city: string | null | undefined, weight: number) => {
    if (!city) return;
    const key = city.toLowerCase();
    cityScores[key] = (cityScores[key] ?? 0) + weight;
  };

  const addStyleFromMetadata = (metadata: DestinationSummary['metadata'], weight: number) => {
    if (!metadata) return;
    const parsed = typeof metadata === 'string' ? safeJsonParse(metadata) : metadata;
    if (!parsed) return;

    if (typeof parsed.vibe === 'string') {
      const key = parsed.vibe.toLowerCase();
      styleScores[key] = (styleScores[key] ?? 0) + weight;
    }

    if (typeof parsed.style === 'string') {
      const key = parsed.style.toLowerCase();
      styleScores[key] = (styleScores[key] ?? 0) + weight * 0.8;
    }

    if (Array.isArray(parsed.tags)) {
      parsed.tags
        .filter((tag: unknown): tag is string => typeof tag === 'string')
        .forEach((tag) => {
          const key = tag.toLowerCase();
          styleScores[key] = (styleScores[key] ?? 0) + weight * 0.5;
        });
    }
  };

  const addPreferredTime = (timestamp: string | null | undefined, category: string | null | undefined) => {
    if (!timestamp || !category) return;
    const bucket = timeOfDayBucket(timestamp);
    if (!bucket) return;
    const key = category.toLowerCase();
    if (!preferredTimes[bucket]) {
      preferredTimes[bucket] = new Set();
    }
    preferredTimes[bucket].add(key);
  };

  const interactionWeights: Record<string, number> = {
    view: 1,
    click: 2,
    search: 2.5,
    save: 4,
    visit: 3,
  };

  interactions.forEach(({ interaction_type, destination }) => {
    const weight = interactionWeights[interaction_type] ?? 1;
    addCategory(destination?.category, weight);
    addCity(destination?.city, weight);
    addStyleFromMetadata(destination?.metadata, weight * 0.6);
  });

  visits.forEach(({ visited_at, destination }) => {
    const weight = 3.5;
    addCategory(destination?.category, weight);
    addCity(destination?.city, weight);
    addStyleFromMetadata(destination?.metadata, weight * 0.7);
    addPreferredTime(visited_at, destination?.category);
  });

  saved.forEach(({ saved_at, destination }) => {
    const weight = 4.5;
    addCategory(destination?.category, weight);
    addCity(destination?.city, weight);
    addStyleFromMetadata(destination?.metadata, weight * 0.8);
    addPreferredTime(saved_at, destination?.category);
  });

  const payload: PreferencePayload = {
    user_id: userId,
    category_scores: normalizeScores(categoryScores),
    city_scores: normalizeScores(cityScores),
    style_preferences: normalizeScores(styleScores),
    preferred_times: Object.fromEntries(
      Object.entries(preferredTimes).map(([bucket, values]) => [bucket, Array.from(values)])
    ),
    last_updated: new Date().toISOString(),
  };

  return payload;
}

function normalizeScores(scores: Record<string, number>): Record<string, number> {
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    return {};
  }

  const max = Math.max(...entries.map(([, value]) => Math.abs(value)));
  if (max === 0) {
    return Object.fromEntries(entries.map(([key]) => [key, 0]));
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, Number((value / max).toFixed(4))]));
}

function timeOfDayBucket(timestamp: string): string | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 22) return 'evening';
  return 'late-night';
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function safeJsonParse(value: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch (error) {
    return null;
  }
}

main().catch((error) => {
  console.error('Backfill script failed:', error);
  process.exit(1);
});
