/**
 * Undo Functionality Hook
 *
 * Provides undo/redo capabilities for user actions.
 */

'use client';

import { useCallback, useState, useRef } from 'react';

/**
 * Undo action record
 */
interface UndoAction<T = unknown> {
  id: string;
  type: string;
  label: string;
  data: T;
  undo: () => Promise<void> | void;
  redo?: () => Promise<void> | void;
  expiresAt: number;
}

interface UseUndoOptions {
  /** Time in ms before undo expires (default: 10000) */
  undoTimeout?: number;
  /** Maximum number of undo actions to keep (default: 10) */
  maxHistory?: number;
  /** Callback when undo is performed */
  onUndo?: (action: UndoAction) => void;
  /** Callback when redo is performed */
  onRedo?: (action: UndoAction) => void;
}

/**
 * Hook for undo/redo functionality
 *
 * Usage:
 * ```tsx
 * const { canUndo, canRedo, undo, redo, pushAction } = useUndo();
 *
 * const handleDelete = async (item: Item) => {
 *   await deleteItem(item.id);
 *
 *   pushAction({
 *     type: 'delete',
 *     label: `Deleted "${item.name}"`,
 *     data: item,
 *     undo: async () => {
 *       await restoreItem(item);
 *     },
 *   });
 * };
 * ```
 */
export function useUndo(options: UseUndoOptions = {}) {
  const {
    undoTimeout = 10000,
    maxHistory = 10,
    onUndo,
    onRedo,
  } = options;

  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Clean up expired actions
  const cleanupExpired = useCallback(() => {
    const now = Date.now();
    setUndoStack((prev) => prev.filter((action) => action.expiresAt > now));
  }, []);

  // Push a new action to the undo stack
  const pushAction = useCallback(
    <T = unknown>(action: Omit<UndoAction<T>, 'id' | 'expiresAt'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const expiresAt = Date.now() + undoTimeout;

      const newAction: UndoAction<T> = {
        ...action,
        id,
        expiresAt,
      };

      setUndoStack((prev) => {
        const newStack = [newAction as UndoAction, ...prev].slice(0, maxHistory);
        return newStack;
      });

      // Clear redo stack when new action is pushed
      setRedoStack([]);

      // Set expiration timeout
      const timeout = setTimeout(() => {
        setUndoStack((prev) => prev.filter((a) => a.id !== id));
        timeoutsRef.current.delete(id);
      }, undoTimeout);

      timeoutsRef.current.set(id, timeout);

      return id;
    },
    [undoTimeout, maxHistory]
  );

  // Perform undo
  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isProcessing) return;

    const action = undoStack[0];
    if (!action || Date.now() > action.expiresAt) {
      cleanupExpired();
      return;
    }

    setIsProcessing(true);

    try {
      await action.undo();

      // Move to redo stack
      setUndoStack((prev) => prev.slice(1));
      setRedoStack((prev) => [action, ...prev].slice(0, maxHistory));

      // Clear timeout
      const timeout = timeoutsRef.current.get(action.id);
      if (timeout) {
        clearTimeout(timeout);
        timeoutsRef.current.delete(action.id);
      }

      onUndo?.(action);
    } catch (error) {
      console.error('Undo failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [undoStack, isProcessing, cleanupExpired, maxHistory, onUndo]);

  // Perform redo
  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isProcessing) return;

    const action = redoStack[0];
    if (!action.redo) return;

    setIsProcessing(true);

    try {
      await action.redo();

      // Move back to undo stack
      setRedoStack((prev) => prev.slice(1));
      setUndoStack((prev) => [action, ...prev].slice(0, maxHistory));

      onRedo?.(action);
    } catch (error) {
      console.error('Redo failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [redoStack, isProcessing, maxHistory, onRedo]);

  // Clear a specific action from the undo stack
  const clearAction = useCallback((id: string) => {
    setUndoStack((prev) => prev.filter((a) => a.id !== id));
    setRedoStack((prev) => prev.filter((a) => a.id !== id));

    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Clear all actions
  const clearAll = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);

    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
  }, []);

  // Get the most recent undoable action
  const lastAction = undoStack[0];
  const lastActionValid = lastAction && Date.now() < lastAction.expiresAt;

  return {
    canUndo: undoStack.length > 0 && lastActionValid,
    canRedo: redoStack.length > 0,
    undoStack,
    redoStack,
    lastAction: lastActionValid ? lastAction : null,
    isProcessing,
    pushAction,
    undo,
    redo,
    clearAction,
    clearAll,
  };
}

/**
 * Undo toast/snackbar component props
 */
export interface UndoToastProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
  timeRemaining?: number;
}

/**
 * Calculate time remaining for an action
 */
export function getTimeRemaining(action: UndoAction | null): number {
  if (!action) return 0;
  return Math.max(0, action.expiresAt - Date.now());
}
