import { type TouchEvent, useCallback, useEffect, useRef } from 'react';

export interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
  velocityThreshold?: number;
  maxDuration?: number;
  enabled?: boolean;
}

export interface PullToRefreshHandlers {
  onTouchStart: (event: TouchEvent) => void;
  onTouchMove: (event: TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchCancel: () => void;
}

const DEFAULT_THRESHOLD = 90;
const DEFAULT_VELOCITY_THRESHOLD = 0.25; // px per ms
const DEFAULT_MAX_DURATION = 600; // ms

export function usePullToRefresh({
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
  maxDuration = DEFAULT_MAX_DURATION,
  enabled = true,
}: UsePullToRefreshOptions): PullToRefreshHandlers {
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const trackingRef = useRef(false);
  const refreshingRef = useRef(false);
  const beganAtTopRef = useRef(false);

  const reset = useCallback(() => {
    startYRef.current = null;
    lastYRef.current = null;
    startTimeRef.current = null;
    trackingRef.current = false;
    beganAtTopRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const trackPosition = useCallback((nextY: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      lastYRef.current = nextY;
    });
  }, []);

  const handleTouchStart = useCallback<PullToRefreshHandlers['onTouchStart']>((event) => {
    if (!enabled || typeof window === 'undefined') return;
    if (event.touches.length !== 1) return;
    beganAtTopRef.current = window.scrollY <= 0;
    if (!beganAtTopRef.current) {
      reset();
      return;
    }
    const touch = event.touches[0];
    startYRef.current = touch.clientY;
    lastYRef.current = touch.clientY;
    startTimeRef.current = performance.now();
    trackingRef.current = true;
  }, [enabled, reset]);

  const handleTouchMove = useCallback<PullToRefreshHandlers['onTouchMove']>((event) => {
    if (!enabled || !trackingRef.current || startYRef.current === null) {
      return;
    }
    const touch = event.touches[0];
    const delta = touch.clientY - startYRef.current;
    if (delta < 0) {
      reset();
      return;
    }
    trackPosition(touch.clientY);
  }, [enabled, reset, trackPosition]);

  const maybeTriggerRefresh = useCallback(() => {
    if (
      !enabled ||
      !trackingRef.current ||
      !beganAtTopRef.current ||
      startYRef.current === null ||
      lastYRef.current === null ||
      startTimeRef.current === null
    ) {
      reset();
      return;
    }

    const distance = lastYRef.current - startYRef.current;
    const duration = performance.now() - startTimeRef.current;
    const velocity = duration > 0 ? distance / duration : 0;

    const meetsDistance = distance >= threshold;
    const meetsVelocity = velocity >= velocityThreshold;
    const meetsDuration = duration <= maxDuration;

    if (meetsDistance && meetsVelocity && meetsDuration && !refreshingRef.current) {
      refreshingRef.current = true;
      Promise.resolve(onRefresh()).finally(() => {
        refreshingRef.current = false;
      });
    }

    reset();
  }, [enabled, maxDuration, onRefresh, reset, threshold, velocityThreshold]);

  const handleTouchEnd = useCallback(() => {
    if (!trackingRef.current) {
      reset();
      return;
    }
    maybeTriggerRefresh();
  }, [maybeTriggerRefresh, reset]);

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

export default usePullToRefresh;
