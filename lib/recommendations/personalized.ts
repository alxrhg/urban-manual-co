export interface UserPreferenceProfile {
  user_id: string;
  category_scores?: Record<string, number> | string | null;
  city_scores?: Record<string, number> | string | null;
  style_preferences?: Record<string, number | boolean> | string | null;
  preferred_times?: Record<string, string[]> | string | null;
  preference_embedding?: number[] | string | null;
  last_updated?: string | null;
}

export interface DestinationWithFeatures {
  slug: string;
  name: string;
  city?: string | null;
  country?: string | null;
  category?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, any> | string | null;
  trending_score?: number | null;
  rating?: number | null;
  feature_vector?: number[] | string | null;
  embedding?: number[] | string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface PersonalizedScoringOptions {
  limit?: number;
  context?: string;
  preferenceWeight?: number;
  embeddingWeight?: number;
  trendingWeight?: number;
  recencyWeight?: number;
  recencyHalfLifeDays?: number;
}

export interface ScoredDestination<T = any> extends DestinationWithFeatures {
  personalized_score: number;
  score_components: {
    preference: number;
    embedding: number;
    recency: number;
    trending: number;
  };
  context?: string;
  original?: T;
}

type FeatureVector = Map<string, number>;

type NumericVector = number[];

const DEFAULT_OPTIONS: Required<
  Pick<
    PersonalizedScoringOptions,
    'preferenceWeight' | 'embeddingWeight' | 'trendingWeight' | 'recencyWeight' | 'recencyHalfLifeDays' | 'limit'
  >
> = {
  preferenceWeight: 0.45,
  embeddingWeight: 0.35,
  trendingWeight: 0.1,
  recencyWeight: 0.1,
  recencyHalfLifeDays: 45,
  limit: 20,
};

export function scorePersonalizedDestinations<T extends DestinationWithFeatures>(
  destinations: T[],
  profile: UserPreferenceProfile | null,
  options: PersonalizedScoringOptions = {}
): ScoredDestination<T>[] {
  if (!profile || destinations.length === 0) {
    return [];
  }

  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const userFeatureVector = buildUserFeatureVector(profile);
  const userEmbedding = normalizeNumericVector(parseNumericVector(profile.preference_embedding));

  const trendingValues = destinations
    .map((dest) => getNumericValue(dest.trending_score ?? getMetadataValue(dest, 'trending_score')))
    .filter((value): value is number => typeof value === 'number');
  const trendingMax = trendingValues.length > 0 ? Math.max(...trendingValues.map((v) => Math.abs(v))) : 0;

  return destinations
    .map((dest) => {
      const featureVector = buildDestinationFeatureVector(dest);
      const preferenceScore = vectorSimilarity(userFeatureVector, featureVector);

      const destinationEmbedding = normalizeNumericVector(getDestinationEmbedding(dest));
      const embeddingScore =
        destinationEmbedding &&
        userEmbedding &&
        destinationEmbedding.length === userEmbedding.length
          ? cosineSimilarity(userEmbedding, destinationEmbedding)
          : 0;

      const recencyScore = computeRecencyBoost(
        (dest.updated_at as string | undefined) ||
          (getMetadataValue(dest, 'updated_at') as string | undefined) ||
          (dest.created_at as string | undefined),
        mergedOptions.recencyHalfLifeDays
      );

      const rawTrending = getNumericValue(dest.trending_score ?? getMetadataValue(dest, 'trending_score')) ?? 0;
      const trendingScore = trendingMax > 0 ? rawTrending / trendingMax : 0;

      const personalizedScore =
        preferenceScore * mergedOptions.preferenceWeight +
        embeddingScore * mergedOptions.embeddingWeight +
        recencyScore * mergedOptions.recencyWeight +
        trendingScore * mergedOptions.trendingWeight;

      return {
        ...(dest as DestinationWithFeatures),
        personalized_score: clamp(personalizedScore, 0, 1),
        score_components: {
          preference: preferenceScore,
          embedding: embeddingScore,
          recency: recencyScore,
          trending: trendingScore,
        },
        context: options.context,
        original: dest,
      };
    })
    .sort((a, b) => b.personalized_score - a.personalized_score)
    .slice(0, mergedOptions.limit);
}

function buildUserFeatureVector(profile: UserPreferenceProfile): FeatureVector {
  const vector: FeatureVector = new Map();

  const categoryScores = normalizeRecord(parseRecord(profile.category_scores));
  const cityScores = normalizeRecord(parseRecord(profile.city_scores));
  const stylePreferences = parseRecord(profile.style_preferences);
  const preferredTimes = parseRecord(profile.preferred_times);

  Object.entries(categoryScores).forEach(([category, weight]) => {
    vector.set(`category:${category.toLowerCase()}`, weight);
  });

  Object.entries(cityScores).forEach(([city, weight]) => {
    vector.set(`city:${city.toLowerCase()}`, weight);
  });

  Object.entries(stylePreferences).forEach(([key, value]) => {
    const numeric = typeof value === 'boolean' ? (value ? 1 : 0) : Number(value);
    if (!Number.isNaN(numeric) && numeric > 0) {
      vector.set(`style:${key.toLowerCase()}`, normalizeScalar(numeric));
    }
  });

  Object.entries(preferredTimes).forEach(([timeOfDay, categories]) => {
    if (Array.isArray(categories)) {
      const weight = 0.1;
      categories.forEach((category) => {
        vector.set(`time:${timeOfDay.toLowerCase()}:${String(category).toLowerCase()}`, weight);
      });
    }
  });

  return vector;
}

function buildDestinationFeatureVector(destination: DestinationWithFeatures): FeatureVector {
  const vector: FeatureVector = new Map();
  const metadata = parseRecord(destination.metadata);

  if (destination.category) {
    vector.set(`category:${destination.category.toLowerCase()}`, 1);
  }

  if (destination.city) {
    vector.set(`city:${destination.city.toLowerCase()}`, 1);
  }

  if (Array.isArray(destination.tags)) {
    destination.tags
      .filter((tag): tag is string => typeof tag === 'string')
      .forEach((tag) => {
        vector.set(`tag:${tag.toLowerCase()}`, 0.8);
      });
  }

  const cuisines = metadata?.cuisines;
  if (Array.isArray(cuisines)) {
    cuisines
      .filter((cuisine: unknown): cuisine is string => typeof cuisine === 'string')
      .forEach((cuisine) => {
        vector.set(`cuisine:${cuisine.toLowerCase()}`, 0.7);
      });
  }

  const vibe = metadata?.vibe || metadata?.style;
  if (typeof vibe === 'string') {
    vector.set(`style:${vibe.toLowerCase()}`, 0.6);
  }

  const priceLevel = metadata?.price_level ?? metadata?.priceLevel;
  if (typeof priceLevel === 'number') {
    vector.set('price_level', normalizeScalar(priceLevel));
  }

  const keywords = metadata?.keywords;
  if (Array.isArray(keywords)) {
    keywords
      .filter((keyword: unknown): keyword is string => typeof keyword === 'string')
      .forEach((keyword) => {
        vector.set(`keyword:${keyword.toLowerCase()}`, 0.5);
      });
  }

  return vector;
}

function vectorSimilarity(a: FeatureVector, b: FeatureVector): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const value of a.values()) {
    magnitudeA += value * value;
  }

  for (const value of b.values()) {
    magnitudeB += value * value;
  }

  for (const [key, value] of b.entries()) {
    const other = a.get(key);
    if (typeof other === 'number') {
      dotProduct += other * value;
    }
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  return clamp(similarity, 0, 1);
}

function cosineSimilarity(a: NumericVector, b: NumericVector): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const valueA = a[i];
    const valueB = b[i];
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function computeRecencyBoost(updatedAt?: string | null, halfLifeDays = 45): number {
  if (!updatedAt) return 0;
  const timestamp = Date.parse(updatedAt);
  if (Number.isNaN(timestamp)) return 0;

  const ageMs = Date.now() - timestamp;
  if (ageMs <= 0) return 1;

  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const lambda = Math.log(2) / Math.max(halfLifeDays, 1);
  return clamp(Math.exp(-lambda * ageDays), 0, 1);
}

function getDestinationEmbedding(destination: DestinationWithFeatures): NumericVector | null {
  const featureVector = parseNumericVector(destination.feature_vector ?? getMetadataValue(destination, 'feature_vector'));
  if (featureVector) return featureVector;
  return parseNumericVector(destination.embedding);
}

function parseRecord<T = Record<string, any>>(input: T | string | null | undefined): Record<string, any> {
  if (!input) return {};
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  if (typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, any>;
  }
  return {};
}

function parseNumericVector(input: NumericVector | string | null | undefined): NumericVector | null {
  if (!input) return null;
  if (Array.isArray(input)) {
    const numeric = input.filter((value): value is number => typeof value === 'number');
    return numeric.length === input.length ? numeric : null;
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'number')) {
        return parsed as number[];
      }
    } catch (error) {
      return null;
    }
  }
  return null;
}

function normalizeRecord(record: Record<string, any>): Record<string, number> {
  const entries = Object.entries(record)
    .map(([key, value]) => [key, Number(value)] as const)
    .filter(([, value]) => !Number.isNaN(value) && Number.isFinite(value));

  if (entries.length === 0) {
    return {};
  }

  const max = Math.max(...entries.map(([, value]) => Math.abs(value)));
  if (max === 0) {
    return Object.fromEntries(entries.map(([key]) => [key, 0]));
  }

  return Object.fromEntries(entries.map(([key, value]) => [key, value / max]));
}

function normalizeScalar(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value === 0) return 0;
  if (value > 0 && value <= 1) return value;
  return 1 / (1 + Math.exp(-value));
}

function normalizeNumericVector(vector: NumericVector | null): NumericVector | null {
  if (!vector || vector.length === 0) return null;
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return null;
  return vector.map((value) => value / magnitude);
}

function getMetadataValue(destination: DestinationWithFeatures, key: string): unknown {
  const metadata = parseRecord(destination.metadata);
  if (metadata && Object.prototype.hasOwnProperty.call(metadata, key)) {
    return metadata[key];
  }
  return undefined;
}

function getNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
