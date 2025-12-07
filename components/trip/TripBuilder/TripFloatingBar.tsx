'use client';

import { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ChevronUp,
  Sparkles,
  Route,
  Calendar,
  X,
  Plus,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { formatDuration } from './utils';

/**
 * TripFloatingBar - Persistent floating trip indicator
 *
 * A minimal, always-visible bar at the bottom of the screen that:
 * - Shows current trip progress
 * - Provides quick access to trip drawer
 * - Displays AI suggestions contextually
 * - Shows mini route preview
 *
 * Design Philosophy:
 * - Non-intrusive but always accessible
 * - Shows value (route optimization, time saved)
 * - Encourages interaction through subtle animations
 * - Integrates with the browsing flow
 */
const TripFloatingBar = memo(function TripFloatingBar() {
  const {
    activeTrip,
    isPanelOpen,
    openPanel,
    closePanel,
    totalItems,
  } = useTripBuilder();

  const [showSuggestion, setShowSuggestion] = useState(false);

  // Compute trip stats
  const tripStats = useMemo(() => {
    if (!activeTrip) return null;

    const totalTime = activeTrip.days.reduce((sum, d) => sum + d.totalTime, 0);
    const totalTravel = activeTrip.days.reduce((sum, d) => sum + d.totalTravel, 0);
    const cities = new Set(activeTrip.days.flatMap(d =>
      d.items.map(i => i.destination.city)
    ));

    return {
      places: totalItems,
      days: activeTrip.days.length,
      totalTime,
      totalTravel,
      cities: Array.from(cities),
    };
  }, [activeTrip, totalItems]);

  // Don't show if no active trip
  if (!activeTrip || totalItems === 0) return null;

  // Don't show if panel is open (panel handles display)
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
        {/* Main bar */}
        <div className="relative">
          {/* AI Suggestion bubble */}
          <AnimatePresence>
            {showSuggestion && (
              <motion.div
                initial={{ y: 10, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0, scale: 0.95 }}
                className="absolute bottom-full mb-2 left-0 right-0"
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 mx-auto max-w-[280px]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-900 dark:text-white">
                        Found a great lunch spot!
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Cafe Kitsune fits perfectly after your Day 1 morning
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSuggestion(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded"
                    >
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="flex-1 px-3 py-1.5 text-[11px] font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity">
                      Add to trip
                    </button>
                    <button className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                      Skip
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bar content */}
          <button
            onClick={openPanel}
            className="flex items-center gap-3 px-4 py-3 bg-gray-900 dark:bg-white rounded-2xl shadow-2xl hover:shadow-3xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Trip indicator */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[...Array(Math.min(3, tripStats?.places || 0))].map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-900 dark:border-white flex items-center justify-center"
                    style={{ zIndex: 3 - i }}
                  >
                    <MapPin className="w-3 h-3 text-gray-900 dark:text-white" />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="text-[12px] font-semibold text-white dark:text-gray-900">
                  {activeTrip.title}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  {tripStats?.places} places · {tripStats?.days} days
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-700 dark:bg-gray-300" />

            {/* Stats */}
            <div className="flex items-center gap-3 text-white dark:text-gray-900">
              <div className="flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[11px] font-medium">
                  {formatDuration(tripStats?.totalTravel || 0)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[11px] font-medium">
                  {formatDuration(tripStats?.totalTime || 0)}
                </span>
              </div>
            </div>

            {/* Expand indicator */}
            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default TripFloatingBar;
