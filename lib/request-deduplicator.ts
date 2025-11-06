// ⚡ OPTIMIZATION #10: Request Deduplication
// Prevents duplicate API calls when users spam the search button
// Example: If 3 identical searches happen within 5 seconds, only 1 API call is made

const pending = new Map<string, Promise<any>>();

/**
 * Deduplicate identical async operations
 * If the same operation is already in flight, return that promise instead of creating a new one
 *
 * @param key - Unique identifier for the operation (e.g., "search:restaurants in paris")
 * @param fn - The async function to execute
 * @param ttl - Time in milliseconds to keep the result cached (default: 5000ms)
 * @returns Promise with the result
 *
 * @example
 * ```typescript
 * const result = await deduplicate(
 *   `search:${userId}:${query}`,
 *   async () => {
 *     return await fetch(`/api/search?q=${query}`);
 *   }
 * );
 * ```
 */
export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 5000
): Promise<T> {
  // Check if identical request is already in flight
  if (pending.has(key)) {
    console.log('✅ Deduplicating request:', key);
    return pending.get(key) as Promise<T>;
  }

  // Execute the function and cache the promise
  const promise = fn().finally(() => {
    // Remove from pending after TTL
    setTimeout(() => {
      if (pending.get(key) === promise) {
        pending.delete(key);
      }
    }, ttl);
  });

  pending.set(key, promise);
  return promise;
}

/**
 * Clear all pending operations (useful for testing)
 */
export function clearPendingOperations() {
  pending.clear();
}

/**
 * Get count of currently pending operations (useful for debugging)
 */
export function getPendingCount(): number {
  return pending.size;
}
