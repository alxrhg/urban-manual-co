/**
 * Swipe Back Navigation Component
 *
 * Provides iOS-style swipe-from-edge navigation to go back.
 * Only activates on touch devices when swiping from the left edge.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Haptics } from '@/lib/haptics';

interface SwipeBackProps {
  /** Whether swipe-back is enabled (default: true) */
  enabled?: boolean;
  /** Edge width in pixels to detect swipe start (default: 20) */
  edgeWidth?: number;
  /** Minimum swipe distance to trigger navigation (default: 100) */
  threshold?: number;
  /** Velocity threshold to trigger navigation (default: 0.3) */
  velocityThreshold?: number;
  /** Children to render */
  children: React.ReactNode;
}

interface SwipeState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  startTime: number;
}

/**
 * SwipeBack component for iOS-style back navigation
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <SwipeBack>
 *   {children}
 * </SwipeBack>
 * ```
 */
export function SwipeBack({
  enabled = true,
  edgeWidth = 20,
  threshold = 100,
  velocityThreshold = 0.3,
  children,
}: SwipeBackProps) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    startTime: 0,
  });

  // Track if we can go back
  const canGoBackRef = useRef(false);

  useEffect(() => {
    // Check if there's history to go back to
    // This is a heuristic - true back detection isn't reliable in browsers
    canGoBackRef.current = typeof window !== 'undefined' && window.history.length > 1;
  }, [pathname]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !canGoBackRef.current) return;

      const touch = e.touches[0];
      const isFromEdge = touch.clientX <= edgeWidth;

      if (isFromEdge) {
        setSwipeState({
          isActive: true,
          startX: touch.clientX,
          startY: touch.clientY,
          currentX: touch.clientX,
          startTime: Date.now(),
        });
        Haptics.touch();
      }
    },
    [enabled, edgeWidth]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!swipeState.isActive) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeState.startX;
      const deltaY = Math.abs(touch.clientY - swipeState.startY);

      // If vertical movement is greater, cancel the swipe (user is scrolling)
      if (deltaY > Math.abs(deltaX) && deltaX < 50) {
        setSwipeState((prev) => ({ ...prev, isActive: false }));
        return;
      }

      // Only track rightward swipes
      if (deltaX > 0) {
        setSwipeState((prev) => ({ ...prev, currentX: touch.clientX }));

        // Prevent default scrolling when swiping back
        if (deltaX > 10) {
          e.preventDefault();
        }
      }
    },
    [swipeState.isActive, swipeState.startX, swipeState.startY]
  );

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isActive) return;

    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaTime = Date.now() - swipeState.startTime;
    const velocity = deltaX / deltaTime;

    // Check if swipe meets threshold or velocity requirement
    const meetsThreshold = deltaX >= threshold;
    const meetsVelocity = velocity >= velocityThreshold && deltaX > 50;

    if (meetsThreshold || meetsVelocity) {
      Haptics.swipe();
      router.back();
    }

    // Reset state
    setSwipeState({
      isActive: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      startTime: 0,
    });
  }, [swipeState, threshold, velocityThreshold, router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Calculate swipe progress
  const progress = swipeState.isActive
    ? Math.min(1, (swipeState.currentX - swipeState.startX) / threshold)
    : 0;

  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Swipe indicator overlay */}
      {swipeState.isActive && progress > 0 && (
        <div
          className="fixed inset-y-0 left-0 z-50 pointer-events-none"
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            background: `linear-gradient(to right, rgba(0, 0, 0, ${0.1 * progress}), transparent)`,
            transition: 'none',
          }}
        >
          {/* Back arrow indicator */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm"
            style={{
              opacity: progress,
              transform: `translateY(-50%) scale(${0.5 + progress * 0.5})`,
            }}
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Page content with transform during swipe */}
      <div
        style={{
          transform: swipeState.isActive && progress > 0
            ? `translateX(${progress * 30}px)`
            : 'none',
          transition: swipeState.isActive ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default SwipeBack;
