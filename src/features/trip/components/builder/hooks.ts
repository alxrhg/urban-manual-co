'use client';

import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing expanded days state
 */
export function useExpandedDays(initialDays: number[] = [1]) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(initialDays)
  );

  const toggle = useCallback((day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }, []);

  const expand = useCallback((day: number) => {
    setExpandedDays((prev) => new Set([...prev, day]));
  }, []);

  const collapse = useCallback((day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      next.delete(day);
      return next;
    });
  }, []);

  const expandAll = useCallback((days: number[]) => {
    setExpandedDays(new Set(days));
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedDays(new Set());
  }, []);

  const isExpanded = useCallback(
    (day: number) => expandedDays.has(day),
    [expandedDays]
  );

  return {
    expandedDays,
    toggle,
    expand,
    collapse,
    expandAll,
    collapseAll,
    isExpanded,
  };
}

/**
 * Hook for managing drag and drop state
 */
export function useDragDrop() {
  const [dragState, setDragState] = useState<{
    fromIndex: number | null;
    overIndex: number | null;
  }>({ fromIndex: null, overIndex: null });

  const startDrag = useCallback((index: number) => {
    setDragState({ fromIndex: index, overIndex: null });
  }, []);

  const updateDragOver = useCallback((index: number) => {
    setDragState((prev) => ({ ...prev, overIndex: index }));
  }, []);

  const endDrag = useCallback(
    (onReorder: (from: number, to: number) => void) => {
      const { fromIndex, overIndex } = dragState;
      if (fromIndex !== null && overIndex !== null && fromIndex !== overIndex) {
        onReorder(fromIndex, overIndex);
      }
      setDragState({ fromIndex: null, overIndex: null });
    },
    [dragState]
  );

  const cancelDrag = useCallback(() => {
    setDragState({ fromIndex: null, overIndex: null });
  }, []);

  return {
    fromIndex: dragState.fromIndex,
    overIndex: dragState.overIndex,
    isDragging: dragState.fromIndex !== null,
    startDrag,
    updateDragOver,
    endDrag,
    cancelDrag,
  };
}

/**
 * Hook for inline editing state
 */
export function useInlineEdit<T>(initialValue: T) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);

  const startEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setValue(initialValue);
    setIsEditing(false);
  }, [initialValue]);

  const confirmEdit = useCallback(
    (onSave: (value: T) => void) => {
      onSave(value);
      setIsEditing(false);
    },
    [value]
  );

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
  }, []);

  return {
    isEditing,
    value,
    startEdit,
    cancelEdit,
    confirmEdit,
    updateValue,
  };
}

/**
 * Hook for dropdown/menu state
 */
export function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, toggle, open, close };
}

/**
 * Hook for computing trip statistics
 */
export function useTripStats(days: { items: { duration: number }[]; totalTime: number; totalTravel: number }[]) {
  return useMemo(() => {
    const totalItems = days.reduce((sum, day) => sum + day.items.length, 0);
    const totalDays = days.length;
    const totalTime = days.reduce((sum, day) => sum + day.totalTime, 0);
    const totalTravel = days.reduce((sum, day) => sum + day.totalTravel, 0);
    const avgItemsPerDay = totalDays > 0 ? Math.round(totalItems / totalDays) : 0;

    return {
      totalItems,
      totalDays,
      totalTime,
      totalTravel,
      avgItemsPerDay,
    };
  }, [days]);
}
