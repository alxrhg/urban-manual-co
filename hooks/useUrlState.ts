/**
 * URL State Synchronization Hook
 *
 * Syncs component state with URL search params for:
 * - Shareable links
 * - Back/forward browser navigation
 * - Page refresh persistence
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type StateValue = string | number | boolean | string[] | null;

interface UseUrlStateOptions<T extends Record<string, StateValue>> {
  /** Default values when URL params are missing */
  defaults: T;
  /** Whether to replace or push to history */
  replace?: boolean;
  /** Debounce delay in ms (default: 100) */
  debounce?: number;
}

/**
 * Serialize a value for URL params
 */
function serialize(value: StateValue): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.join(',');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/**
 * Deserialize a URL param value
 */
function deserialize<T extends StateValue>(
  value: string | null,
  defaultValue: T
): T {
  if (value === null) return defaultValue;

  // Array type
  if (Array.isArray(defaultValue)) {
    return (value ? value.split(',').filter(Boolean) : []) as T;
  }

  // Boolean type
  if (typeof defaultValue === 'boolean') {
    return (value === 'true') as T;
  }

  // Number type
  if (typeof defaultValue === 'number') {
    const num = Number(value);
    return (isNaN(num) ? defaultValue : num) as T;
  }

  // String type
  return value as T;
}

/**
 * Hook to sync state with URL search params
 *
 * Usage:
 * ```tsx
 * const { state, setState, setParam, resetParams } = useUrlState({
 *   defaults: {
 *     city: 'all',
 *     category: 'all',
 *     sort: 'popular',
 *     view: 'grid',
 *   }
 * });
 *
 * // Update single param
 * setParam('city', 'london');
 *
 * // Update multiple params
 * setState({ city: 'paris', category: 'restaurant' });
 * ```
 */
export function useUrlState<T extends Record<string, StateValue>>(
  options: UseUrlStateOptions<T>
) {
  const { defaults, replace = true, debounce = 100 } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current URL state
  const state = useMemo(() => {
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const urlValue = searchParams?.get(key) ?? null;
      (result as Record<string, StateValue>)[key] = deserialize(
        urlValue,
        defaults[key]
      );
    }
    return result;
  }, [searchParams, defaults]);

  // Debounced URL update
  const [pendingUpdate, setPendingUpdate] = useState<Partial<T> | null>(null);

  useEffect(() => {
    if (!pendingUpdate) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams?.toString() || '');

      // Update or remove params
      for (const [key, value] of Object.entries(pendingUpdate)) {
        const serialized = serialize(value);
        const defaultSerialized = serialize(defaults[key]);

        if (serialized === null || serialized === defaultSerialized) {
          params.delete(key);
        } else {
          params.set(key, serialized);
        }
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (replace) {
        router.replace(newUrl, { scroll: false });
      } else {
        router.push(newUrl, { scroll: false });
      }

      setPendingUpdate(null);
    }, debounce);

    return () => clearTimeout(timer);
  }, [pendingUpdate, searchParams, pathname, router, replace, debounce, defaults]);

  // Set a single param
  const setParam = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setPendingUpdate((prev) => {
        const updated = { ...prev, [key]: value } as Partial<T>;
        return updated;
      });
    },
    []
  );

  // Set multiple params
  const setState = useCallback((updates: Partial<T>) => {
    setPendingUpdate((prev) => {
      const updated = { ...prev, ...updates } as Partial<T>;
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetParams = useCallback(() => {
    const params = new URLSearchParams();
    const newUrl = pathname;
    if (replace) {
      router.replace(newUrl, { scroll: false });
    } else {
      router.push(newUrl, { scroll: false });
    }
  }, [pathname, router, replace]);

  // Get URL for sharing
  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  return {
    state,
    setParam,
    setState,
    resetParams,
    getShareableUrl,
    isDefault: useMemo(() => {
      return Object.keys(defaults).every((key) => {
        const current = serialize(state[key]);
        const defaultVal = serialize(defaults[key]);
        return current === defaultVal;
      });
    }, [state, defaults]),
  };
}

/**
 * Simple hook for a single URL param
 */
export function useUrlParam<T extends StateValue>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const { state, setParam } = useUrlState({
    defaults: { [key]: defaultValue },
  });

  return [
    state[key] as T,
    useCallback((value: T) => setParam(key, value), [key, setParam]),
  ];
}
