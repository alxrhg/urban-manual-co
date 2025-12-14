'use client';

import { useState, useCallback, memo, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Trash2, Star } from 'lucide-react';
import { TripItem } from '@/contexts/TripBuilderContext';

interface MobileTripCardProps {
  item: TripItem;
  onRemove: () => void;
  isLast?: boolean;
}

/**
 * MobileTripCard - Timeline-style itinerary item
 *
 * Design matches the trip page:
 * - Circular image/icon on left
 * - Title and category on right
 * - Vertical timeline connector
 * - Swipe to delete
 */
const MobileTripCard = memo(function MobileTripCard({
  item,
  onRemove,
  isLast = false,
}: MobileTripCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);
  const deleteScale = useTransform(x, [-100, -50], [1, 0.8]);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle swipe end
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x < -80) {
        setIsDeleting(true);
        setTimeout(onRemove, 200);
      }
    },
    [onRemove]
  );

  const hasImage = item.destination.image || item.destination.image_thumbnail;

  return (
    <div className="relative">
      {/* Delete button background */}
      <motion.div
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 rounded-r-xl"
      >
        <Trash2 className="w-5 h-5 text-white" />
      </motion.div>

      {/* Main card */}
      <AnimatePresence>
        {!isDeleting && (
          <motion.div
            ref={cardRef}
            style={{ x }}
            drag="x"
            dragConstraints={{ left: -100, right: 0 }}
            dragElastic={{ left: 0.1, right: 0 }}
            onDragEnd={handleDragEnd}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex items-center gap-3 py-2 touch-pan-y"
          >
            {/* Circular image/icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
              {hasImage ? (
                <Image
                  src={item.destination.image_thumbnail || item.destination.image || ''}
                  alt={item.destination.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {item.destination.name}
                </h4>
                {/* Michelin stars */}
                {item.destination.michelin_stars && item.destination.michelin_stars > 0 && (
                  <span className="flex items-center text-red-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {item.destination.category?.replace(/_/g, ' ') || 'Place'}
              </p>
            </div>

            {/* Delete button */}
            <button
              onClick={onRemove}
              className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove from trip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-14 bottom-0 w-px bg-gray-200 dark:bg-gray-700 -translate-x-1/2" style={{ height: 'calc(100% - 56px + 8px)' }} />
      )}
    </div>
  );
});

export default MobileTripCard;
