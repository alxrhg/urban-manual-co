/**
 * Mobile UX Hooks
 *
 * Provides utilities for enhanced mobile user experience:
 * - Safe area detection
 * - Virtual keyboard handling
 * - Pull-to-refresh
 * - Touch feedback
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Safe area insets from the viewport
 */
interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Hook to get safe area insets for devices with notches/home indicators
 *
 * Usage:
 * ```tsx
 * const insets = useSafeAreaInsets();
 * return <div style={{ paddingBottom: insets.bottom }}>...</div>;
 * ```
 */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      setInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || '0') ||
          parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--sar') || '0') ||
          parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0') ||
          parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--sal') || '0') ||
          parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
      });
    };

    // Initial update
    updateInsets();

    // Update on resize (orientation change)
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

/**
 * Virtual keyboard state
 */
interface KeyboardState {
  isVisible: boolean;
  height: number;
}

/**
 * Hook to detect and handle virtual keyboard
 *
 * Usage:
 * ```tsx
 * const { isVisible, height } = useVirtualKeyboard();
 * return (
 *   <div style={{ paddingBottom: isVisible ? height : 0 }}>
 *     <input />
 *   </div>
 * );
 * ```
 */
export function useVirtualKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Method 1: Use Visual Viewport API (modern browsers)
    if ('visualViewport' in window && window.visualViewport) {
      const viewport = window.visualViewport;

      const handleResize = () => {
        const windowHeight = window.innerHeight;
        const viewportHeight = viewport.height;
        const keyboardHeight = windowHeight - viewportHeight;

        setState({
          isVisible: keyboardHeight > 150, // Threshold to avoid false positives
          height: Math.max(0, keyboardHeight),
        });
      };

      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);

      return () => {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      };
    }

    // Method 2: Fallback for older browsers - detect focus on input elements
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Estimate keyboard height (varies by device)
        const estimatedHeight = window.innerHeight * 0.4;
        setState({
          isVisible: true,
          height: estimatedHeight,
        });
      }
    };

    const handleBlur = () => {
      setState({
        isVisible: false,
        height: 0,
      });
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return state;
}

/**
 * Hook for scroll-into-view when keyboard appears
 *
 * Usage:
 * ```tsx
 * const inputRef = useScrollIntoViewOnFocus<HTMLInputElement>();
 * return <input ref={inputRef} />;
 * ```
 */
export function useScrollIntoViewOnFocus<T extends HTMLElement>(): React.RefObject<T | null> {
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleFocus = () => {
      // Small delay to wait for keyboard to appear
      setTimeout(() => {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    };

    element.addEventListener('focus', handleFocus);
    return () => element.removeEventListener('focus', handleFocus);
  }, []);

  return elementRef;
}

/**
 * Pull-to-refresh state and handlers
 */
interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
}

interface UsePullToRefreshOptions {
  /** Distance in pixels to trigger refresh (default: 80) */
  threshold?: number;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook for pull-to-refresh functionality
 *
 * Usage:
 * ```tsx
 * const { containerRef, isPulling, isRefreshing, pullDistance, pullIndicatorStyle } =
 *   usePullToRefresh({
 *     onRefresh: async () => {
 *       await fetchData();
 *     },
 *   });
 *
 * return (
 *   <div ref={containerRef}>
 *     <div style={pullIndicatorStyle}>
 *       {isRefreshing ? 'Refreshing...' : 'Pull to refresh'}
 *     </div>
 *     <ListContent />
 *   </div>
 * );
 * ```
 */
export function usePullToRefresh<T extends HTMLElement>(
  options: UsePullToRefreshOptions
): {
  containerRef: React.RefObject<T | null>;
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullIndicatorStyle: React.CSSProperties;
} {
  const { threshold = 80, onRefresh, enabled = true } = options;

  const containerRef = useRef<T | null>(null);
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
  });

  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state.isRefreshing) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      setState((prev) => ({ ...prev, isPulling: true }));
    },
    [enabled, state.isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!state.isPulling || state.isRefreshing) return;

      currentYRef.current = e.touches[0].clientY;
      const distance = Math.max(0, currentYRef.current - startYRef.current);

      // Apply resistance to the pull
      const resistance = 0.5;
      const resistedDistance = distance * resistance;

      setState((prev) => ({ ...prev, pullDistance: resistedDistance }));

      // Prevent default scroll when pulling
      if (distance > 0) {
        e.preventDefault();
      }
    },
    [state.isPulling, state.isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling) return;

    if (state.pullDistance >= threshold && !state.isRefreshing) {
      setState((prev) => ({ ...prev, isRefreshing: true, pullDistance: threshold }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
        });
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
      });
    }
  }, [state.isPulling, state.pullDistance, state.isRefreshing, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate pull indicator style
  const pullIndicatorStyle: React.CSSProperties = {
    transform: `translateY(${state.pullDistance - 60}px)`,
    opacity: Math.min(1, state.pullDistance / threshold),
    transition: state.isPulling ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
  };

  return {
    containerRef,
    isPulling: state.isPulling,
    isRefreshing: state.isRefreshing,
    pullDistance: state.pullDistance,
    pullIndicatorStyle,
  };
}

/**
 * Hook to detect if the device is mobile
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

/**
 * Hook for touch feedback (haptic-like visual feedback)
 */
export function useTouchFeedback<T extends HTMLElement>(): {
  ref: React.RefObject<T | null>;
  isPressed: boolean;
} {
  const ref = useRef<T | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = () => setIsPressed(true);
    const handleTouchEnd = () => setIsPressed(false);
    const handleTouchCancel = () => setIsPressed(false);

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, []);

  return { ref, isPressed };
}

/**
 * Hook to prevent scroll when a modal/drawer is open
 */
export function usePreventScroll(prevent: boolean): void {
  useEffect(() => {
    if (!prevent) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [prevent]);
}
