/**
 * Travel Intelligence Cache Service
 *
 * In-memory LRU cache for embeddings, searches, and recommendations
 * to reduce API calls and improve performance.
 */

import { TravelIntelligenceConfig } from './config';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private accessOrder: string[];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return null;
    }

    // Update access order (move to end = most recently used)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    return entry.value;
  }

  set(key: string, value: T, ttl: number): void {
    // If cache is full, remove least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });

    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton caches for different data types
class TravelIntelligenceCache {
  private embeddingCache: LRUCache<number[]>;
  private searchCache: LRUCache<any>;
  private recommendationCache: LRUCache<any>;
  private profileCache: LRUCache<any>;

  // Hit rate tracking
  private hits: Record<string, number> = {
    embedding: 0,
    search: 0,
    recommendation: 0,
    profile: 0,
  };
  private misses: Record<string, number> = {
    embedding: 0,
    search: 0,
    recommendation: 0,
    profile: 0,
  };

  constructor() {
    const config = TravelIntelligenceConfig.cache;
    const maxSize = config.maxSize;

    this.embeddingCache = new LRUCache<number[]>(maxSize);
    this.searchCache = new LRUCache<any>(maxSize);
    this.recommendationCache = new LRUCache<any>(maxSize);
    this.profileCache = new LRUCache<any>(maxSize);
  }

  // ============================================================================
  // EMBEDDINGS
  // ============================================================================

  getEmbedding(text: string): number[] | null {
    const key = this.hashText(text);
    const value = this.embeddingCache.get(key);

    if (value) {
      this.hits.embedding++;
    } else {
      this.misses.embedding++;
    }

    return value;
  }

  setEmbedding(text: string, embedding: number[]): void {
    const key = this.hashText(text);
    const ttl = TravelIntelligenceConfig.cache.ttls.embeddings;
    this.embeddingCache.set(key, embedding, ttl);
  }

  // ============================================================================
  // SEARCHES
  // ============================================================================

  getSearch(query: string, filters?: any): any | null {
    const key = this.hashSearch(query, filters);
    const value = this.searchCache.get(key);

    if (value) {
      this.hits.search++;
    } else {
      this.misses.search++;
    }

    return value;
  }

  setSearch(query: string, filters: any, results: any): void {
    const key = this.hashSearch(query, filters);
    const ttl = TravelIntelligenceConfig.cache.ttls.searches;
    this.searchCache.set(key, results, ttl);
  }

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  getRecommendations(userId: string, filters?: any): any | null {
    const key = this.hashRecommendation(userId, filters);
    const value = this.recommendationCache.get(key);

    if (value) {
      this.hits.recommendation++;
    } else {
      this.misses.recommendation++;
    }

    return value;
  }

  setRecommendations(userId: string, filters: any, recommendations: any): void {
    const key = this.hashRecommendation(userId, filters);
    const ttl = TravelIntelligenceConfig.cache.ttls.recommendations;
    this.recommendationCache.set(key, recommendations, ttl);
  }

  invalidateRecommendations(userId: string): void {
    // Clear all recommendation entries for this user
    // Note: This is a simple implementation. For production, consider using key prefixes
    this.recommendationCache.clear();
  }

  // ============================================================================
  // USER PROFILES
  // ============================================================================

  getProfile(userId: string): any | null {
    const value = this.profileCache.get(userId);

    if (value) {
      this.hits.profile++;
    } else {
      this.misses.profile++;
    }

    return value;
  }

  setProfile(userId: string, profile: any): void {
    const ttl = TravelIntelligenceConfig.cache.ttls.profiles;
    this.profileCache.set(userId, profile, ttl);
  }

  invalidateProfile(userId: string): void {
    this.profileCache.delete(userId);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private hashText(text: string): string {
    // Simple hash function for short text
    // For production, consider using a proper hash like xxhash
    return `txt_${text.substring(0, 100)}`;
  }

  private hashSearch(query: string, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `search_${query}_${filterStr}`;
  }

  private hashRecommendation(userId: string, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `rec_${userId}_${filterStr}`;
  }

  // ============================================================================
  // MONITORING
  // ============================================================================

  getStats() {
    const calculateHitRate = (type: string) => {
      const total = this.hits[type] + this.misses[type];
      return total > 0 ? (this.hits[type] / total) * 100 : 0;
    };

    return {
      embeddings: {
        size: this.embeddingCache.size(),
        hitRate: calculateHitRate('embedding').toFixed(2) + '%',
        hits: this.hits.embedding,
        misses: this.misses.embedding,
      },
      searches: {
        size: this.searchCache.size(),
        hitRate: calculateHitRate('search').toFixed(2) + '%',
        hits: this.hits.search,
        misses: this.misses.search,
      },
      recommendations: {
        size: this.recommendationCache.size(),
        hitRate: calculateHitRate('recommendation').toFixed(2) + '%',
        hits: this.hits.recommendation,
        misses: this.misses.recommendation,
      },
      profiles: {
        size: this.profileCache.size(),
        hitRate: calculateHitRate('profile').toFixed(2) + '%',
        hits: this.hits.profile,
        misses: this.misses.profile,
      },
    };
  }

  clearAll(): void {
    this.embeddingCache.clear();
    this.searchCache.clear();
    this.recommendationCache.clear();
    this.profileCache.clear();

    // Reset stats
    this.hits = { embedding: 0, search: 0, recommendation: 0, profile: 0 };
    this.misses = { embedding: 0, search: 0, recommendation: 0, profile: 0 };
  }
}

// Export singleton instance
export const travelCache = new TravelIntelligenceCache();

// Export helper functions for easy access
export function getCachedEmbedding(text: string): number[] | null {
  if (!TravelIntelligenceConfig.cache.enabled) return null;
  return travelCache.getEmbedding(text);
}

export function setCachedEmbedding(text: string, embedding: number[]): void {
  if (!TravelIntelligenceConfig.cache.enabled) return;
  travelCache.setEmbedding(text, embedding);
}

export function getCacheStats() {
  return travelCache.getStats();
}
