import { type TouchEvent, useCallback, useEffect, useRef } from 'react';

export interface UseSwipeGestureOptions {
  onSwipeDown?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  maxDuration?: number;
  enabled?: boolean;
}

export interface SwipeGestureHandlers {
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

const DEFAULT_THRESHOLD = 80;
const DEFAULT_VELOCITY_THRESHOLD = 0.35; // px per ms
const DEFAULT_MAX_DURATION = 450; // ms

export function useSwipeGesture({
  onSwipeDown,
  threshold = DEFAULT_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  maxDuration = DEFAULT_MAX_DURATION,
  enabled = true,
}: UseSwipeGestureOptions = {}): SwipeGestureHandlers {
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);

  const reset = useCallback(() => {
    startYRef.current = null;
    lastYRef.current = null;
    startTimeRef.current = null;
    isTrackingRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const scheduleUpdate = useCallback((nextY: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      lastYRef.current = nextY;
    });
  }, []);

  const handleTouchStart = useCallback<SwipeGestureHandlers['onTouchStart']>((event) => {
    if (!enabled) return;
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    startTimeRef.current = performance.now();
    isTrackingRef.current = true;
  }, [enabled]);

  const handleTouchMove = useCallback<SwipeGestureHandlers['onTouchMove']>((event) => {
    if (!enabled || !isTrackingRef.current || startYRef.current === null) {
      return;
    }
    const touch = event.touches[0];
    const delta = touch.clientY - startYRef.current;
    if (delta < 0) {
      // If the user swipes upward, stop tracking this gesture.
      reset();
      return;
    }
    scheduleUpdate(touch.clientY);
  }, [enabled, reset, scheduleUpdate]);

  const maybeTriggerSwipe = useCallback(() => {
    if (!enabled || startYRef.current === null || lastYRef.current === null || startTimeRef.current === null) {
      reset();
      return;
    }

    const distance = lastYRef.current - startYRef.current;
    const duration = performance.now() - startTimeRef.current;
    const velocity = duration > 0 ? distance / duration : 0;

    const meetsDistance = distance >= threshold;
    const meetsVelocity = velocity >= velocityThreshold;
    const meetsDuration = duration <= maxDuration;

    if (meetsDistance && meetsVelocity && meetsDuration) {
      onSwipeDown?.();
    }

    reset();
  }, [enabled, maxDuration, onSwipeDown, reset, threshold, velocityThreshold]);

  const handleTouchEnd = useCallback(() => {
    if (!isTrackingRef.current) {
      reset();
      return;
    }
    maybeTriggerSwipe();
  }, [maybeTriggerSwipe, reset]);

  useEffect(() => () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: reset,
  };
}

export default useSwipeGesture;
