'use client';

import { useEffect, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance to trigger swipe (in px)
  velocity?: number; // Minimum velocity to trigger swipe
}

export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeDown,
    onSwipeUp,
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    velocity = 0.3,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only track downward swipes (for closing drawer)
    if (deltaY > 0 && onSwipeDown) {
      setDragOffset(deltaY);
      
      // Prevent default scroll behavior when dragging down
      if (deltaY > 10) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Determine swipe direction
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical swipe
      if (deltaY > threshold || velocityY > velocity) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    } else {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold || velocityX > velocity) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    }

    // Reset state
    touchStartRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging,
    dragOffset,
  };
}
