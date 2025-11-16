'use client';

import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance to pull before triggering refresh (in px)
  resistance?: number; // How much to reduce pull distance (0-1, lower = more resistance)
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const {
    onRefresh,
    threshold = 80,
    resistance = 0.5,
  } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = (e: Event) => {
    const touchEvent = e as TouchEvent;
    // Only start pull if at the top of the page
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    const touch = touchEvent.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      scrollTop,
    };
  };

  const handleTouchMove = (e: Event) => {
    const touchEvent = e as TouchEvent;
    if (!touchStartRef.current || isRefreshing) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Only allow pull-to-refresh when at the top
    if (scrollTop > 0) {
      touchStartRef.current = null;
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    const touch = touchEvent.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only track downward pulls
    if (deltaY > 0) {
      setIsPulling(true);
      // Apply resistance to make it feel more natural
      const distance = Math.min(deltaY * resistance, threshold * 1.5);
      setPullDistance(distance);

      // Prevent default scroll when pulling
      if (deltaY > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!touchStartRef.current || isRefreshing) return;

    const shouldRefresh = pullDistance >= threshold;

    if (shouldRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset state
    touchStartRef.current = null;
    setIsPulling(false);
    setPullDistance(0);
  };

  useEffect(() => {
    // Don't attach listeners in non-touch environments
    if (typeof window === 'undefined' || !('ontouchstart' in window)) {
      return;
    }

    const target = containerRef.current || document;

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, pullDistance]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    containerRef,
    progress: Math.min(pullDistance / threshold, 1), // 0-1
  };
}
