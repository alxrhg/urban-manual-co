'use client';

import { memo, useMemo } from 'react';
import { Plus, Sparkles, Check, Calendar } from 'lucide-react';
import { Destination } from '@/types/destination';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { TripFitAnalysis } from './types';

interface TripContextBadgeProps {
  destination: Destination;
  /** Compact mode for grid cards */
  compact?: boolean;
  /** Show full fit reason */
  showReason?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * TripContextBadge - Smart badge showing trip fit on destination cards
 *
 * Displays:
 * - "Perfect for Day 2" when there's a great fit
 * - "Fills dinner gap" with context
 * - "Add to trip" when neutral
 * - Already in trip indicator
 *
 * Clicking adds to trip or shows the add-to-trip drawer
 */
const TripContextBadge = memo(function TripContextBadge({
  destination,
  compact = false,
  showReason = true,
  className = '',
}: TripContextBadgeProps) {
  const { analyzeTripFit, showAddToTrip, addToTripQuick, activeTripInfo } =
    useIntelligentDrawer();
  const { activeTrip } = useTripBuilder();

  // Check if already in trip
  const isInTrip = useMemo(() => {
    if (!activeTrip) return false;
    return activeTrip.days.some((day) =>
      day.items.some((item) => item.destination?.slug === destination.slug)
    );
  }, [activeTrip, destination.slug]);

  // Get fit analysis
  const fitAnalysis = useMemo(() => {
    return analyzeTripFit(destination);
  }, [analyzeTripFit, destination]);

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isInTrip) return;

    if (fitAnalysis && fitAnalysis.category === 'perfect') {
      // Quick add to best day
      addToTripQuick(destination, fitAnalysis.bestDay);
    } else {
      // Show add-to-trip drawer for more options
      showAddToTrip(destination);
    }
  };

  // No active trip - show simple add button
  if (!activeTripInfo) {
    if (compact) return null;

    return (
      <button
        onClick={handleClick}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full
          bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300
          hover:bg-gray-200 dark:hover:bg-white/20
          text-[11px] font-medium transition-colors
          ${className}
        `}
      >
        <Plus className="w-3 h-3" />
        <span>Add to trip</span>
      </button>
    );
  }

  // Already in trip
  if (isInTrip) {
    return (
      <div
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full
          bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400
          text-[11px] font-medium
          ${className}
        `}
      >
        <Check className="w-3 h-3" />
        <span>In trip</span>
      </div>
    );
  }

  // With fit analysis
  if (fitAnalysis) {
    const colors = {
      perfect: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        hover: 'hover:bg-green-200 dark:hover:bg-green-900/50',
      },
      good: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
      },
      possible: {
        bg: 'bg-gray-100 dark:bg-white/10',
        text: 'text-gray-600 dark:text-gray-300',
        hover: 'hover:bg-gray-200 dark:hover:bg-white/20',
      },
      conflict: {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50',
      },
    };

    const style = colors[fitAnalysis.category];

    if (compact) {
      // Minimal version for grid cards
      return (
        <button
          onClick={handleClick}
          className={`
            flex items-center gap-1 px-2 py-1 rounded-full
            ${style.bg} ${style.text} ${style.hover}
            text-[10px] font-medium transition-colors
            ${className}
          `}
        >
          {fitAnalysis.category === 'perfect' ? (
            <Sparkles className="w-2.5 h-2.5" />
          ) : (
            <Plus className="w-2.5 h-2.5" />
          )}
          <span>Day {fitAnalysis.bestDay}</span>
        </button>
      );
    }

    // Full version with reason
    return (
      <button
        onClick={handleClick}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full
          ${style.bg} ${style.text} ${style.hover}
          text-[11px] font-medium transition-colors
          ${className}
        `}
      >
        {fitAnalysis.category === 'perfect' ? (
          <Sparkles className="w-3 h-3" />
        ) : (
          <Plus className="w-3 h-3" />
        )}
        <span>
          {fitAnalysis.category === 'perfect'
            ? `Perfect for Day ${fitAnalysis.bestDay}`
            : fitAnalysis.category === 'good'
            ? `Day ${fitAnalysis.bestDay}`
            : `Add to Day ${fitAnalysis.bestDay}`}
        </span>
        {showReason && fitAnalysis.reason && fitAnalysis.category !== 'possible' && (
          <span className="opacity-70">· {fitAnalysis.reason}</span>
        )}
      </button>
    );
  }

  // Fallback - simple add button
  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300
        hover:bg-gray-200 dark:hover:bg-white/20
        text-[11px] font-medium transition-colors
        ${className}
      `}
    >
      <Plus className="w-3 h-3" />
      <span>Add to trip</span>
    </button>
  );
});

/**
 * Floating version that appears on hover
 */
export const TripContextBadgeFloating = memo(function TripContextBadgeFloating({
  destination,
  className = '',
}: {
  destination: Destination;
  className?: string;
}) {
  const { analyzeTripFit, addToTripQuick, showAddToTrip, activeTripInfo } =
    useIntelligentDrawer();
  const { activeTrip } = useTripBuilder();

  const isInTrip = useMemo(() => {
    if (!activeTrip) return false;
    return activeTrip.days.some((day) =>
      day.items.some((item) => item.destination?.slug === destination.slug)
    );
  }, [activeTrip, destination.slug]);

  const fitAnalysis = useMemo(() => {
    return analyzeTripFit(destination);
  }, [analyzeTripFit, destination]);

  if (isInTrip || !activeTripInfo) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (fitAnalysis && fitAnalysis.category === 'perfect') {
      addToTripQuick(destination, fitAnalysis.bestDay);
    } else {
      showAddToTrip(destination);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        absolute top-2 right-2 z-10
        w-8 h-8 rounded-full
        bg-white/90 dark:bg-black/70 backdrop-blur-md
        shadow-lg
        flex items-center justify-center
        opacity-0 group-hover:opacity-100
        transform translate-y-1 group-hover:translate-y-0
        transition-all duration-200
        hover:scale-110 active:scale-95
        ${className}
      `}
      title={
        fitAnalysis
          ? `Add to Day ${fitAnalysis.bestDay} (${fitAnalysis.reason})`
          : 'Add to trip'
      }
    >
      <Plus className="w-4 h-4 text-gray-700 dark:text-white" />
    </button>
  );
});

export default TripContextBadge;
