import { z } from 'zod';

export const DEFAULT_CATEGORY_SEEDS = ['Coffee Shops', 'Art Museums', 'Design Hotels'] as const;
export const DEFAULT_CITY_SEEDS = ['Tokyo', 'Paris', 'New York'] as const;

export type PreferenceVectorEntryType = 'category' | 'city';

export interface PreferenceVectorEntry {
  name: string;
  displayName: string;
  score: number;
  type: PreferenceVectorEntryType;
}

export interface PreferenceVector {
  categories: PreferenceVectorEntry[];
  cities: PreferenceVectorEntry[];
}

export interface PreferenceSeedResult {
  categories: string[];
  cities: string[];
  vector: PreferenceVector;
  source: 'user' | 'default';
}

export type RawUserPreferences = {
  category_scores?: Record<string, number> | string | null;
  city_scores?: Record<string, number> | string | null;
  favorite_categories?: string[] | string | null;
  favorite_cities?: string[] | string | null;
  interests?: string[] | string | null;
  [key: string]: unknown;
} | null | undefined;

const scoreSchema = z.record(z.number());
const stringArraySchema = z.array(z.string().min(1));

function parseJsonValue<T>(value: unknown, schema: z.ZodType<T>): T | undefined {
  if (value == null) return undefined;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    } catch {
      // Ignore JSON parse errors and fall back below
    }
  }

  const direct = schema.safeParse(value);
  if (direct.success) {
    return direct.data;
  }

  return undefined;
}

function toDisplayName(value: string): string {
  return value
    .replace(/[_.-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeScores(entries: Array<[string, number]>): Array<[string, number]> {
  if (entries.length === 0) return entries;
  const max = Math.max(...entries.map(([, score]) => score));
  if (!isFinite(max) || max <= 0) {
    return entries.map(([name]) => [name, 1]);
  }
  return entries.map(([name, score]) => [name, Number((score / max).toFixed(4))]);
}

function buildEntriesFromScores(
  scores: Record<string, number> | undefined,
  type: PreferenceVectorEntryType,
  limit: number
): PreferenceVectorEntry[] {
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }

  const sorted = normalizeScores(
    Object.entries(scores)
      .filter(([, score]) => typeof score === 'number' && !Number.isNaN(score))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  );

  return sorted.map(([name, score]) => {
    const canonical = name.trim().toLowerCase();
    return {
      name: canonical,
      displayName: toDisplayName(canonical),
      score,
      type,
    };
  });
}

function buildEntriesFromArray(
  values: string[] | undefined,
  type: PreferenceVectorEntryType,
  limit: number,
  baseScore = 1
): PreferenceVectorEntry[] {
  if (!values || values.length === 0) {
    return [];
  }

  return values
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((value, index) => {
      const canonical = value.toLowerCase();
      const score = Number((baseScore - index * 0.1).toFixed(4));
      return {
        name: canonical,
        displayName: toDisplayName(canonical),
        score: score > 0 ? score : Number((0.5 - index * 0.05).toFixed(4)),
        type,
      };
    });
}

function ensureEntries(
  entries: PreferenceVectorEntry[],
  defaults: readonly string[],
  type: PreferenceVectorEntryType,
  limit: number
): PreferenceVectorEntry[] {
  if (entries.length > 0) {
    return entries;
  }

  return buildEntriesFromArray([...defaults], type, limit, 1);
}

export function extractPreferenceSeeds(
  raw: RawUserPreferences,
  options?: { limit?: number }
): PreferenceSeedResult {
  const limit = options?.limit ?? 3;

  const categoryScores = parseJsonValue(raw?.category_scores ?? raw?.categoryScores, scoreSchema);
  const cityScores = parseJsonValue(raw?.city_scores ?? raw?.cityScores, scoreSchema);

  const favoriteCategories = parseJsonValue(
    raw?.favorite_categories ?? raw?.favoriteCategories,
    stringArraySchema
  ) || parseJsonValue(raw?.interests, stringArraySchema);
  const favoriteCities = parseJsonValue(
    raw?.favorite_cities ?? raw?.favoriteCities,
    stringArraySchema
  );

  const scoredCategoryEntries = buildEntriesFromScores(categoryScores, 'category', limit);
  const fallbackCategoryEntries =
    scoredCategoryEntries.length > 0
      ? scoredCategoryEntries
      : buildEntriesFromArray(favoriteCategories, 'category', limit);
  const categoryEntries = ensureEntries(
    fallbackCategoryEntries,
    DEFAULT_CATEGORY_SEEDS,
    'category',
    limit
  );

  const scoredCityEntries = buildEntriesFromScores(cityScores, 'city', limit);
  const fallbackCityEntries =
    scoredCityEntries.length > 0
      ? scoredCityEntries
      : buildEntriesFromArray(favoriteCities, 'city', limit);
  const cityEntries = ensureEntries(
    fallbackCityEntries,
    DEFAULT_CITY_SEEDS,
    'city',
    limit
  );

  const source: 'user' | 'default' =
    (categoryScores && Object.keys(categoryScores).length > 0) ||
    (cityScores && Object.keys(cityScores).length > 0) ||
    (favoriteCategories && favoriteCategories.length > 0) ||
    (favoriteCities && favoriteCities.length > 0)
      ? 'user'
      : 'default';

  return {
    categories: categoryEntries.map(entry => entry.displayName),
    cities: cityEntries.map(entry => entry.displayName),
    vector: {
      categories: categoryEntries,
      cities: cityEntries,
    },
    source,
  };
}

export function createPlannerRuntimePayload(
  requestBody: Record<string, any>,
  userId: string,
  preferences: PreferenceSeedResult
) {
  const { action: _action, ...rest } = requestBody;

  return {
    ...rest,
    action: 'generate',
    userId,
    preferenceVector: preferences.vector,
    preferenceVectorSource: preferences.source,
  };
}

