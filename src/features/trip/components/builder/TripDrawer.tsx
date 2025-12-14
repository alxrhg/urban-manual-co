'use client';

import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, MapPin, GripVertical } from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

/**
 * TripDrawer - Minimal trip list
 *
 * Philosophy: A trip is just a list. Nothing more.
 * - No view modes, no tabs, no action buttons
 * - No health scores, insights, or AI features visible
 * - Intelligence works invisibly (auto-scheduling, auto-routing)
 * - Adding a place = it's automatically scheduled
 * - Dragging = it's automatically re-scheduled
 */
const TripDrawer = memo(function TripDrawer() {
  const {
    activeTrip,
    isPanelOpen,
    removeFromTrip,
    closePanel,
    totalItems,
  } = useTripBuilder();

  if (!isPanelOpen || !activeTrip) return null;

  // Flatten all items across days for simple list view
  const allItems = activeTrip.days.flatMap(day =>
    day.items.map(item => ({
      ...item,
      dayNumber: day.dayNumber,
      dayDate: day.date,
    }))
  );

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex-shrink-0 pt-3 pb-1">
          <div className="w-9 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto" />
        </div>

        {/* Header - just title and close */}
        <div className="flex-shrink-0 px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
              {activeTrip.title || activeTrip.city || 'Trip'}
            </h2>
            <p className="text-[12px] text-gray-400">
              {totalItems} {totalItems === 1 ? 'place' : 'places'}
            </p>
          </div>
          <button
            onClick={closePanel}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {totalItems === 0 ? (
            <EmptyState onClose={closePanel} />
          ) : (
            <ItemList items={allItems} onRemove={removeFromTrip} />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Empty state - minimal
 */
function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <MapPin className="w-4 h-4 text-gray-400" />
      </div>
      <p className="text-[14px] text-gray-500 mb-4">
        Add places while browsing
      </p>
      <button
        onClick={onClose}
        className="text-[13px] font-medium text-gray-900 dark:text-white"
      >
        Browse destinations
      </button>
    </div>
  );
}

/**
 * Simple item list grouped by day
 */
function ItemList({
  items,
  onRemove,
}: {
  items: Array<{
    id: string;
    destination: { name: string; category?: string; image?: string; image_thumbnail?: string };
    dayNumber: number;
    dayDate?: string;
    timeSlot?: string;
  }>;
  onRemove: (id: string) => void;
}) {
  // Group by day
  const grouped = items.reduce((acc, item) => {
    const day = item.dayNumber;
    if (!acc[day]) acc[day] = { date: item.dayDate, items: [] };
    acc[day].items.push(item);
    return acc;
  }, {} as Record<number, { date?: string; items: typeof items }>);

  const days = Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <div className="pb-6">
      {days.map(([dayNum, { date, items: dayItems }]) => (
        <div key={dayNum}>
          {/* Day header - subtle */}
          <div className="px-5 py-2 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Day {dayNum}
              {date && (
                <span className="ml-2 font-normal normal-case">
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
            </span>
          </div>

          {/* Items */}
          <div className="px-3">
            {dayItems.map((item) => (
              <ItemRow key={item.id} item={item} onRemove={() => onRemove(item.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single item row - minimal
 */
function ItemRow({
  item,
  onRemove,
}: {
  item: {
    id: string;
    destination: { name: string; category?: string; image?: string; image_thumbnail?: string };
    timeSlot?: string;
  };
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg group hover:bg-gray-50 dark:hover:bg-white/[0.02]">
      {/* Time */}
      <span className="w-10 text-[11px] text-gray-400 text-center flex-shrink-0">
        {item.timeSlot || '—'}
      </span>

      {/* Image */}
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
        {item.destination.image ? (
          <Image
            src={item.destination.image_thumbnail || item.destination.image}
            alt=""
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 text-[13px] text-gray-900 dark:text-white truncate">
        {item.destination.name}
      </span>

      {/* Actions - visible on hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1.5 cursor-grab">
          <GripVertical className="w-3.5 h-3.5 text-gray-300" />
        </button>
        <button onClick={onRemove} className="p-1.5">
          <X className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}

export default TripDrawer;
