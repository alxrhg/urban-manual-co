/**
 * View Transitions API Hook
 *
 * Provides smooth, native-like page transitions using the View Transitions API.
 * Falls back gracefully on unsupported browsers.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ViewTransitionOptions {
  /** Custom transition name for CSS targeting */
  transitionName?: string;
  /** Callback before transition starts */
  onBefore?: () => void;
  /** Callback after transition completes */
  onAfter?: () => void;
  /** Whether to skip transition (e.g., for reduced motion preference) */
  skipTransition?: boolean;
}

interface UseViewTransitionResult {
  /** Whether a transition is currently in progress */
  isTransitioning: boolean;
  /** Whether the View Transitions API is supported */
  isSupported: boolean;
  /** Navigate with view transition */
  navigate: (href: string, options?: ViewTransitionOptions) => void;
  /** Navigate back with view transition (uses back animation) */
  navigateBack: (options?: ViewTransitionOptions) => void;
  /** Replace current route with view transition */
  replace: (href: string, options?: ViewTransitionOptions) => void;
  /** Start a view transition for any DOM update */
  startTransition: (callback: () => void | Promise<void>, options?: ViewTransitionOptions) => Promise<void>;
  /** Check if reduced motion is preferred */
  prefersReducedMotion: boolean;
}

/**
 * Check if View Transitions API is supported
 */
function isViewTransitionsSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document
  );
}

/**
 * Check if user prefers reduced motion
 */
function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook for using the View Transitions API with Next.js navigation
 *
 * @example
 * ```tsx
 * const { navigate, isTransitioning } = useViewTransition();
 *
 * // Navigate with smooth transition
 * <button onClick={() => navigate('/destination')}>
 *   Go to Destination
 * </button>
 *
 * // Show loading state during transition
 * {isTransitioning && <LoadingIndicator />}
 * ```
 */
export function useViewTransition(): UseViewTransitionResult {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef<ViewTransition | null>(null);

  const isSupported = isViewTransitionsSupported();
  const prefersReducedMotion = getPrefersReducedMotion();

  /**
   * Start a view transition for any DOM update
   */
  const startTransition = useCallback(
    async (callback: () => void | Promise<void>, options: ViewTransitionOptions = {}) => {
      const { onBefore, onAfter, skipTransition } = options;

      // Skip transition if not supported, reduced motion preferred, or explicitly skipped
      if (!isSupported || prefersReducedMotion || skipTransition) {
        onBefore?.();
        await callback();
        onAfter?.();
        return;
      }

      setIsTransitioning(true);
      onBefore?.();

      try {
        // Cancel any existing transition
        if (transitionRef.current) {
          transitionRef.current.skipTransition();
        }

        // Start the view transition
        const transition = document.startViewTransition(async () => {
          await callback();
        });

        transitionRef.current = transition;

        // Wait for transition to complete
        await transition.finished;
        onAfter?.();
      } catch (error) {
        // Transition was skipped or failed - that's okay
        console.debug('[ViewTransition] Transition skipped or failed:', error);
      } finally {
        setIsTransitioning(false);
        transitionRef.current = null;
      }
    },
    [isSupported, prefersReducedMotion]
  );

  /**
   * Navigate to a new page with view transition
   */
  const navigate = useCallback(
    (href: string, options: ViewTransitionOptions = {}) => {
      startTransition(() => {
        router.push(href);
      }, options);
    },
    [router, startTransition]
  );

  /**
   * Navigate back with view transition (uses reverse animation)
   */
  const navigateBack = useCallback(
    (options: ViewTransitionOptions = {}) => {
      // Add class for back navigation animation
      if (isSupported && !prefersReducedMotion) {
        document.documentElement.classList.add('going-back');
      }

      startTransition(
        () => {
          router.back();
        },
        {
          ...options,
          onAfter: () => {
            document.documentElement.classList.remove('going-back');
            options.onAfter?.();
          },
        }
      );
    },
    [router, startTransition, isSupported, prefersReducedMotion]
  );

  /**
   * Replace current route with view transition
   */
  const replace = useCallback(
    (href: string, options: ViewTransitionOptions = {}) => {
      startTransition(() => {
        router.replace(href);
      }, options);
    },
    [router, startTransition]
  );

  return {
    isTransitioning,
    isSupported,
    navigate,
    navigateBack,
    replace,
    startTransition,
    prefersReducedMotion,
  };
}

/**
 * Hook for applying view transition names to elements
 *
 * @example
 * ```tsx
 * const { ref, style } = useViewTransitionName('hero-image');
 *
 * <img ref={ref} style={style} src="..." />
 * ```
 */
export function useViewTransitionName(name: string) {
  const style: React.CSSProperties = {
    viewTransitionName: name,
  };

  return { style };
}

/**
 * Type definition for the View Transitions API
 */
interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

declare global {
  interface Document {
    startViewTransition(callback: () => void | Promise<void>): ViewTransition;
  }
}

export type { ViewTransitionOptions, UseViewTransitionResult };
