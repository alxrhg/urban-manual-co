'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

/**
 * TripFloatingBar - Minimal floating pill
 *
 * Just shows: "Trip · 5 places"
 * Tap to open. Nothing else.
 */
const TripFloatingBar = memo(function TripFloatingBar() {
  const { activeTrip, isPanelOpen, openPanel, totalItems } = useTripBuilder();

  // Don't show if no trip, no items, or panel is open
  if (!activeTrip || totalItems === 0 || isPanelOpen) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={openPanel}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 bg-gray-900 dark:bg-white rounded-full shadow-lg active:scale-[0.97] transition-transform"
      >
        <span className="text-[13px] font-medium text-white dark:text-gray-900">
          {activeTrip.title || activeTrip.city || 'Trip'} · {totalItems}
        </span>
      </motion.button>
    </AnimatePresence>
  );
});

export default TripFloatingBar;
