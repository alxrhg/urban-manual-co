import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase-server';

export interface DevicePreferenceSignals {
  activeCity?: string | null;
  activeCategories?: string[] | null;
  preferredBudget?: { min?: number | null; max?: number | null } | null;
  preferredVibes?: string[] | null;
  mobilityNeeds?: string[] | null;
  travelParty?: string[] | null;
  recentSearches?: string[] | null;
  pinnedTags?: string[] | null;
}

export interface TravelerProfile {
  favoriteCategories?: string[] | null;
  favoriteCities?: string[] | null;
  interests?: string[] | null;
  budgetRange?: { min?: number | null; max?: number | null; currency?: string | null } | null;
  travelVibes?: string[] | null;
  mobilityPreferences?: string[] | null;
  travelParty?: string[] | null;
}

export interface SavedDestinationSummary {
  destination_slug: string;
  destination?: {
    slug?: string | null;
    city?: string | null;
    category?: string | null;
    price_level?: number | null;
    tags?: string[] | null;
  } | null;
}

export interface PreferenceVector {
  categoryWeights: Record<string, number>;
  cityWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  vibeWeights: Record<string, number>;
  budgetRange?: { min?: number | null; max?: number | null } | null;
  mobilityNeeds: string[];
  travelParty: string[];
}

export interface DestinationCandidate {
  slug: string;
  name?: string | null;
  city?: string | null;
  category?: string | null;
  price_level?: number | null;
  tags?: string[] | null;
  rating?: number | null;
  trending_score?: number | null;
  saves_count?: number | null;
  views_count?: number | null;
  rank_score?: number | null;
}

export interface BuildPreferenceVectorOptions {
  userId?: string | null;
  supabaseClient?: SupabaseClient;
  profile?: TravelerProfile | null;
  savedDestinations?: SavedDestinationSummary[] | null;
  deviceSignals?: DevicePreferenceSignals | null;
}

const DEFAULT_VECTOR: PreferenceVector = {
  categoryWeights: {},
  cityWeights: {},
  tagWeights: {},
  vibeWeights: {},
  budgetRange: null,
  mobilityNeeds: [],
  travelParty: [],
};

const MOBILITY_TAGS = new Set(['accessible', 'wheelchair', 'step-free', 'flat entrance', 'elevator', 'mobility-friendly']);

const TRAVEL_PARTY_TAGS: Record<string, string[]> = {
  family: ['family-friendly', 'kids', 'play', 'park'],
  couple: ['romantic', 'date-night', 'intimate'],
  friends: ['group-friendly', 'nightlife', 'lively'],
  solo: ['solo-friendly', 'cozy', 'relaxing'],
  business: ['business', 'work-friendly', 'meetings'],
};

function normalizeKey(value?: string | null): string | null {
  if (!value) return null;
  return value.toLowerCase().trim();
}

function toArray<T = string>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return toArray(parsed as unknown);
    } catch {
      return value
        .split(',')
        .map(part => part.trim())
        .filter(Boolean) as T[];
    }
  }
  return [];
}

function toObject<T = Record<string, unknown>>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as T;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function addWeight(map: Record<string, number>, key: string | null, weight = 1) {
  if (!key) return;
  const normalized = normalizeKey(key);
  if (!normalized) return;
  map[normalized] = (map[normalized] || 0) + weight;
}

function normalizeWeights(map: Record<string, number>): Record<string, number> {
  const entries = Object.entries(map);
  if (entries.length === 0) {
    return {};
  }
  const max = Math.max(...entries.map(([, value]) => value), 0);
  if (max <= 0) {
    return {};
  }
  return entries.reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = Number((value / max).toFixed(4));
    return acc;
  }, {});
}

async function fetchProfileFromSupabase(userId: string, supabase: SupabaseClient): Promise<TravelerProfile | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select(
        'favorite_categories, favorite_cities, interests, budget_range, travel_vibes, mobility_preferences, travel_party'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[personalization] Failed to load user preferences:', error);
      return null;
    }

    if (!data) return null;

    return {
      favoriteCategories: toArray<string>(data.favorite_categories),
      favoriteCities: toArray<string>(data.favorite_cities),
      interests: toArray<string>(data.interests),
      budgetRange: toObject<{ min?: number; max?: number; currency?: string | null }>(data.budget_range),
      travelVibes: toArray<string>(data.travel_vibes),
      mobilityPreferences: toArray<string>(data.mobility_preferences),
      travelParty: toArray<string>(data.travel_party),
    };
  } catch (error) {
    console.error('[personalization] Unexpected error loading profile:', error);
    return null;
  }
}

async function fetchSavedDestinations(userId: string, supabase: SupabaseClient): Promise<SavedDestinationSummary[]> {
  try {
    const { data, error } = await supabase
      .from('saved_places')
      .select(
        `
          destination_slug,
          destination:destinations!inner(
            slug,
            city,
            category,
            price_level,
            tags
          )
        `
      )
      .eq('user_id', userId);

    if (error) {
      console.warn('[personalization] Failed to load saved places:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[personalization] Unexpected error loading saved destinations:', error);
    return [];
  }
}

export async function buildPreferenceVector(options: BuildPreferenceVectorOptions): Promise<PreferenceVector> {
  const {
    userId,
    supabaseClient,
    profile: providedProfile,
    savedDestinations: providedSaved,
    deviceSignals,
  } = options;

  let supabase = supabaseClient;
  if (!supabase && userId) {
    try {
      supabase = createServiceRoleClient();
    } catch (error) {
      console.warn('[personalization] Unable to create Supabase client:', error);
    }
  }

  const profile =
    providedProfile ||
    (userId && supabase ? await fetchProfileFromSupabase(userId, supabase) : null);

  const savedDestinations =
    providedSaved ||
    (userId && supabase ? await fetchSavedDestinations(userId, supabase) : []);

  if (!profile && savedDestinations.length === 0 && !deviceSignals) {
    return { ...DEFAULT_VECTOR };
  }

  const categoryWeights: Record<string, number> = {};
  const cityWeights: Record<string, number> = {};
  const tagWeights: Record<string, number> = {};
  const vibeWeights: Record<string, number> = {};
  let budgetRange = profile?.budgetRange ?? null;
  let mobilityNeeds = profile?.mobilityPreferences?.map(value => value.toLowerCase()) ?? [];
  let travelParty = profile?.travelParty?.map(value => value.toLowerCase()) ?? [];

  // Profile-driven preferences
  profile?.favoriteCategories?.forEach(category => addWeight(categoryWeights, category, 3));
  profile?.favoriteCities?.forEach(city => addWeight(cityWeights, city, 2));
  profile?.interests?.forEach(interest => addWeight(tagWeights, interest, 1.5));
  profile?.travelVibes?.forEach(vibe => addWeight(vibeWeights, vibe, 2));

  // Saved history preferences
  const observedPrices: number[] = [];
  savedDestinations.forEach(entry => {
    const destination = entry.destination;
    if (!destination) return;

    addWeight(categoryWeights, destination.category, 1);
    addWeight(cityWeights, destination.city, 0.8);

    destination.tags?.forEach(tag => {
      addWeight(tagWeights, tag, 0.7);
      addWeight(vibeWeights, tag, 0.6);
    });

    if (destination.price_level) {
      observedPrices.push(destination.price_level);
    }
  });

  if (!budgetRange && observedPrices.length > 0) {
    const min = Math.min(...observedPrices);
    const max = Math.max(...observedPrices);
    budgetRange = { min, max };
  }

  // Device signals override / boost
  if (deviceSignals) {
    if (deviceSignals.activeCity) {
      addWeight(cityWeights, deviceSignals.activeCity, 4);
    }

    deviceSignals.activeCategories?.forEach(category => addWeight(categoryWeights, category, 5));
    deviceSignals.pinnedTags?.forEach(tag => addWeight(tagWeights, tag, 3));
    deviceSignals.recentSearches?.forEach(search => addWeight(tagWeights, search, 2));
    deviceSignals.preferredVibes?.forEach(vibe => addWeight(vibeWeights, vibe, 4));

    if (deviceSignals.preferredBudget) {
      budgetRange = {
        min: deviceSignals.preferredBudget.min ?? budgetRange?.min ?? null,
        max: deviceSignals.preferredBudget.max ?? budgetRange?.max ?? null,
      };
    }

    if (deviceSignals.mobilityNeeds?.length) {
      mobilityNeeds = deviceSignals.mobilityNeeds.map(value => value.toLowerCase());
    }

    if (deviceSignals.travelParty?.length) {
      travelParty = deviceSignals.travelParty.map(value => value.toLowerCase());
    }
  }

  return {
    categoryWeights: normalizeWeights(categoryWeights),
    cityWeights: normalizeWeights(cityWeights),
    tagWeights: normalizeWeights(tagWeights),
    vibeWeights: normalizeWeights(vibeWeights),
    budgetRange,
    mobilityNeeds,
    travelParty,
  };
}

export function scoreDestination(destination: DestinationCandidate, vector: PreferenceVector): number {
  const weights = {
    category: 0.25,
    city: 0.2,
    tags: 0.15,
    budget: 0.15,
    vibes: 0.1,
    mobility: 0.1,
    travelParty: 0.05,
  } as const;

  let score = 0;

  const categoryKey = normalizeKey(destination.category);
  if (categoryKey && vector.categoryWeights[categoryKey]) {
    score += vector.categoryWeights[categoryKey] * weights.category;
  }

  const cityKey = normalizeKey(destination.city);
  if (cityKey && vector.cityWeights[cityKey]) {
    score += vector.cityWeights[cityKey] * weights.city;
  }

  const tags = destination.tags?.map(tag => normalizeKey(tag)).filter(Boolean) as string[] | undefined;
  if (tags && tags.length > 0) {
    const tagScores = tags
      .map(tag => vector.tagWeights[tag] || 0)
      .filter(value => value > 0);

    if (tagScores.length > 0) {
      const avgTagScore = tagScores.reduce((sum, value) => sum + value, 0) / tagScores.length;
      score += avgTagScore * weights.tags;
    }

    const vibeScores = tags
      .map(tag => vector.vibeWeights[tag] || 0)
      .filter(value => value > 0);

    if (vibeScores.length > 0) {
      const avgVibeScore = vibeScores.reduce((sum, value) => sum + value, 0) / vibeScores.length;
      score += avgVibeScore * weights.vibes;
    }
  }

  if (vector.budgetRange && typeof destination.price_level === 'number') {
    const { min, max } = vector.budgetRange;
    const priceLevel = destination.price_level;

    let budgetScore = 0.5;
    if (min != null && max != null) {
      if (priceLevel >= min && priceLevel <= max) {
        budgetScore = 1;
      } else {
        const distance = priceLevel < min ? min - priceLevel : priceLevel - max;
        budgetScore = Math.max(0, 1 - distance * 0.5);
      }
    } else if (min != null) {
      budgetScore = priceLevel >= min ? 1 : Math.max(0, 1 - (min - priceLevel) * 0.5);
    } else if (max != null) {
      budgetScore = priceLevel <= max ? 1 : Math.max(0, 1 - (priceLevel - max) * 0.5);
    }

    score += budgetScore * weights.budget;
  }

  if (vector.mobilityNeeds.length > 0 && tags) {
    const tagSet = new Set(tags);
    const hasMobilitySupport = vector.mobilityNeeds.some(need => {
      if (tagSet.has(need)) return true;
      return Array.from(MOBILITY_TAGS).some(tag => tagSet.has(tag));
    });

    if (hasMobilitySupport) {
      score += 1 * weights.mobility;
    } else {
      score += 0.2 * weights.mobility;
    }
  }

  if (vector.travelParty.length > 0 && tags) {
    const tagSet = new Set(tags);
    const partyScore = vector.travelParty.reduce((acc, party) => {
      const partyTags = TRAVEL_PARTY_TAGS[party];
      if (!partyTags) return acc;
      return partyTags.some(tag => tagSet.has(tag)) ? acc + 1 : acc;
    }, 0);

    if (partyScore > 0) {
      score += Math.min(1, partyScore / vector.travelParty.length) * weights.travelParty;
    }
  }

  return Math.min(1, Number(score.toFixed(4)));
}
