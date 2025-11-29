/**
 * Optimistic Update Hook
 *
 * Provides immediate UI feedback while async operations complete.
 * Automatically rolls back on error.
 */

'use client';

import { useCallback, useState, useRef } from 'react';

interface OptimisticState<T> {
  /** Current optimistic value */
  value: T;
  /** Whether an operation is in progress */
  isPending: boolean;
  /** Error from last operation (cleared on next operation) */
  error: Error | null;
  /** Whether value was rolled back */
  wasRolledBack: boolean;
}

interface UseOptimisticOptions<T> {
  /** Initial value */
  initialValue: T;
  /** Optional callback when rollback occurs */
  onRollback?: (error: Error, previousValue: T) => void;
  /** Optional success callback */
  onSuccess?: (newValue: T) => void;
}

/**
 * Hook for optimistic updates with automatic rollback
 *
 * Usage:
 * ```tsx
 * const { value, isPending, error, update } = useOptimistic({
 *   initialValue: false,
 *   onRollback: (error) => showToast(error.message, 'error'),
 * });
 *
 * const handleToggle = async () => {
 *   await update(
 *     !value, // Optimistic value
 *     async (newValue) => {
 *       // API call
 *       await api.toggleSaved(id, newValue);
 *     }
 *   );
 * };
 * ```
 */
export function useOptimistic<T>(options: UseOptimisticOptions<T>) {
  const { initialValue, onRollback, onSuccess } = options;

  const [state, setState] = useState<OptimisticState<T>>({
    value: initialValue,
    isPending: false,
    error: null,
    wasRolledBack: false,
  });

  // Track if component is still mounted
  const mountedRef = useRef(true);

  // Track the confirmed server value
  const confirmedValueRef = useRef<T>(initialValue);

  /**
   * Perform an optimistic update
   */
  const update = useCallback(
    async (
      optimisticValue: T,
      asyncOperation: (value: T) => Promise<void>
    ): Promise<boolean> => {
      const previousValue = confirmedValueRef.current;

      // Immediately update UI
      setState({
        value: optimisticValue,
        isPending: true,
        error: null,
        wasRolledBack: false,
      });

      try {
        // Perform the async operation
        await asyncOperation(optimisticValue);

        // Success - confirm the value
        if (mountedRef.current) {
          confirmedValueRef.current = optimisticValue;
          setState({
            value: optimisticValue,
            isPending: false,
            error: null,
            wasRolledBack: false,
          });
          onSuccess?.(optimisticValue);
        }
        return true;
      } catch (err) {
        // Error - rollback to previous value
        const error = err instanceof Error ? err : new Error(String(err));

        if (mountedRef.current) {
          setState({
            value: previousValue,
            isPending: false,
            error,
            wasRolledBack: true,
          });
          onRollback?.(error, previousValue);
        }
        return false;
      }
    },
    [onRollback, onSuccess]
  );

  /**
   * Sync with external value (e.g., from server refresh)
   */
  const sync = useCallback((serverValue: T) => {
    confirmedValueRef.current = serverValue;
    setState((prev) => ({
      ...prev,
      value: serverValue,
      wasRolledBack: false,
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
      wasRolledBack: false,
    }));
  }, []);

  return {
    ...state,
    update,
    sync,
    clearError,
  };
}

/**
 * Hook for optimistic toggle (boolean) with simpler API
 */
export function useOptimisticToggle(options: {
  initialValue: boolean;
  onToggle: (newValue: boolean) => Promise<void>;
  onError?: (error: Error) => void;
}) {
  const { initialValue, onToggle, onError } = options;

  const { value, isPending, error, update } = useOptimistic({
    initialValue,
    onRollback: (err) => onError?.(err),
  });

  const toggle = useCallback(async () => {
    await update(!value, async (newValue) => {
      await onToggle(newValue);
    });
  }, [value, update, onToggle]);

  return {
    value,
    isPending,
    error,
    toggle,
  };
}

/**
 * Hook for optimistic list operations
 */
export function useOptimisticList<T extends { id: string | number }>(options: {
  initialItems: T[];
  onAdd?: (item: T) => Promise<T>;
  onRemove?: (id: T['id']) => Promise<void>;
  onUpdate?: (item: T) => Promise<T>;
  onError?: (error: Error, operation: 'add' | 'remove' | 'update') => void;
}) {
  const { initialItems, onAdd, onRemove, onUpdate, onError } = options;

  const [items, setItems] = useState<T[]>(initialItems);
  const [pendingIds, setPendingIds] = useState<Set<T['id']>>(new Set());
  const confirmedItemsRef = useRef<T[]>(initialItems);

  const addItem = useCallback(
    async (item: T) => {
      if (!onAdd) return;

      // Optimistically add
      setItems((prev) => [...prev, item]);
      setPendingIds((prev) => new Set(prev).add(item.id));

      try {
        const confirmedItem = await onAdd(item);
        confirmedItemsRef.current = [...confirmedItemsRef.current, confirmedItem];
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? confirmedItem : i))
        );
      } catch (err) {
        // Rollback
        setItems(confirmedItemsRef.current);
        onError?.(err instanceof Error ? err : new Error(String(err)), 'add');
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [onAdd, onError]
  );

  const removeItem = useCallback(
    async (id: T['id']) => {
      if (!onRemove) return;

      // Optimistically remove
      setItems((prev) => prev.filter((i) => i.id !== id));
      setPendingIds((prev) => new Set(prev).add(id));

      try {
        await onRemove(id);
        confirmedItemsRef.current = confirmedItemsRef.current.filter(
          (i) => i.id !== id
        );
      } catch (err) {
        // Rollback
        setItems(confirmedItemsRef.current);
        onError?.(err instanceof Error ? err : new Error(String(err)), 'remove');
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [onRemove, onError]
  );

  const updateItem = useCallback(
    async (item: T) => {
      if (!onUpdate) return;

      // Optimistically update
      setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      setPendingIds((prev) => new Set(prev).add(item.id));

      try {
        const confirmedItem = await onUpdate(item);
        confirmedItemsRef.current = confirmedItemsRef.current.map((i) =>
          i.id === item.id ? confirmedItem : i
        );
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? confirmedItem : i))
        );
      } catch (err) {
        // Rollback
        setItems(confirmedItemsRef.current);
        onError?.(err instanceof Error ? err : new Error(String(err)), 'update');
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    [onUpdate, onError]
  );

  const sync = useCallback((serverItems: T[]) => {
    confirmedItemsRef.current = serverItems;
    setItems(serverItems);
  }, []);

  return {
    items,
    pendingIds,
    isPending: pendingIds.size > 0,
    addItem,
    removeItem,
    updateItem,
    sync,
  };
}
