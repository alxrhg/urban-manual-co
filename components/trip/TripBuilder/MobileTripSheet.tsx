'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, MapPin, Calendar, ChevronRight, Sparkles, Navigation2 } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import MobileTripCard from './MobileTripCard';

/**
 * MobileTripSheet - Redesigned mobile trip experience
 *
 * Key improvements over TripDrawer:
 * - Horizontal day navigation with pills
 * - Swipe down to close
 * - Visual timeline connector between items
 * - Always-visible action buttons (no hover)
 * - Category color coding
 * - Travel time shown on connector
 */
const MobileTripSheet = memo(function MobileTripSheet() {
  const {
    activeTrip,
    isPanelOpen,
    removeFromTrip,
    closePanel,
    totalItems,
    moveItem,
  } = useTripBuilder();

  const [selectedDay, setSelectedDay] = useState(1);
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  // Reset selected day when trip changes
  useEffect(() => {
    if (activeTrip?.days.length && selectedDay > activeTrip.days.length) {
      setSelectedDay(1);
    }
  }, [activeTrip?.days.length, selectedDay]);

  // Handle drag end for swipe-to-close
  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.velocity.y > 500 || info.offset.y > 200) {
        closePanel();
      }
    },
    [closePanel]
  );

  if (!isPanelOpen || !activeTrip) return null;

  const currentDay = activeTrip.days.find((d) => d.dayNumber === selectedDay) || activeTrip.days[0];
  const items = currentDay?.items || [];

  // Format date for display
  const formatDayDate = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Calculate total trip duration
  const tripDuration = activeTrip.days.length;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closePanel}
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 backdrop-blur-sm"
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        style={{ y, opacity }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col touch-pan-y"
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-0.5">
                {activeTrip.title || activeTrip.city || 'Your Trip'}
              </h2>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {totalItems} {totalItems === 1 ? 'place' : 'places'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {tripDuration} {tripDuration === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="p-2.5 -mr-2 -mt-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Day navigation pills */}
          {tripDuration > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {activeTrip.days.map((day) => {
                const isSelected = day.dayNumber === selectedDay;
                const hasItems = day.items.length > 0;
                return (
                  <button
                    key={day.dayNumber}
                    onClick={() => setSelectedDay(day.dayNumber)}
                    className={`
                      flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                      transition-all active:scale-95
                      ${isSelected
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg'
                        : hasItems
                          ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                          : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                      }
                    `}
                  >
                    <span className="whitespace-nowrap">
                      Day {day.dayNumber}
                      {day.items.length > 0 && (
                        <span className={`ml-1.5 ${isSelected ? 'opacity-70' : 'text-gray-400'}`}>
                          · {day.items.length}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day date header */}
        {currentDay?.date && (
          <div className="flex-shrink-0 px-5 pb-2">
            <p className="text-xs text-gray-400 font-medium">
              {formatDayDate(currentDay.date)}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <EmptyDayState dayNumber={selectedDay} />
          ) : (
            <div className="px-5 pb-8">
              {items.map((item, index) => (
                <div key={item.id}>
                  {/* Travel time connector */}
                  {index > 0 && item.travelTimeFromPrev && item.travelTimeFromPrev > 5 && (
                    <TravelConnector minutes={item.travelTimeFromPrev} />
                  )}

                  <MobileTripCard
                    item={item}
                    onRemove={() => removeFromTrip(item.id)}
                    isLast={index === items.length - 1}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom action - View full trip */}
        {totalItems > 0 && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium text-sm active:scale-[0.98] transition-transform"
              onClick={() => {
                closePanel();
                window.location.href = `/trips/${activeTrip.id || 'new'}`;
              }}
            >
              <Sparkles className="w-4 h-4" />
              View full trip
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Empty state for a day with no items
 */
function EmptyDayState({ dayNumber }: { dayNumber: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 shadow-inner">
        <MapPin className="w-7 h-7 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
        Day {dayNumber} is empty
      </h3>
      <p className="text-sm text-gray-500 max-w-[240px]">
        Browse destinations and tap the heart icon to add places to your trip
      </p>
    </div>
  );
}

/**
 * Visual connector between items showing travel time
 */
function TravelConnector({ minutes }: { minutes: number }) {
  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`;
  };

  return (
    <div className="flex items-center gap-3 py-3 pl-6">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-3 bg-gray-200 dark:bg-gray-700" />
        <div className="w-0.5 h-3 bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-white/5 rounded-full">
        <Navigation2 className="w-3 h-3 text-gray-400" />
        <span className="text-xs text-gray-500">{formatTime(minutes)}</span>
      </div>
    </div>
  );
}

export default MobileTripSheet;
