'use client';

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, MapPin, GripVertical, Calendar, ChevronRight, Plus } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

/**
 * TripDrawer - Redesigned to match PlanningSheet aesthetic
 *
 * Clean, consistent design with:
 * - Day navigation pills (like PlanningSheet day picker)
 * - Consistent spacing and typography
 * - Blue accent for selected states
 * - Minimal, focused UI
 */
const TripDrawer = memo(function TripDrawer() {
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

  if (!isPanelOpen || !activeTrip) return null;

  const currentDay = activeTrip.days.find(d => d.dayNumber === selectedDay) || activeTrip.days[0];
  const items = currentDay?.items || [];

  const handleDaySelect = (dayNum: number) => {
    setSelectedDay(dayNum);
    setDefaultDay(dayNum);
  };

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
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
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
                {activeTrip.days.length} {activeTrip.days.length === 1 ? 'day' : 'days'}
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

        {/* Content - items list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState dayNumber={selectedDay} onClose={closePanel} />
          ) : (
            <div className="p-5 space-y-2">
              {items.map((item) => (
                <ItemCard key={item.id} item={item} onRemove={() => removeFromTrip(item.id)} />
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
 * Empty state for a day
 */
function EmptyState({ dayNumber, onClose }: { dayNumber: number; onClose: () => void }) {
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
      <button
        onClick={onClose}
        className="text-sm font-medium text-blue-600 dark:text-blue-400"
      >
        Browse destinations
      </button>
    </div>
  );
}

/**
 * Item card - cleaner design matching sheet aesthetic
 */
function ItemCard({
  item,
  onRemove,
}: {
  item: {
    id: string;
    destination: { name: string; category?: string; image?: string; image_thumbnail?: string };
    timeSlot?: string;
    duration?: number;
  };
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 group">
      {/* Time */}
      <div className="w-12 text-center flex-shrink-0">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {item.timeSlot || '—'}
        </span>
      </div>

      {/* Image */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {item.destination.image ? (
          <Image
            src={item.destination.image_thumbnail || item.destination.image}
            alt=""
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {item.destination.name}
        </p>
        {item.destination.category && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {item.destination.category}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 cursor-grab hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={onRemove}
          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}

export default TripDrawer;
