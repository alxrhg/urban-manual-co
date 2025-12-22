'use client';

import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronUp, ChevronDown, MapPin } from 'lucide-react';

interface TripDestination {
  id: number;
  name: string;
  slug: string;
  hero_image_url?: string;
  image?: string;
  category?: string;
}

interface TripItemData {
  id: string;
  destination: TripDestination;
  scheduled_time?: string;
  day_number: number;
}

interface UpcomingTrip {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  items: TripItemData[];
}

interface MinimalFloatingTripPanelProps {
  tripId: string;
  tripName: string;
  items: TripItemData[];
  startDate?: string;
  onClose: () => void;
  isOpen?: boolean;
}

const PANEL_DISMISSED_KEY = 'um-floating-trip-dismissed';
const PANEL_DISMISSED_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * MinimalFloatingTripPanel - Clean, elegant floating panel showing upcoming trip
 *
 * Features:
 * - Slides in from the right
 * - Shows next 3 trip items with thumbnails
 * - Collapsible to save space
 * - Links to full trip view
 * - Dismissible with 24h memory
 */
const MinimalFloatingTripPanel = memo(function MinimalFloatingTripPanel({
  tripId,
  tripName,
  items,
  startDate,
  onClose,
  isOpen = true,
}: MinimalFloatingTripPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Show only next 3 items
  const displayItems = useMemo(() => items.slice(0, 3), [items]);
  const remainingCount = Math.max(0, items.length - 3);

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!startDate) return null;
    try {
      return new Date(startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }, [startDate]);

  const handleClose = useCallback(() => {
    onClose();
    // Save dismissal preference
    localStorage.setItem(PANEL_DISMISSED_KEY, Date.now().toString());
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 right-6 w-80 z-40 md:w-96"
        >
          {/* Main Panel */}
          <motion.div
            layout
            className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold tracking-tight truncate">
                    {tripName}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {items.length} {items.length === 1 ? 'place' : 'places'}
                    {formattedDate && ` · ${formattedDate}`}
                  </p>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  {/* Collapse toggle */}
                  <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isCollapsed ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Close trip panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Items List */}
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  {displayItems.map((item, index) => (
                    <TripItemRow key={item.id} item={item} index={index} />
                  ))}

                  {/* Show more indicator */}
                  {remainingCount > 0 && (
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 text-center">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        +{remainingCount} more {remainingCount === 1 ? 'place' : 'places'}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <Link
                href={`/trips/${tripId}`}
                className="w-full px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-2 group"
              >
                <span>View Trip</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * Individual trip item row component
 */
const TripItemRow = memo(function TripItemRow({
  item,
  index,
}: {
  item: TripItemData;
  index: number;
}) {
  const imageUrl = item.destination.hero_image_url || item.destination.image;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
    >
      <Link href={`/destination/${item.destination.slug}`}>
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={item.destination.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="56px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-0.5">
              Day {item.day_number}
              {item.scheduled_time && ` · ${item.scheduled_time}`}
            </p>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {item.destination.name}
            </h4>
            {item.destination.category && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                {item.destination.category}
              </p>
            )}
          </div>

          {/* Arrow */}
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors mt-1 flex-shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
});

/**
 * Hook to manage the floating trip panel state
 */
export function useFloatingTripPanel() {
  const [nextTrip, setNextTrip] = useState<UpcomingTrip | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchNextTrip() {
      try {
        // Check if panel was recently dismissed
        const dismissedAt = localStorage.getItem(PANEL_DISMISSED_KEY);
        if (dismissedAt) {
          const dismissedTime = parseInt(dismissedAt, 10);
          if (Date.now() - dismissedTime < PANEL_DISMISSED_DURATION) {
            setIsLoading(false);
            return;
          }
        }

        const response = await fetch('/api/trips/next');
        if (!response.ok) {
          throw new Error('Failed to fetch next trip');
        }

        const data = await response.json();
        if (data.trip) {
          setNextTrip(data.trip);
          setShowPanel(true);
        }
      } catch (error) {
        console.error('Failed to fetch next trip:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNextTrip();
  }, []);

  const closePanel = useCallback(() => {
    setShowPanel(false);
  }, []);

  return {
    nextTrip,
    showPanel,
    isLoading,
    closePanel,
  };
}

export default MinimalFloatingTripPanel;
export type { TripItemData, UpcomingTrip, MinimalFloatingTripPanelProps };
