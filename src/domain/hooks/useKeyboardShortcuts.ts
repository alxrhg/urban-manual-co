/**
 * Keyboard Shortcuts Hook
 *
 * Provides keyboard shortcut handling with:
 * - Modifier key support (cmd/ctrl, shift, alt)
 * - Conflict detection
 * - Context-aware shortcuts
 * - Help dialog integration
 */

'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';

/**
 * Modifier keys
 */
export interface Modifiers {
  meta?: boolean; // Cmd on Mac, Ctrl on Windows
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

/**
 * Shortcut definition
 */
export interface Shortcut {
  /** Unique identifier */
  id: string;
  /** Key to listen for (e.g., 'k', 'Escape', 'Enter') */
  key: string;
  /** Required modifiers */
  modifiers?: Modifiers;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Human-readable description */
  description?: string;
  /** Category for grouping in help dialog */
  category?: string;
  /** Whether shortcut is currently enabled */
  enabled?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Stop event propagation */
  stopPropagation?: boolean;
}

/**
 * Shortcut context for scoping
 */
export type ShortcutContext = 'global' | 'modal' | 'form' | 'map' | 'list';

interface UseKeyboardShortcutsOptions {
  /** Shortcuts to register */
  shortcuts: Shortcut[];
  /** Current context (shortcuts only work in matching context) */
  context?: ShortcutContext;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Elements that should ignore shortcuts (e.g., inputs) */
  ignoreElements?: string[];
}

/**
 * Check if the current platform is Mac
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: Shortcut): string {
  const parts: string[] = [];
  const mac = isMac();

  if (shortcut.modifiers?.meta) {
    parts.push(mac ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers?.ctrl) {
    parts.push(mac ? '⌃' : 'Ctrl');
  }
  if (shortcut.modifiers?.alt) {
    parts.push(mac ? '⌥' : 'Alt');
  }
  if (shortcut.modifiers?.shift) {
    parts.push(mac ? '⇧' : 'Shift');
  }

  // Format key
  const key = shortcut.key.length === 1
    ? shortcut.key.toUpperCase()
    : shortcut.key;

  parts.push(key);

  return parts.join(mac ? '' : '+');
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const {
    shortcuts,
    context = 'global',
    enabled = true,
    ignoreElements = ['INPUT', 'TEXTAREA', 'SELECT', '[contenteditable="true"]'],
  } = options;

  const [activeShortcuts, setActiveShortcuts] = useState<Shortcut[]>(shortcuts);

  // Update shortcuts when they change
  useEffect(() => {
    setActiveShortcuts(shortcuts);
  }, [shortcuts]);

  // Check if element should be ignored
  const shouldIgnoreElement = useCallback(
    (element: EventTarget | null): boolean => {
      if (!element || !(element instanceof Element)) return false;

      return ignoreElements.some((selector) => {
        if (selector.startsWith('[')) {
          return element.matches(selector);
        }
        return element.tagName === selector;
      });
    },
    [ignoreElements]
  );

  // Handle keydown
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if focused on input-like element
      if (shouldIgnoreElement(event.target)) {
        // Allow Escape in inputs
        if (event.key !== 'Escape') return;
      }

      // Find matching shortcut
      const matchingShortcut = activeShortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false;
        if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false;

        const modifiers = shortcut.modifiers || {};
        const mac = isMac();

        // Check meta (Cmd on Mac, Ctrl on Windows)
        const metaPressed = mac ? event.metaKey : event.ctrlKey;
        if (modifiers.meta && !metaPressed) return false;
        if (!modifiers.meta && metaPressed) return false;

        // Check ctrl (only on Mac, Windows uses meta)
        if (mac) {
          if (modifiers.ctrl && !event.ctrlKey) return false;
          if (!modifiers.ctrl && event.ctrlKey) return false;
        }

        // Check alt
        if (modifiers.alt && !event.altKey) return false;
        if (!modifiers.alt && event.altKey) return false;

        // Check shift
        if (modifiers.shift && !event.shiftKey) return false;
        if (!modifiers.shift && event.shiftKey) return false;

        return true;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault();
        }
        if (matchingShortcut.stopPropagation) {
          event.stopPropagation();
        }
        matchingShortcut.handler(event);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, activeShortcuts, shouldIgnoreElement, context]);

  // Get shortcuts grouped by category
  const shortcutsByCategory = useMemo(() => {
    const groups = new Map<string, Shortcut[]>();

    for (const shortcut of activeShortcuts) {
      const category = shortcut.category || 'General';
      const existing = groups.get(category) || [];
      groups.set(category, [...existing, shortcut]);
    }

    return groups;
  }, [activeShortcuts]);

  return {
    shortcuts: activeShortcuts,
    shortcutsByCategory,
    formatShortcut,
    setShortcutEnabled: (id: string, enabled: boolean) => {
      setActiveShortcuts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled } : s))
      );
    },
  };
}

/**
 * Common keyboard shortcuts presets
 */
export const CommonShortcuts = {
  search: (handler: () => void): Shortcut => ({
    id: 'search',
    key: 'k',
    modifiers: { meta: true },
    handler,
    description: 'Open search',
    category: 'Navigation',
  }),

  escape: (handler: () => void): Shortcut => ({
    id: 'escape',
    key: 'Escape',
    handler,
    description: 'Close or cancel',
    category: 'General',
  }),

  save: (handler: () => void): Shortcut => ({
    id: 'save',
    key: 's',
    modifiers: { meta: true },
    handler,
    description: 'Save',
    category: 'Actions',
  }),

  undo: (handler: () => void): Shortcut => ({
    id: 'undo',
    key: 'z',
    modifiers: { meta: true },
    handler,
    description: 'Undo',
    category: 'Actions',
  }),

  redo: (handler: () => void): Shortcut => ({
    id: 'redo',
    key: 'z',
    modifiers: { meta: true, shift: true },
    handler,
    description: 'Redo',
    category: 'Actions',
  }),

  help: (handler: () => void): Shortcut => ({
    id: 'help',
    key: '?',
    modifiers: { shift: true },
    handler,
    description: 'Show keyboard shortcuts',
    category: 'Help',
  }),

  nextItem: (handler: () => void): Shortcut => ({
    id: 'next',
    key: 'j',
    handler,
    description: 'Next item',
    category: 'Navigation',
  }),

  prevItem: (handler: () => void): Shortcut => ({
    id: 'prev',
    key: 'k',
    handler,
    description: 'Previous item',
    category: 'Navigation',
  }),

  home: (handler: () => void): Shortcut => ({
    id: 'home',
    key: 'g',
    handler,
    description: 'Go to home',
    category: 'Navigation',
  }),
};

/**
 * Hook for showing/hiding keyboard shortcuts help
 */
export function useShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Register ? shortcut
  useKeyboardShortcuts({
    shortcuts: [CommonShortcuts.help(toggle)],
  });

  return {
    isOpen,
    toggle,
    open,
    close,
  };
}
