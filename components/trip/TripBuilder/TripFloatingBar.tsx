'use client';

import { useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronUp } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

/**
 * TripFloatingBar - Minimal floating trip indicator
 *
 * Apple Design System approach:
 * - Clean, monochromatic design
 * - No AI suggestion bubbles or sparkles
 * - Subtle, non-intrusive presence
 * - Quick access to trip drawer
 */
const TripFloatingBar = memo(function TripFloatingBar() {
  const {
    activeTrip,
    isPanelOpen,
    openPanel,
    totalItems,
  } = useTripBuilder();

  // Compute trip stats
  const tripStats = useMemo(() => {
    if (!activeTrip) return null;

    return {
      places: totalItems,
      days: activeTrip.days.length,
    };
  }, [activeTrip, totalItems]);

  // Don't show if no active trip or no items
  if (!activeTrip || totalItems === 0) return null;

  // Don't show if panel is open
  if (isPanelOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40"
      >
        <button
          onClick={openPanel}
          className="flex items-center gap-3 pl-3 pr-4 py-2.5 bg-gray-900 dark:bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Trip indicator icons */}
          <div className="flex -space-x-1.5">
            {[...Array(Math.min(3, tripStats?.places || 0))].map((_, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-white flex items-center justify-center"
                style={{ zIndex: 3 - i }}
              >
                <MapPin className="w-2.5 h-2.5 text-gray-900 dark:text-white" />
              </div>
            ))}
          </div>

          {/* Trip info */}
          <div className="text-left">
            <p className="text-[12px] font-semibold text-white dark:text-gray-900 leading-tight">
              {activeTrip.title}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {tripStats?.places} {tripStats?.places === 1 ? 'place' : 'places'} · {tripStats?.days} {tripStats?.days === 1 ? 'day' : 'days'}
            </p>
          </div>

          {/* Expand indicator */}
          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400 ml-1" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
});

export default TripFloatingBar;
