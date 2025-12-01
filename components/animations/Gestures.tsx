'use client';

import { ReactNode, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION } from '@/lib/animations';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  className?: string;
  deleteThreshold?: number;
}

/**
 * SwipeToDelete - Swipe left to reveal delete action
 */
export function SwipeToDelete({
  children,
  onDelete,
  className = '',
  deleteThreshold = 100,
}: SwipeToDeleteProps) {
  const shouldReduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-deleteThreshold, -deleteThreshold / 2, 0], [1, 0.5, 0]);
  const deleteScale = useTransform(x, [-deleteThreshold, -deleteThreshold / 2, 0], [1, 0.8, 0.5]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -deleteThreshold) {
      onDelete();
    }
  };

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Delete background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end px-6 bg-red-500"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }}>
          <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative bg-white dark:bg-gray-900"
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -deleteThreshold * 1.5, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  className?: string;
  threshold?: number;
}

/**
 * PullToRefresh - Pull down to refresh content
 */
export function PullToRefresh({
  children,
  onRefresh,
  className = '',
  threshold = 80,
}: PullToRefreshProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, (currentY - startY.current) * 0.5);
      setPullDistance(Math.min(distance, threshold * 1.5));

      if (distance > 0) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        await onRefresh();
        setIsRefreshing(false);
      }

      setPullDistance(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, isRefreshing, pullDistance]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;

  return (
    <div ref={containerRef} className={cn('relative overflow-auto', className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10"
        style={{
          top: pullDistance - 40,
          opacity: shouldReduceMotion ? (isRefreshing ? 1 : 0) : progress,
        }}
      >
        <motion.div
          className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full"
          animate={
            isRefreshing
              ? { rotate: 360 }
              : shouldReduceMotion
              ? {}
              : { rotate: rotation }
          }
          transition={
            isRefreshing
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : { duration: 0 }
          }
        />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{
          transform: shouldReduceMotion
            ? 'none'
            : `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface LongPressProps {
  children: ReactNode;
  onLongPress: () => void;
  duration?: number;
  className?: string;
}

/**
 * LongPress - Long press to trigger action with visual feedback
 */
export function LongPress({
  children,
  onLongPress,
  duration = 500,
  className = '',
}: LongPressProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);

  const handlePressStart = () => {
    setIsPressed(true);
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onLongPress();
        handlePressEnd();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    setProgress(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <motion.div
      className={cn('relative cursor-pointer select-none', className)}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
    >
      {children}

      {/* Progress ring */}
      {isPressed && !shouldReduceMotion && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx="50%"
            cy="50%"
            r="48%"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${progress * 100} 100`}
            className="text-gray-900 dark:text-white opacity-30"
          />
        </svg>
      )}
    </motion.div>
  );
}

interface DraggableListItemProps {
  children: ReactNode;
  id: string;
  className?: string;
}

/**
 * DraggableListItem - Draggable list item with visual feedback
 */
export function DraggableListItem({
  children,
  id,
  className = '',
}: DraggableListItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isDragging, setIsDragging] = useState(false);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'z-10',
        className
      )}
      layout
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        backgroundColor: 'rgba(255,255,255,1)',
      }}
      transition={SPRING.snappy}
    >
      {children}
    </motion.div>
  );
}

interface PinchZoomProps {
  children: ReactNode;
  className?: string;
  minScale?: number;
  maxScale?: number;
}

/**
 * PinchZoom - Pinch to zoom content (for images)
 */
export function PinchZoom({
  children,
  className = '',
  minScale = 1,
  maxScale = 3,
}: PinchZoomProps) {
  const shouldReduceMotion = useReducedMotion();
  const scale = useMotionValue(1);
  const [currentScale, setCurrentScale] = useState(1);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.max(minScale, Math.min(maxScale, currentScale + delta));
      setCurrentScale(newScale);
      scale.set(newScale);
    }
  };

  const handleDoubleTap = () => {
    const newScale = currentScale === 1 ? 2 : 1;
    setCurrentScale(newScale);
    scale.set(newScale);
  };

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn('overflow-hidden touch-none', className)}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleTap}
    >
      <motion.div
        style={{ scale }}
        transition={SPRING.smooth}
        drag={currentScale > 1}
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        dragElastic={0.1}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default SwipeToDelete;
