import { useCallback, useRef } from "react";

type Noop<Args extends unknown[] = unknown[], Result = unknown> = (
  ...args: Args
) => Result;

/**
 * usePersistFn 可以替代 useCallback 以降低心智负担
 */
export function usePersistFn<T extends Noop>(fn: T): T {
  const fnRef = useRef(fn);

  fnRef.current = fn;

  const persistFn = useCallback((...args: Parameters<T>) => {
    return fnRef.current(...args);
  }, []);

  return persistFn as T;
}
