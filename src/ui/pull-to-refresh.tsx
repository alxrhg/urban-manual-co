/**
 * Pull to Refresh Component
 *
 * Native-feeling pull-to-refresh for mobile web.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/useMobileUX';

interface PullToRefreshProps {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>;
  /** Children to render */
  children: React.ReactNode;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Custom refresh indicator */
  indicator?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Pull threshold in pixels (default: 80) */
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  indicator,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullIndicatorStyle,
  } = usePullToRefresh<HTMLDivElement>({
    onRefresh,
    enabled,
    threshold,
  });

  // Calculate rotation based on pull distance
  const rotation = Math.min(180, (pullDistance / threshold) * 180);
  const scale = Math.min(1, pullDistance / (threshold * 0.5));

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      style={{
        // Prevent overscroll bounce on iOS
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
        style={{
          ...pullIndicatorStyle,
          height: 60,
          top: 0,
          zIndex: 10,
        }}
      >
        {indicator || (
          <div
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-full',
              'bg-white dark:bg-gray-800 shadow-lg',
              isRefreshing && 'animate-spin'
            )}
            style={{
              transform: `scale(${scale}) rotate(${isRefreshing ? 0 : rotation}deg)`,
              transition: isPulling ? 'none' : 'transform 0.3s ease',
            }}
          >
            <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
        )}
      </div>

      {/* Content container that moves down during pull */}
      <div
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'none',
          transition: isPulling ? 'none' : 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Refresh indicator component for custom styling
 */
interface RefreshIndicatorProps {
  isRefreshing: boolean;
  pullProgress: number; // 0 to 1
  className?: string;
}

export function RefreshIndicator({
  isRefreshing,
  pullProgress,
  className,
}: RefreshIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center w-10 h-10 rounded-full',
        'bg-white dark:bg-gray-800 shadow-lg',
        className
      )}
    >
      <RefreshCw
        className={cn(
          'w-5 h-5 text-gray-600 dark:text-gray-300',
          isRefreshing && 'animate-spin'
        )}
        style={{
          transform: `rotate(${pullProgress * 180}deg)`,
        }}
      />
    </div>
  );
}
