'use client';

/**
 * Animation Hooks
 * Custom React hooks for common animation patterns
 */

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useInView, useAnimation, useReducedMotion } from 'framer-motion';
import type { AnimationControls } from 'framer-motion';
import { DURATION_MS, STAGGER } from './constants';

// ============================================
// INTERSECTION OBSERVER HOOKS
// ============================================

interface UseRevealOnScrollOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  delay?: number;
}

/**
 * Hook to reveal elements when they enter the viewport
 */
export function useRevealOnScroll(options: UseRevealOnScrollOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    once = true,
    delay = 0,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {
    amount: threshold,
    margin: rootMargin,
    once,
  });
  const controls = useAnimation();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      controls.set('visible');
      return;
    }

    if (isInView) {
      const timer = setTimeout(() => {
        controls.start('visible');
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isInView, controls, delay, shouldReduceMotion]);

  return { ref, controls, isInView };
}

/**
 * Hook for staggered reveal of list items
 */
export function useStaggerReveal(
  itemCount: number,
  options: UseRevealOnScrollOptions = {}
) {
  const { delay = 0, ...restOptions } = options;
  const { ref, controls, isInView } = useRevealOnScroll({ ...restOptions, delay: 0 });

  const getItemDelay = useCallback(
    (index: number) => delay + index * STAGGER.normal * 1000,
    [delay]
  );

  return { ref, controls, isInView, getItemDelay };
}

// ============================================
// MOUNT / UNMOUNT HOOKS
// ============================================

/**
 * Hook for animating elements on mount
 */
export function useMountAnimation(delay = 0) {
  const [isMounted, setIsMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsMounted(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsMounted(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, shouldReduceMotion]);

  return isMounted;
}

/**
 * Hook for safe unmounting with exit animation
 */
export function useSafeUnmount(isVisible: boolean, duration = DURATION_MS.medium) {
  const [shouldRender, setShouldRender] = useState(isVisible);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimating(false);
    } else if (shouldRender) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimating(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, shouldRender, duration]);

  return { shouldRender, isAnimating };
}

// ============================================
// INTERACTION HOOKS
// ============================================

/**
 * Hook for hover state with animation controls
 */
export function useHoverAnimation(): [
  boolean,
  { onMouseEnter: () => void; onMouseLeave: () => void },
  AnimationControls
] {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();
  const shouldReduceMotion = useReducedMotion();

  const handlers = useMemo(
    () => ({
      onMouseEnter: () => {
        setIsHovered(true);
        if (!shouldReduceMotion) {
          controls.start('hover');
        }
      },
      onMouseLeave: () => {
        setIsHovered(false);
        if (!shouldReduceMotion) {
          controls.start('idle');
        }
      },
    }),
    [controls, shouldReduceMotion]
  );

  return [isHovered, handlers, controls];
}

/**
 * Hook for press/tap state with animation controls
 */
export function usePressAnimation(): [
  boolean,
  { onMouseDown: () => void; onMouseUp: () => void; onMouseLeave: () => void },
  AnimationControls
] {
  const [isPressed, setIsPressed] = useState(false);
  const controls = useAnimation();
  const shouldReduceMotion = useReducedMotion();

  const handlers = useMemo(
    () => ({
      onMouseDown: () => {
        setIsPressed(true);
        if (!shouldReduceMotion) {
          controls.start('tap');
        }
      },
      onMouseUp: () => {
        setIsPressed(false);
        if (!shouldReduceMotion) {
          controls.start('idle');
        }
      },
      onMouseLeave: () => {
        if (isPressed) {
          setIsPressed(false);
          if (!shouldReduceMotion) {
            controls.start('idle');
          }
        }
      },
    }),
    [controls, isPressed, shouldReduceMotion]
  );

  return [isPressed, handlers, controls];
}

// ============================================
// STAGGER HOOKS
// ============================================

interface UseStaggeredListOptions {
  staggerDelay?: number;
  initialDelay?: number;
  enabled?: boolean;
}

/**
 * Hook for staggered list animations
 */
export function useStaggeredList<T>(
  items: T[],
  options: UseStaggeredListOptions = {}
) {
  const {
    staggerDelay = STAGGER.normal * 1000,
    initialDelay = 100,
    enabled = true,
  } = options;

  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || items.length === 0) return;

    if (shouldReduceMotion) {
      setVisibleItems(new Set(items.map((_, i) => i)));
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    items.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems((prev) => new Set([...prev, index]));
      }, initialDelay + index * staggerDelay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [items, staggerDelay, initialDelay, enabled, shouldReduceMotion]);

  const isItemVisible = useCallback(
    (index: number) => visibleItems.has(index),
    [visibleItems]
  );

  return { visibleItems, isItemVisible };
}

// ============================================
// SCROLL HOOKS
// ============================================

/**
 * Hook for parallax scroll effect
 */
export function useParallax(speed = 0.5) {
  const ref = useRef<HTMLElement>(null);
  const [offset, setOffset] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const offsetY = (scrolled - rect.top) * speed;
      setOffset(offsetY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed, shouldReduceMotion]);

  return { ref, offset };
}

/**
 * Hook for scroll progress (0-1)
 */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(Math.min(1, Math.max(0, scrollProgress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

// ============================================
// GESTURE HOOKS
// ============================================

interface UseSwipeOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

/**
 * Hook for swipe gestures
 */
export function useSwipe(options: UseSwipeOptions = {}) {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX.current;
      const diffY = endY - startY.current;

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > threshold && onSwipeRight) {
          onSwipeRight();
        } else if (diffX < -threshold && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (diffY > threshold && onSwipeDown) {
          onSwipeDown();
        } else if (diffY < -threshold && onSwipeUp) {
          onSwipeUp();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return ref;
}

// ============================================
// REDUCED MOTION HOOK
// ============================================

/**
 * Hook that returns whether animations should be disabled
 */
export function useAnimationsEnabled(): boolean {
  const shouldReduceMotion = useReducedMotion();
  return !shouldReduceMotion;
}
