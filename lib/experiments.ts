import type { PostgrestError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { createServerClient } from '@/lib/supabase/server';

export type ExperimentKey =
  | 'personalized_home_sections'
  | 'recently_viewed_personalization'
  | 'visit_history_personalization';

export interface ExperimentAssignment {
  key: ExperimentKey;
  variation: string;
  enabled: boolean;
  payload: Record<string, unknown> | null;
  source: 'supabase' | 'default';
  fetchedAt: string;
}

const DEFAULT_ASSIGNMENTS: Record<ExperimentKey, ExperimentAssignment> = {
  personalized_home_sections: {
    key: 'personalized_home_sections',
    variation: 'control',
    enabled: true,
    payload: null,
    source: 'default',
    fetchedAt: new Date(0).toISOString(),
  },
  recently_viewed_personalization: {
    key: 'recently_viewed_personalization',
    variation: 'control',
    enabled: true,
    payload: null,
    source: 'default',
    fetchedAt: new Date(0).toISOString(),
  },
  visit_history_personalization: {
    key: 'visit_history_personalization',
    variation: 'control',
    enabled: true,
    payload: null,
    source: 'default',
    fetchedAt: new Date(0).toISOString(),
  },
};

const ASSIGNMENT_CACHE = new Map<string, ExperimentAssignment>();

function buildCacheKey(key: ExperimentKey, userId?: string | null) {
  return `${key}:${userId ?? 'anonymous'}`;
}

function normalizePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload) return null;
  if (typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  try {
    return JSON.parse(String(payload));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Experiments] Failed to parse payload', error);
    }
    return null;
  }
}

function normalizeVariation(
  variation: string | null | undefined,
  enabled: boolean | null | undefined
) {
  if (variation) return variation;
  return enabled ? 'treatment' : 'control';
}

function normalizeEnabled(value: boolean | null | undefined, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function logSupabaseError(error: PostgrestError | null | undefined) {
  if (!error) return;
  if (error.code === '42P01') {
    // Table/view does not exist yet. Fail silently.
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Experiments] Supabase experiments tables missing:', error.message);
    }
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('[Experiments] Supabase error:', error);
  }
}

export function getDefaultAssignment(key: ExperimentKey): ExperimentAssignment {
  return {
    ...DEFAULT_ASSIGNMENTS[key],
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchSupabaseAssignment(
  key: ExperimentKey,
  userId?: string,
  context: 'server' | 'client' = typeof window === 'undefined' ? 'server' : 'client'
): Promise<ExperimentAssignment | null> {
  try {
    const supabase =
      context === 'server' ? await createServerClient() : createClient();

    const { data, error } = await supabase
      .from('experiment_assignments')
      .select('experiment_key, variation, enabled, payload')
      .eq('experiment_key', key)
      .eq('user_id', userId ?? '')
      .maybeSingle();

    if (error) {
      logSupabaseError(error);
    }

    if (data) {
      return {
        key,
        variation: normalizeVariation(data.variation, data.enabled),
        enabled: normalizeEnabled(data.enabled, DEFAULT_ASSIGNMENTS[key].enabled),
        payload: normalizePayload(data.payload),
        source: 'supabase',
        fetchedAt: new Date().toISOString(),
      };
    }

    // Fallback to experiment defaults stored in Supabase (if available)
    const { data: experiment, error: experimentError } = await supabase
      .from('experiments')
      .select('key, default_enabled, default_variation, payload, enabled')
      .eq('key', key)
      .maybeSingle();

    if (experimentError) {
      logSupabaseError(experimentError);
    }

    if (experiment) {
      const fallbackEnabled = normalizeEnabled(
        experiment.enabled ?? experiment.default_enabled,
        DEFAULT_ASSIGNMENTS[key].enabled
      );

      return {
        key,
        variation: normalizeVariation(
          experiment.default_variation as string | undefined,
          fallbackEnabled
        ),
        enabled: fallbackEnabled,
        payload: normalizePayload(experiment.payload),
        source: 'supabase',
        fetchedAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Experiments] Failed to load assignment:', error);
    }
  }

  return null;
}

export async function getExperimentAssignment(
  key: ExperimentKey,
  options: { userId?: string; context?: 'server' | 'client'; bypassCache?: boolean } = {}
): Promise<ExperimentAssignment> {
  const context = options.context ?? (typeof window === 'undefined' ? 'server' : 'client');
  const cacheKey = buildCacheKey(key, options.userId);

  if (!options.bypassCache && ASSIGNMENT_CACHE.has(cacheKey)) {
    return ASSIGNMENT_CACHE.get(cacheKey)!;
  }

  const assignment = await fetchSupabaseAssignment(key, options.userId, context);

  if (assignment) {
    ASSIGNMENT_CACHE.set(cacheKey, assignment);
    return assignment;
  }

  const fallback = getDefaultAssignment(key);
  ASSIGNMENT_CACHE.set(cacheKey, fallback);
  return fallback;
}

export async function getExperimentAssignments(
  keys: ExperimentKey[],
  options: { userId?: string; context?: 'server' | 'client'; bypassCache?: boolean } = {}
) {
  const results: Partial<Record<ExperimentKey, ExperimentAssignment>> = {};

  await Promise.all(
    keys.map(async (key) => {
      results[key] = await getExperimentAssignment(key, options);
    })
  );

  return results as Record<ExperimentKey, ExperimentAssignment>;
}

export async function isExperimentEnabled(
  key: ExperimentKey,
  options?: { userId?: string; context?: 'server' | 'client'; bypassCache?: boolean }
) {
  const assignment = await getExperimentAssignment(key, options);
  return assignment.enabled;
}

