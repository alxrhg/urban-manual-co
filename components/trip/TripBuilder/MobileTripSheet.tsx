'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, MapPin, Calendar, ChevronRight, Plus, Navigation2 } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import MobileTripCard from './MobileTripCard';

/**
 * MobileTripSheet - Redesigned to match PlanningSheet aesthetic
 *
 * Clean, consistent design with:
 * - Day navigation pills (matching PlanningSheet day picker)
 * - Blue accent for selected states
 * - Swipe down to close
 * - Visual timeline connector between items
 * - Minimal, focused UI
 */
const MobileTripSheet = memo(function MobileTripSheet() {
  const {
    activeTrip,
    isPanelOpen,
    removeFromTrip,
    closePanel,
    totalItems,
    defaultDay,
    setDefaultDay,
  } = useTripBuilder();

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const sheetRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);

  // Sync with defaultDay from context
  useEffect(() => {
    setSelectedDay(defaultDay);
  }, [defaultDay]);

  // Reset selected day when trip changes
  useEffect(() => {
    if (activeTrip?.days.length && selectedDay > activeTrip.days.length) {
      setSelectedDay(1);
    }
  }, [activeTrip?.days.length, selectedDay]);

  // Handle day selection - sync with context
  const handleDaySelect = (dayNum: number) => {
    setSelectedDay(dayNum);
    setDefaultDay(dayNum);
  };

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
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col touch-pan-y"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeTrip.title || activeTrip.city || 'Your Trip'}
            </h2>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
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
            className="p-2 -m-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Day picker - matching PlanningSheet style */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Select day
          </p>
          <div className="flex flex-wrap gap-2">
            {activeTrip.days.map(day => {
              const itemCount = day.items.length;
              const isSelected = selectedDay === day.dayNumber;

              return (
                <button
                  key={day.dayNumber}
                  onClick={() => handleDaySelect(day.dayNumber)}
                  className={`flex flex-col items-center px-4 py-2 rounded-xl
                            transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                >
                  <span className="text-sm font-medium">Day {day.dayNumber}</span>
                  {day.date && (
                    <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                    {itemCount} {itemCount === 1 ? 'place' : 'places'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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

        {/* Bottom action */}
        {activeTrip.id && (
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => {
                closePanel();
                window.location.href = `/trips/${activeTrip.id}`;
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900
                       rounded-xl font-medium text-sm
                       hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
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
 * Empty state for a day - matching PlanningSheet aesthetic
 */
function EmptyDayState({ dayNumber }: { dayNumber: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Plus className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
        Day {dayNumber} is empty
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Browse destinations and add places to your trip
      </p>
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
        Browse destinations
      </span>
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
