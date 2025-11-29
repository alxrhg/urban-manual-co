/**
 * Memoization Utilities
 *
 * Provides utilities for memoizing expensive computations
 * and optimizing React rendering.
 */

/**
 * Simple memoization function with configurable cache size
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: {
    /** Maximum cache size */
    maxSize?: number;
    /** Cache key generator */
    keyFn?: (...args: Parameters<T>) => string;
    /** TTL in milliseconds */
    ttl?: number;
  } = {}
): T {
  const { maxSize = 100, keyFn, ttl } = options;

  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  const keys: string[] = [];

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      // Check TTL
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      // TTL expired, remove from cache
      cache.delete(key);
      const index = keys.indexOf(key);
      if (index > -1) keys.splice(index, 1);
    }

    // Compute value
    const value = fn(...args) as ReturnType<T>;

    // Add to cache
    cache.set(key, { value, timestamp: Date.now() });
    keys.push(key);

    // Enforce max size (LRU eviction)
    while (keys.length > maxSize) {
      const oldestKey = keys.shift();
      if (oldestKey) cache.delete(oldestKey);
    }

    return value;
  }) as T;
}

/**
 * Memoize async functions
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    maxSize?: number;
    keyFn?: (...args: Parameters<T>) => string;
    ttl?: number;
  } = {}
): T {
  const { maxSize = 100, keyFn, ttl } = options;

  const cache = new Map<
    string,
    { promise: ReturnType<T>; timestamp: number }
  >();
  const keys: string[] = [];

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    // Check cache
    const cached = cache.get(key);
    if (cached) {
      if (!ttl || Date.now() - cached.timestamp < ttl) {
        return cached.promise as Awaited<ReturnType<T>>;
      }
      cache.delete(key);
      const index = keys.indexOf(key);
      if (index > -1) keys.splice(index, 1);
    }

    // Create promise
    const promise = fn(...args) as ReturnType<T>;

    // Add to cache
    cache.set(key, { promise, timestamp: Date.now() });
    keys.push(key);

    // Enforce max size
    while (keys.length > maxSize) {
      const oldestKey = keys.shift();
      if (oldestKey) cache.delete(oldestKey);
    }

    return promise as Awaited<ReturnType<T>>;
  }) as T;
}

/**
 * Deep equality check for objects
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (
      !keysB.includes(key) ||
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Shallow equality check for arrays
 */
export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Create a selector that memoizes results
 */
export function createSelector<
  TArgs extends unknown[],
  TResult,
  TDeps extends readonly unknown[]
>(
  deps: (...args: TArgs) => TDeps,
  selector: (...deps: TDeps) => TResult
): (...args: TArgs) => TResult {
  let lastDeps: TDeps | undefined;
  let lastResult: TResult | undefined;

  return (...args: TArgs): TResult => {
    const currentDeps = deps(...args);

    // Check if deps changed
    if (
      lastDeps &&
      currentDeps.length === lastDeps.length &&
      currentDeps.every((dep, i) => dep === lastDeps![i])
    ) {
      return lastResult as TResult;
    }

    // Recompute
    lastDeps = currentDeps;
    lastResult = selector(...currentDeps);
    return lastResult;
  };
}

/**
 * Batch multiple updates to reduce re-renders
 */
export function createBatcher<T>(
  processor: (items: T[]) => void,
  options: {
    /** Delay in ms before processing */
    delay?: number;
    /** Maximum batch size */
    maxSize?: number;
  } = {}
) {
  const { delay = 16, maxSize = 100 } = options;

  let batch: T[] = [];
  let timeout: NodeJS.Timeout | null = null;

  const flush = () => {
    if (batch.length === 0) return;
    const items = batch;
    batch = [];
    processor(items);
  };

  return {
    add: (item: T) => {
      batch.push(item);

      // Flush if max size reached
      if (batch.length >= maxSize) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        flush();
        return;
      }

      // Schedule flush
      if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          flush();
        }, delay);
      }
    },
    flush,
    clear: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      batch = [];
    },
    size: () => batch.length,
  };
}

/**
 * Create a stable callback reference
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T
): T {
  // Note: This is a conceptual helper. In actual React code, use useCallback with a ref.
  // This is provided as a utility pattern reference.
  return callback;
}

/**
 * Debounced value that only updates after delay
 */
export function createDebouncedValue<T>(
  getValue: () => T,
  delay: number
): {
  get: () => T;
  invalidate: () => void;
} {
  let cachedValue: T | undefined;
  let timeout: NodeJS.Timeout | null = null;
  let isDirty = true;

  return {
    get: () => {
      if (isDirty) {
        cachedValue = getValue();
        isDirty = false;
      }
      return cachedValue as T;
    },
    invalidate: () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        isDirty = true;
        timeout = null;
      }, delay);
    },
  };
}
