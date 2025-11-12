import type { Redis } from '@upstash/redis';

export interface RecommendationCacheEntry<T = any> {
  recommendations: T[];
  cachedAt: number;
  context: string;
}

export interface RecommendationCacheRead<T = any> extends RecommendationCacheEntry<T> {
  age: number;
  isStale: boolean;
}

export interface RecommendationCacheOptions {
  ttlSeconds: number;
  staleSeconds?: number;
}

const DEFAULT_STALE_SECONDS = 600; // 10 minutes total expiry window

export async function getRecommendationCache<T>(
  redis: Redis | null,
  key: string,
  options: RecommendationCacheOptions
): Promise<RecommendationCacheRead<T> | null> {
  if (!redis) return null;

  try {
    const raw = await redis.get<RecommendationCacheEntry<T>>(key);
    if (!raw) return null;

    const age = Date.now() - raw.cachedAt;
    const freshWindow = options.ttlSeconds * 1000;
    const staleWindow = (options.staleSeconds ?? DEFAULT_STALE_SECONDS) * 1000;

    if (age > freshWindow + staleWindow) {
      return null;
    }

    return {
      ...raw,
      age,
      isStale: age > freshWindow,
    };
  } catch (error) {
    console.warn('[cache] Failed to read recommendation cache:', error);
    return null;
  }
}

export async function setRecommendationCache<T>(
  redis: Redis | null,
  key: string,
  value: RecommendationCacheEntry<T>,
  options: RecommendationCacheOptions
) {
  if (!redis) return;

  const freshWindow = options.ttlSeconds;
  const staleWindow = options.staleSeconds ?? DEFAULT_STALE_SECONDS;
  const ttl = Math.max(freshWindow + staleWindow, freshWindow);

  try {
    await redis.set(key, value, { ex: ttl });
  } catch (error) {
    console.warn('[cache] Failed to write recommendation cache:', error);
  }
}
