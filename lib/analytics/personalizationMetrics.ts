import { createClient } from '@/lib/supabase/client';

export interface PersonalizationMetricPayload {
  userId?: string;
  destinationId?: number;
  destinationSlug?: string;
  surface: string;
  experimentKey?: string;
  variation?: string;
  recommendationId?: string;
  clickThrough?: boolean;
  dwellTimeMs?: number | null;
  payload?: Record<string, unknown> | null;
}

function toNull<T>(value: T | undefined | null): T | null {
  return value === undefined ? null : (value as T | null);
}

export async function logPersonalizationMetric(payload: PersonalizationMetricPayload) {
  try {
    const supabase = createClient();
    const sessionResult = await supabase.auth.getSession();
    const sessionUserId = sessionResult?.data?.session?.user?.id;
    const userId = payload.userId ?? sessionUserId;

    if (!userId) {
      return;
    }

    const record = {
      user_id: userId,
      destination_id: toNull(payload.destinationId),
      destination_slug: toNull(payload.destinationSlug),
      surface: payload.surface,
      experiment_key: toNull(payload.experimentKey),
      variation: toNull(payload.variation),
      recommendation_id: toNull(payload.recommendationId),
      click_through: payload.clickThrough ?? null,
      dwell_time_ms: payload.dwellTimeMs ?? null,
      metadata: payload.payload ?? null,
    };

    await supabase.from('personalization_metrics').insert(record);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PersonalizationMetrics] Failed to log metric:', error);
    }
  }
}

