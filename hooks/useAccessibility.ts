/**
 * Accessibility Hooks
 *
 * React hooks for accessibility features:
 * - Reduced motion detection
 * - Screen reader announcements
 * - Focus management
 * - Keyboard navigation
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  prefersReducedMotion,
  onReducedMotionChange,
  trapFocus,
  announceToScreenReader,
  focusFirstElement,
} from '@/lib/accessibility';

/**
 * Hook to detect user's reduced motion preference
 *
 * Usage:
 * ```tsx
 * const prefersReduced = useReducedMotion();
 * const duration = prefersReduced ? 0 : 300;
 * ```
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Set initial value
    setReduced(prefersReducedMotion());

    // Subscribe to changes
    const unsubscribe = onReducedMotionChange(setReduced);
    return unsubscribe;
  }, []);

  return reduced;
}

/**
 * Hook for screen reader announcements
 *
 * Usage:
 * ```tsx
 * const { announce } = useAnnounce();
 * announce('Item added to cart');
 * announce('Error: Please try again', 'assertive');
 * ```
 */
export function useAnnounce() {
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    []
  );

  return { announce };
}

/**
 * Hook for managing focus within a container (focus trap)
 *
 * Usage:
 * ```tsx
 * const focusTrapRef = useFocusTrap(isOpen);
 * return <div ref={focusTrapRef}>...</div>;
 * ```
 */
export function useFocusTrap<T extends HTMLElement>(
  enabled: boolean
): React.RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Set up focus trap
    const cleanup = trapFocus(containerRef.current);

    return () => {
      cleanup();
      // Restore previous focus
      previousFocusRef.current?.focus();
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Hook to focus an element when a condition becomes true
 *
 * Usage:
 * ```tsx
 * const inputRef = useFocusOnMount<HTMLInputElement>(isVisible);
 * return <input ref={inputRef} />;
 * ```
 */
export function useFocusOnMount<T extends HTMLElement>(
  shouldFocus: boolean
): React.RefObject<T | null> {
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      // Small delay to ensure element is rendered
      const timer = setTimeout(() => {
        elementRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [shouldFocus]);

  return elementRef;
}

/**
 * Hook for managing focus restoration
 *
 * Usage:
 * ```tsx
 * const { saveFocus, restoreFocus } = useFocusRestore();
 * // When opening modal
 * saveFocus();
 * // When closing modal
 * restoreFocus();
 * ```
 */
export function useFocusRestore() {
  const savedFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    savedFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (savedFocusRef.current) {
      savedFocusRef.current.focus();
      savedFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Hook for keyboard navigation (arrow keys)
 *
 * Usage:
 * ```tsx
 * const { focusedIndex, setFocusedIndex, handleKeyDown } = useArrowNavigation({
 *   itemCount: items.length,
 *   orientation: 'vertical',
 * });
 * ```
 */
export function useArrowNavigation(options: {
  itemCount: number;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onSelect?: (index: number) => void;
}) {
  const { itemCount, orientation = 'vertical', loop = true, onSelect } = options;
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = focusedIndex;
      const isVertical = orientation === 'vertical' || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';

      switch (e.key) {
        case 'ArrowDown':
          if (isVertical) {
            e.preventDefault();
            newIndex = focusedIndex + 1;
            if (newIndex >= itemCount) {
              newIndex = loop ? 0 : itemCount - 1;
            }
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            e.preventDefault();
            newIndex = focusedIndex - 1;
            if (newIndex < 0) {
              newIndex = loop ? itemCount - 1 : 0;
            }
          }
          break;
        case 'ArrowRight':
          if (isHorizontal) {
            e.preventDefault();
            newIndex = focusedIndex + 1;
            if (newIndex >= itemCount) {
              newIndex = loop ? 0 : itemCount - 1;
            }
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            e.preventDefault();
            newIndex = focusedIndex - 1;
            if (newIndex < 0) {
              newIndex = loop ? itemCount - 1 : 0;
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = itemCount - 1;
          break;
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            e.preventDefault();
            onSelect?.(focusedIndex);
          }
          break;
      }

      if (newIndex !== focusedIndex) {
        setFocusedIndex(newIndex);
      }
    },
    [focusedIndex, itemCount, orientation, loop, onSelect]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

/**
 * Hook for Escape key handling
 *
 * Usage:
 * ```tsx
 * useEscapeKey(onClose, isOpen);
 * ```
 */
export function useEscapeKey(callback: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback, enabled]);
}

/**
 * Hook to manage live region for dynamic content
 *
 * Usage:
 * ```tsx
 * const { liveRegionProps, announce } = useLiveRegion();
 * return (
 *   <>
 *     <div {...liveRegionProps} />
 *     <button onClick={() => announce('Action completed!')}>Do something</button>
 *   </>
 * );
 * ```
 */
export function useLiveRegion(priority: 'polite' | 'assertive' = 'polite') {
  const [message, setMessage] = useState('');

  const announce = useCallback((text: string) => {
    // Clear first to ensure announcement even for same message
    setMessage('');
    setTimeout(() => setMessage(text), 50);
    // Clear after announcement
    setTimeout(() => setMessage(''), 1000);
  }, []);

  const liveRegionProps = {
    role: 'status' as const,
    'aria-live': priority,
    'aria-atomic': true,
    className: 'sr-only',
    children: message,
  };

  return {
    liveRegionProps,
    announce,
  };
}

/**
 * Hook for accessible form validation announcements
 */
export function useFormValidationAnnounce() {
  const { announce } = useAnnounce();

  const announceError = useCallback(
    (fieldName: string, error: string) => {
      announce(`${fieldName}: ${error}`, 'assertive');
    },
    [announce]
  );

  const announceSuccess = useCallback(
    (message: string) => {
      announce(message, 'polite');
    },
    [announce]
  );

  const announceFieldCount = useCallback(
    (errorCount: number) => {
      if (errorCount === 0) {
        announce('Form is valid', 'polite');
      } else {
        announce(
          `Form has ${errorCount} ${errorCount === 1 ? 'error' : 'errors'}`,
          'assertive'
        );
      }
    },
    [announce]
  );

  return {
    announceError,
    announceSuccess,
    announceFieldCount,
  };
}
