/**
 * Transition Hooks
 *
 * Utilities for managing React transitions and non-urgent updates.
 */

'use client';

import {
  startTransition as reactStartTransition,
  useTransition as reactUseTransition,
  useDeferredValue,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

/**
 * Re-export React's startTransition for convenience
 */
export const startTransition = reactStartTransition;

/**
 * Re-export React's useTransition for convenience
 */
export const useTransition = reactUseTransition;

/**
 * Hook for managing deferred state updates
 *
 * @example
 * ```tsx
 * const { value, deferredValue, isPending, setValue } = useDeferredState('');
 *
 * // Use value for immediate updates (input)
 * // Use deferredValue for expensive renders (list filtering)
 * ```
 */
export function useDeferredState<T>(initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const deferredValue = useDeferredValue(value);
  const isPending = value !== deferredValue;

  return {
    value,
    deferredValue,
    isPending,
    setValue,
  };
}

/**
 * Hook for managing transition state with loading indicator
 */
export function useTransitionState() {
  const [isPending, startTransition] = reactUseTransition();

  const transition = useCallback(
    (callback: () => void) => {
      startTransition(callback);
    },
    [startTransition]
  );

  return {
    isPending,
    startTransition: transition,
  };
}

/**
 * Hook for batching multiple state updates
 */
export function useBatchedUpdates() {
  const pendingUpdates = useRef<(() => void)[]>([]);
  const isFlushingRef = useRef(false);
  const [, forceUpdate] = useState({});

  const scheduleUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);

    if (!isFlushingRef.current) {
      isFlushingRef.current = true;

      // Use startTransition to batch all updates
      reactStartTransition(() => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        isFlushingRef.current = false;

        updates.forEach((fn) => fn());
        forceUpdate({});
      });
    }
  }, []);

  return scheduleUpdate;
}

/**
 * Hook for non-urgent search input with debouncing
 *
 * @example
 * ```tsx
 * const { inputValue, searchValue, isPending, onChange } = useDeferredSearch();
 *
 * return (
 *   <>
 *     <input value={inputValue} onChange={(e) => onChange(e.target.value)} />
 *     {isPending && <Spinner />}
 *     <SearchResults query={searchValue} />
 *   </>
 * );
 * ```
 */
export function useDeferredSearch(
  initialValue = '',
  options: { debounceMs?: number } = {}
) {
  const { debounceMs = 150 } = options;

  const [inputValue, setInputValue] = useState(initialValue);
  const [searchValue, setSearchValue] = useState(initialValue);
  const [isPending, startTransition] = reactUseTransition();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const onChange = useCallback(
    (value: string) => {
      // Update input immediately
      setInputValue(value);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the search update
      timeoutRef.current = setTimeout(() => {
        startTransition(() => {
          setSearchValue(value);
        });
      }, debounceMs);
    },
    [debounceMs]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    inputValue,
    searchValue,
    isPending,
    onChange,
    clear: useCallback(() => {
      setInputValue('');
      setSearchValue('');
    }, []),
  };
}

/**
 * Hook for lazy loading content with transition
 */
export function useLazyContent<T>(
  loader: () => Promise<T>,
  options: {
    immediate?: boolean;
  } = {}
) {
  const { immediate = false } = options;

  const [content, setContent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (loadedRef.current || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await loader();

      reactStartTransition(() => {
        setContent(result);
        loadedRef.current = true;
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [loader, isLoading]);

  // Load immediately if requested
  useEffect(() => {
    if (immediate && !loadedRef.current) {
      load();
    }
  }, [immediate, load]);

  return {
    content,
    isLoading,
    error,
    isLoaded: loadedRef.current,
    load,
    reset: useCallback(() => {
      setContent(null);
      setError(null);
      loadedRef.current = false;
    }, []),
  };
}

/**
 * Hook for prioritizing updates
 */
export function usePrioritizedUpdate<T>(
  initialValue: T,
  options: {
    /** Threshold in ms for high priority updates */
    highPriorityThreshold?: number;
  } = {}
) {
  const { highPriorityThreshold = 50 } = options;

  const [value, setValue] = useState(initialValue);
  const lastUpdateRef = useRef(Date.now());

  const update = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate < highPriorityThreshold) {
        // Recent update, use transition for lower priority
        reactStartTransition(() => {
          setValue(newValue);
        });
      } else {
        // No recent updates, high priority
        setValue(newValue);
      }

      lastUpdateRef.current = now;
    },
    [highPriorityThreshold]
  );

  return [value, update] as const;
}

/**
 * Hook for interruptible async operations
 */
export function useInterruptible<T>(
  operation: (signal: AbortSignal) => Promise<T>
) {
  const [result, setResult] = useState<T | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Cancel previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsPending(true);
    setError(null);

    try {
      const data = await operation(controller.signal);

      if (!controller.signal.aborted) {
        reactStartTransition(() => {
          setResult(data);
        });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsPending(false);
      }
    }
  }, [operation]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsPending(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    result,
    isPending,
    error,
    execute,
    cancel,
  };
}
