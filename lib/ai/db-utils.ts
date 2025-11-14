/**
 * Database Query Optimization Utilities
 * Helpers for batching and optimizing database operations
 */

import { DB_QUERY_CONFIG } from './config';
import { performanceMonitor } from './performance-monitor';

/**
 * Batch process items with database queries
 * Reduces number of round trips to the database
 */
export async function batchProcess<T, R>(
  items: T[],
  processFn: (batch: T[]) => Promise<R[]>,
  batchSize: number = DB_QUERY_CONFIG.RECOMMENDATION_BATCH_SIZE
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processFn(batch);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Execute database queries in parallel with limit
 * Prevents overwhelming the database with too many concurrent queries
 */
export async function parallelQueries<T>(
  queries: (() => Promise<T>)[],
  concurrencyLimit: number = 5
): Promise<T[]> {
  const results: T[] = [];
  
  for (let i = 0; i < queries.length; i += concurrencyLimit) {
    const batch = queries.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch.map(q => q()));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Query with performance tracking
 */
export async function trackedQuery<T>(
  operation: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return performanceMonitor.trackAsync(operation, queryFn, metadata);
}

/**
 * Deduplicate array by key
 */
export function deduplicateByKey<T>(items: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return items.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Retry a query with exponential backoff
 */
export async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Query failed after retries');
}

/**
 * Batch fetch destinations by IDs with caching
 */
const destinationCache = new Map<string, { data: unknown; timestamp: number }>();
const DESTINATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function batchFetchDestinations(
  supabase: any,
  destinationIds: string[],
  useCache: boolean = true
): Promise<unknown[]> {
  if (!destinationIds || destinationIds.length === 0) {
    return [];
  }

  const now = Date.now();
  const uncachedIds: string[] = [];
  const results: unknown[] = [];

  // Check cache first
  if (useCache) {
    for (const id of destinationIds) {
      const cached = destinationCache.get(id);
      if (cached && now - cached.timestamp < DESTINATION_CACHE_TTL) {
        results.push(cached.data);
      } else {
        uncachedIds.push(id);
      }
    }
  } else {
    uncachedIds.push(...destinationIds);
  }

  // Fetch uncached destinations
  if (uncachedIds.length > 0) {
    const { data: destinations, error } = await supabase
      .from('destinations')
      .select('*')
      .in('id', uncachedIds);

    if (!error && destinations) {
      destinations.forEach((dest: any) => {
        if (useCache) {
          destinationCache.set(dest.id, { data: dest, timestamp: now });
        }
        results.push(dest);
      });
    }
  }

  return results;
}

/**
 * Clear destination cache (call when destinations are updated)
 */
export function clearDestinationCache(destinationId?: string) {
  if (destinationId) {
    destinationCache.delete(destinationId);
  } else {
    destinationCache.clear();
  }
}
