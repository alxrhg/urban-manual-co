'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface SwipeableChipProps {
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
  children: React.ReactNode;
}

export function SwipeableChip({ suggestion, onAccept, onDismiss, children }: SwipeableChipProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px) to be considered a swipe
  const minSwipeDistance = 50;
  const maxSwipeDistance = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null) {
      const currentOffset = e.targetTouches[0].clientX - touchStart;
      // Limit the offset to maxSwipeDistance in either direction
      const limitedOffset = Math.max(-maxSwipeDistance, Math.min(maxSwipeDistance, currentOffset));
      setSwipeOffset(limitedOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      // Swipe right = Accept
      setIsAccepted(true);
      setTimeout(() => {
        onAccept();
      }, 300);
    } else if (isLeftSwipe) {
      // Swipe left = Dismiss
      setIsDismissed(true);
      setTimeout(() => {
        onDismiss();
      }, 300);
    } else {
      // Reset if swipe wasn't far enough
      setSwipeOffset(0);
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Reset on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSwipeOffset(0);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const getBackgroundColor = () => {
    if (isAccepted) return 'bg-green-100 dark:bg-green-900/30';
    if (isDismissed) return 'bg-red-100 dark:bg-red-900/30';
    if (swipeOffset > minSwipeDistance) return 'bg-green-50 dark:bg-green-900/20';
    if (swipeOffset < -minSwipeDistance) return 'bg-red-50 dark:bg-red-900/20';
    return 'bg-gray-50 dark:bg-dark-blue-900';
  };

  if (isAccepted || isDismissed) {
    return null; // Remove from DOM after animation
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background icons that appear during swipe */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <div
          className={`transition-opacity duration-200 ${
            swipeOffset > minSwipeDistance ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div
          className={`transition-opacity duration-200 ${
            swipeOffset < -minSwipeDistance ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <X className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* The actual chip */}
      <div
        ref={chipRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: touchStart === null ? 'transform 0.3s ease-out, background-color 0.2s' : 'background-color 0.2s',
        }}
        className={`${getBackgroundColor()} relative z-10 cursor-grab active:cursor-grabbing touch-pan-y select-none`}
      >
        {children}
      </div>
    </div>
  );
}
