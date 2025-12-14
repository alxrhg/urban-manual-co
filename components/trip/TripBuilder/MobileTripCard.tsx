'use client';

import { useState, useCallback, memo, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MapPin, Trash2, Star, ChevronRight } from 'lucide-react';
import { TripItem } from '@/contexts/TripBuilderContext';

interface MobileTripCardProps {
  item: TripItem;
  onRemove: () => void;
  isLast?: boolean;
}

/**
 * MobileTripCard - Clean itinerary-style card with time on left
 *
 * Design matches the trip page ItineraryCard aesthetic:
 * - Time column on the left
 * - Clean card with rounded corners
 * - Image thumbnail
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

  // Format time for display
  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return { time: '--:--', period: '' };
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return { time: `${displayHours}:${minutes?.toString().padStart(2, '0')}`, period };
  };

  // Format duration
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
  };

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
  const formattedTime = formatTime(item.timeSlot);

  return (
    <div className="relative overflow-hidden mb-3">
      {/* Delete button background */}
      <motion.div
        style={{ opacity: deleteOpacity, scale: deleteScale }}
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500 rounded-r-2xl"
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
            className="flex items-stretch gap-3 touch-pan-y"
          >
            {/* Time column - on the left */}
            <div className="flex-shrink-0 w-14 flex flex-col items-center justify-center py-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formattedTime.time}
              </span>
              <span className="text-[10px] text-gray-400">
                {formattedTime.period}
              </span>
              <span className="text-[10px] text-gray-400 mt-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                {formatDuration(item.duration)}
              </span>
            </div>

            {/* Card - matching ItineraryCard style */}
            <div className="flex-1 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="flex">
                {/* Image */}
                {hasImage && (
                  <div className="flex-shrink-0 w-20 h-20 relative">
                    <Image
                      src={item.destination.image_thumbnail || item.destination.image || ''}
                      alt={item.destination.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {item.destination.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                        {item.destination.category?.replace(/_/g, ' ') || 'Place'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 mt-2">
                    {/* Michelin stars */}
                    {item.destination.michelin_stars && item.destination.michelin_stars > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                        {Array.from({ length: item.destination.michelin_stars }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </span>
                    )}

                    {/* City/location */}
                    {item.destination.city && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {item.destination.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={onRemove}
              className="flex-shrink-0 w-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
              aria-label="Remove from trip"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline connector (except last item) */}
      {!isLast && (
        <div className="absolute left-7 top-full w-px h-3 bg-gray-200 dark:bg-gray-700 -translate-x-1/2" />
      )}
    </div>
  );
});

export default MobileTripCard;
