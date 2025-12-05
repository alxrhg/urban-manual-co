/**
 * Skeleton loading component for interactive maps
 * Maintains exact layout dimensions to prevent CLS (Cumulative Layout Shift)
 * Shows a subtle shimmer animation while the map loads
 */

import { MapPin } from 'lucide-react';

interface MapSkeletonProps {
  /** Additional className for container */
  className?: string;
  /** Show placeholder markers for visual hint */
  showMarkers?: boolean;
  /** Custom height class - defaults to full container */
  height?: string;
}

/**
 * Full-container map skeleton with shimmer effect
 * Designed to fill absolute positioned containers
 */
export function MapSkeleton({
  className = '',
  showMarkers = true,
  height = 'h-full'
}: MapSkeletonProps) {
  return (
    <div
      className={`absolute inset-0 w-full ${height} bg-gray-100 dark:bg-gray-900 overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
      aria-label="Loading map"
      role="status"
    >
      {/* Base gradient simulating map terrain */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

      {/* Grid pattern to simulate map tiles */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Placeholder markers */}
      {showMarkers && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Center marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse" />
            </div>

            {/* Scattered placeholder markers */}
            <div className="absolute -top-16 -left-24">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 opacity-60 animate-pulse" style={{ animationDelay: '0.3s' }} />
            </div>
            <div className="absolute -top-8 left-20">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 opacity-60 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="absolute top-12 -left-16">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 opacity-60 animate-pulse" style={{ animationDelay: '0.7s' }} />
            </div>
            <div className="absolute top-8 left-28">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 opacity-60 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <div className="absolute -top-20 left-8">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700 opacity-60 animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-sm">
        <MapPin className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    </div>
  );
}

/**
 * Compact map skeleton for inline/embedded maps
 * Use for smaller map containers in cards or drawers
 */
export function CompactMapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full h-48 md:h-64 bg-gray-100 dark:bg-gray-900 rounded-2xl overflow-hidden ${className}`}
      aria-label="Loading map"
      role="status"
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Shimmer */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      {/* Center marker placeholder */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse" />
      </div>

      {/* Zoom controls placeholder */}
      <div className="absolute top-3 right-3 flex flex-col gap-0.5">
        <div className="w-7 h-7 bg-white/60 dark:bg-gray-800/60 rounded-sm" />
        <div className="w-7 h-7 bg-white/60 dark:bg-gray-800/60 rounded-sm" />
      </div>
    </div>
  );
}
