'use client';

import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MapPin, ChevronUp } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

/**
 * MobileTripFloatingBar - Enhanced floating pill with previews
 *
 * Improvements over TripFloatingBar:
 * - Shows thumbnail stack of places
 * - Displays trip name and count
 * - Expand indicator
 * - Subtle pulse animation on new additions
 * - Better visual hierarchy
 */
const MobileTripFloatingBar = memo(function MobileTripFloatingBar() {
  const { activeTrip, isPanelOpen, openPanel, totalItems } = useTripBuilder();

  // Get preview images (up to 3)
  const previewImages = useMemo(() => {
    if (!activeTrip) return [];
    const images: string[] = [];
    for (const day of activeTrip.days) {
      for (const item of day.items) {
        const img = item.destination.image_thumbnail || item.destination.image;
        if (img && !images.includes(img)) {
          images.push(img);
          if (images.length >= 3) return images;
        }
      }
    }
    return images;
  }, [activeTrip]);

  // Don't show if no trip, no items, or panel is open
  if (!activeTrip || totalItems === 0 || isPanelOpen) return null;

  const tripName = activeTrip.title || activeTrip.city || 'Trip';

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={openPanel}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pl-1.5 pr-4 py-1.5 bg-gray-900 dark:bg-white rounded-full shadow-xl shadow-black/20"
      >
        {/* Thumbnail stack */}
        <div className="relative flex-shrink-0 w-11 h-11">
          {previewImages.length > 0 ? (
            <ThumbnailStack images={previewImages} />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-800 dark:bg-gray-200 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-600" />
            </div>
          )}

          {/* Item count badge */}
          <div className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full border-2 border-gray-900 dark:border-white">
            <span className="text-[10px] font-bold text-gray-900 dark:text-white">
              {totalItems}
            </span>
          </div>
        </div>

        {/* Trip info */}
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-white dark:text-gray-900 truncate max-w-[120px]">
            {tripName}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {totalItems} {totalItems === 1 ? 'place' : 'places'} · Tap to view
          </p>
        </div>

        {/* Expand indicator */}
        <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      </motion.button>
    </AnimatePresence>
  );
});

/**
 * Stacked thumbnail component showing up to 3 images
 */
function ThumbnailStack({ images }: { images: string[] }) {
  return (
    <div className="relative w-11 h-11">
      {images.slice(0, 3).map((src, index) => (
        <motion.div
          key={src}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`
            absolute w-9 h-9 rounded-full overflow-hidden border-2 border-gray-900 dark:border-white shadow-sm
            ${index === 0 ? 'z-30 left-0 top-1' : ''}
            ${index === 1 ? 'z-20 left-2 top-0' : ''}
            ${index === 2 ? 'z-10 left-4 top-1' : ''}
          `}
        >
          <Image
            src={src}
            alt=""
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        </motion.div>
      ))}
    </div>
  );
}

export default MobileTripFloatingBar;
