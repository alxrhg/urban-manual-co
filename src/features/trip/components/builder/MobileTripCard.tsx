'use client';

import { useState, useCallback, memo, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  Trash2,
  Users,
  Sun,
  Star,
} from 'lucide-react';
import { TripItem } from '@/contexts/TripBuilderContext';

/**
 * Category color mapping for visual differentiation
 */
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  restaurant: { bg: 'bg-orange-50', border: 'border-l-orange-400', text: 'text-orange-600' },
  bar: { bg: 'bg-purple-50', border: 'border-l-purple-400', text: 'text-purple-600' },
  hotel: { bg: 'bg-blue-50', border: 'border-l-blue-400', text: 'text-blue-600' },
  attraction: { bg: 'bg-green-50', border: 'border-l-green-400', text: 'text-green-600' },
  museum: { bg: 'bg-amber-50', border: 'border-l-amber-400', text: 'text-amber-600' },
  cafe: { bg: 'bg-rose-50', border: 'border-l-rose-400', text: 'text-rose-600' },
  shop: { bg: 'bg-pink-50', border: 'border-l-pink-400', text: 'text-pink-600' },
  park: { bg: 'bg-emerald-50', border: 'border-l-emerald-400', text: 'text-emerald-600' },
  gallery: { bg: 'bg-fuchsia-50', border: 'border-l-fuchsia-400', text: 'text-fuchsia-600' },
  landmark: { bg: 'bg-orange-50', border: 'border-l-orange-400', text: 'text-orange-600' },
  beach: { bg: 'bg-cyan-50', border: 'border-l-cyan-400', text: 'text-cyan-600' },
  spa: { bg: 'bg-violet-50', border: 'border-l-violet-400', text: 'text-violet-600' },
  club: { bg: 'bg-rose-50', border: 'border-l-rose-400', text: 'text-rose-600' },
  theater: { bg: 'bg-red-50', border: 'border-l-red-400', text: 'text-red-600' },
  market: { bg: 'bg-yellow-50', border: 'border-l-yellow-400', text: 'text-yellow-600' },
  other: { bg: 'bg-gray-50', border: 'border-l-gray-400', text: 'text-gray-600' },
  default: { bg: 'bg-gray-50', border: 'border-l-gray-400', text: 'text-gray-600' },
};

/**
 * Dark mode category colors
 */
const CATEGORY_COLORS_DARK: Record<string, { bg: string; border: string; text: string }> = {
  restaurant: { bg: 'dark:bg-orange-950/30', border: 'dark:border-l-orange-500', text: 'dark:text-orange-400' },
  bar: { bg: 'dark:bg-purple-950/30', border: 'dark:border-l-purple-500', text: 'dark:text-purple-400' },
  hotel: { bg: 'dark:bg-blue-950/30', border: 'dark:border-l-blue-500', text: 'dark:text-blue-400' },
  attraction: { bg: 'dark:bg-green-950/30', border: 'dark:border-l-green-500', text: 'dark:text-green-400' },
  museum: { bg: 'dark:bg-amber-950/30', border: 'dark:border-l-amber-500', text: 'dark:text-amber-400' },
  cafe: { bg: 'dark:bg-rose-950/30', border: 'dark:border-l-rose-500', text: 'dark:text-rose-400' },
  shop: { bg: 'dark:bg-pink-950/30', border: 'dark:border-l-pink-500', text: 'dark:text-pink-400' },
  park: { bg: 'dark:bg-emerald-950/30', border: 'dark:border-l-emerald-500', text: 'dark:text-emerald-400' },
  gallery: { bg: 'dark:bg-fuchsia-950/30', border: 'dark:border-l-fuchsia-500', text: 'dark:text-fuchsia-400' },
  landmark: { bg: 'dark:bg-orange-950/30', border: 'dark:border-l-orange-500', text: 'dark:text-orange-400' },
  beach: { bg: 'dark:bg-cyan-950/30', border: 'dark:border-l-cyan-500', text: 'dark:text-cyan-400' },
  spa: { bg: 'dark:bg-violet-950/30', border: 'dark:border-l-violet-500', text: 'dark:text-violet-400' },
  club: { bg: 'dark:bg-rose-950/30', border: 'dark:border-l-rose-500', text: 'dark:text-rose-400' },
  theater: { bg: 'dark:bg-red-950/30', border: 'dark:border-l-red-500', text: 'dark:text-red-400' },
  market: { bg: 'dark:bg-yellow-950/30', border: 'dark:border-l-yellow-500', text: 'dark:text-yellow-400' },
  other: { bg: 'dark:bg-gray-800/50', border: 'dark:border-l-gray-500', text: 'dark:text-gray-400' },
  default: { bg: 'dark:bg-gray-800/50', border: 'dark:border-l-gray-500', text: 'dark:text-gray-400' },
};

interface MobileTripCardProps {
  item: TripItem;
  onRemove: () => void;
  isLast?: boolean;
}

/**
 * MobileTripCard - Touch-optimized trip item card
 *
 * Features:
 * - Swipe left to reveal delete button
 * - Category color stripe on left
 * - Larger touch targets
 * - Always-visible time and duration
 * - Crowd level indicator
 * - No hover-dependent UI
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

  // Get category colors
  const categoryKey = item.destination.category?.toLowerCase() || 'default';
  const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.default;
  const darkColors = CATEGORY_COLORS_DARK[categoryKey] || CATEGORY_COLORS_DARK.default;

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

  // Get crowd color
  const getCrowdColor = (level?: number) => {
    if (!level) return 'text-gray-400';
    if (level <= 2) return 'text-green-500';
    if (level <= 4) return 'text-yellow-500';
    return 'text-red-500';
  };

  const hasImage = item.destination.image || item.destination.image_thumbnail;

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
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
            className={`
              relative flex gap-3 p-3 rounded-xl border-l-4
              ${colors.bg} ${colors.border}
              ${darkColors.bg} ${darkColors.border}
              touch-pan-y
            `}
          >
            {/* Time column */}
            <div className="flex-shrink-0 w-14 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.timeSlot || '--:--'}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {formatDuration(item.duration)}
              </span>
            </div>

            {/* Thumbnail */}
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm">
              {hasImage ? (
                <Image
                  src={item.destination.image_thumbnail || item.destination.image || ''}
                  alt={item.destination.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="text-[15px] font-medium text-gray-900 dark:text-white truncate pr-2">
                {item.destination.name}
              </h3>

              <p className={`text-xs font-medium mt-0.5 ${colors.text} ${darkColors.text}`}>
                {capitalizeFirst(item.destination.category || 'Place')}
              </p>

              {/* Metadata row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {/* Michelin stars */}
                {item.destination.michelin_stars && item.destination.michelin_stars > 0 && (
                  <span className="flex items-center gap-0.5 text-[11px] text-amber-600">
                    {Array.from({ length: item.destination.michelin_stars }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </span>
                )}

                {/* Crowd level */}
                {item.crowdLabel && (
                  <span className={`flex items-center gap-1 text-[11px] ${getCrowdColor(item.crowdLevel)}`}>
                    <Users className="w-3 h-3" />
                    {item.crowdLabel}
                  </span>
                )}

                {/* Outdoor indicator */}
                {item.isOutdoor && (
                  <span className="flex items-center gap-1 text-[11px] text-sky-500">
                    <Sun className="w-3 h-3" />
                    Outdoor
                  </span>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-1 italic">
                  "{item.notes}"
                </p>
              )}
            </div>

            {/* Delete button (visible) */}
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 shadow-sm active:scale-90 transition-transform"
              aria-label="Remove from trip"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default MobileTripCard;
