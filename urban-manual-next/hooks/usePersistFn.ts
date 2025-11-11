import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

type Noop<Args extends unknown[] = unknown[], Result = unknown> = (
  ...args: Args
) => Result;

/**
 * usePersistFn 可以替代 useCallback 以降低心智负担
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function usePersistFn<T extends Noop>(fn: T): T {
  const fnRef = useRef(fn);

  useIsomorphicLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const persistFn = useCallback((...args: Parameters<T>) => {
    return fnRef.current(...args);
  }, []);

  return persistFn as T;
}
