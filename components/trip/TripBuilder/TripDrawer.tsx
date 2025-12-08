'use client';

import { useState, useCallback, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  MapPin,
  ChevronDown,
  Calendar,
  Plus,
  GripVertical,
  Navigation,
  Save,
  Loader2,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from './utils';
import { capitalizeCategory } from '@/lib/utils';

/**
 * TripDrawer - Clean, minimal bottom sheet trip interface
 *
 * Apple Design System approach:
 * - Monochromatic palette (grays, no purple/blue gradients)
 * - No AI icons or explicit AI buttons
 * - Intelligence works silently in background
 * - Clean typography with SF Pro-inspired sizing
 * - Generous whitespace
 */
const TripDrawer = memo(function TripDrawer() {
  const { user } = useAuth();
  const {
    activeTrip,
    isPanelOpen,
    isBuilding,
    removeFromTrip,
    addDay,
    removeDay,
    clearTrip,
    saveTrip,
    closePanel,
    totalItems,
  } = useTripBuilder();

  // Local state
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<'peek' | 'half' | 'full'>('half');

  // Drag controls for sheet
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Handle sheet drag
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      if (sheetHeight === 'full') {
        setSheetHeight('half');
      } else {
        closePanel();
      }
    } else if (velocity < -500 || offset < -100) {
      if (sheetHeight === 'peek') {
        setSheetHeight('half');
      } else if (sheetHeight === 'half') {
        setSheetHeight('full');
      }
    }
  }, [sheetHeight, closePanel]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!user) {
      alert('Please sign in to save your trip');
      return;
    }
    setIsSaving(true);
    await saveTrip();
    setIsSaving(false);
  }, [user, saveTrip]);

  // Sheet height classes
  const heightClasses = {
    peek: 'h-[120px]',
    half: 'h-[50vh]',
    full: 'h-[85vh]',
  };

  if (!isPanelOpen || !activeTrip) return null;

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
        ref={constraintsRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-gray-950
          rounded-t-2xl shadow-2xl
          flex flex-col
          transition-[height] duration-300
          ${heightClasses[sheetHeight]}
        `}
      >
        {/* Handle */}
        <div className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-9 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-4 border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center justify-between">
            {/* Trip info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 dark:bg-white flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white dark:text-gray-900" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
                  {activeTrip.title}
                </h2>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                  {totalItems} {totalItems === 1 ? 'place' : 'places'} · {activeTrip.days.length} {activeTrip.days.length === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={isSaving || !activeTrip.isModified}
                className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                {isSaving ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin text-gray-400" />
                ) : (
                  <Save className="w-[18px] h-[18px] text-gray-400" />
                )}
              </button>
              <button
                onClick={closePanel}
                className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-[18px] h-[18px] text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isBuilding ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-gray-300 dark:text-gray-600" />
              <p className="text-[13px] text-gray-400">Building trip...</p>
            </div>
          ) : totalItems === 0 ? (
            <EmptyState city={activeTrip.city} onClose={closePanel} />
          ) : (
            <DaysList
              days={activeTrip.days}
              expandedDay={expandedDay}
              onToggleDay={setExpandedDay}
              onRemoveItem={removeFromTrip}
              onRemoveDay={removeDay}
            />
          )}
        </div>

        {/* Footer */}
        {totalItems > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800/50">
            <div className="flex items-center justify-between">
              <button
                onClick={addDay}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add day
              </button>

              <button
                onClick={clearTrip}
                className="px-3 py-2 text-[12px] font-medium text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * Empty state - clean, minimal
 */
function EmptyState({
  city,
  onClose,
}: {
  city: string;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <MapPin className="w-5 h-5 text-gray-400" />
      </div>
      <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1.5">
        {city ? `Plan your ${city} trip` : 'Start planning'}
      </h3>
      <p className="text-[13px] text-gray-500 mb-5 max-w-[240px]">
        Browse destinations and add them to your trip
      </p>
      <button
        onClick={onClose}
        className="flex items-center justify-center gap-2 h-[38px] px-5 text-[13px] font-medium text-white dark:text-gray-900 bg-gray-900 dark:bg-white rounded-full hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Browse destinations
      </button>
    </div>
  );
}

/**
 * Days list showing collapsible day sections
 */
function DaysList({
  days,
  expandedDay,
  onToggleDay,
  onRemoveItem,
  onRemoveDay,
}: {
  days: any[];
  expandedDay: number;
  onToggleDay: (day: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveDay: (day: number) => void;
}) {
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isExpanded = expandedDay === day.dayNumber;

        return (
          <div
            key={day.dayNumber}
            className={`rounded-xl transition-all ${
              isExpanded
                ? 'bg-gray-50 dark:bg-white/[0.02]'
                : ''
            }`}
          >
            {/* Day header */}
            <button
              onClick={() => onToggleDay(day.dayNumber)}
              className="w-full flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white dark:text-gray-900">
                    {day.dayNumber}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-white">
                    Day {day.dayNumber}
                    {day.date && (
                      <span className="text-gray-400 dark:text-gray-500 font-normal ml-2 text-[11px]">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {day.items.length} {day.items.length === 1 ? 'place' : 'places'}
                    {day.totalTime > 0 && ` · ${formatDuration(day.totalTime)}`}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Day content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-1">
                    {/* Items */}
                    {day.items.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-[12px] text-gray-400">No places added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {day.items.map((item: any, idx: number) => (
                          <TimelineItem
                            key={item.id}
                            item={item}
                            showTravel={idx > 0}
                            onRemove={() => onRemoveItem(item.id)}
                          />
                        ))}
                      </div>
                    )}

                    {/* Remove day - only show if more than 1 day */}
                    {days.length > 1 && day.items.length === 0 && (
                      <button
                        onClick={() => onRemoveDay(day.dayNumber)}
                        className="w-full py-2 text-[11px] font-medium text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Remove day
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Single timeline item - clean, minimal row
 */
function TimelineItem({
  item,
  showTravel,
  onRemove,
}: {
  item: any;
  showTravel: boolean;
  onRemove: () => void;
}) {
  return (
    <>
      {showTravel && item.travelTimeFromPrev > 5 && (
        <div className="flex items-center gap-2 py-1.5 pl-11 text-[10px] text-gray-400">
          <Navigation className="w-2.5 h-2.5" />
          {formatDuration(item.travelTimeFromPrev)}
        </div>
      )}
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-white/[0.03] group transition-colors">
        {/* Time */}
        <div className="w-9 text-center flex-shrink-0">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {item.timeSlot || '—'}
          </span>
        </div>

        {/* Image */}
        <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
          {item.destination.image ? (
            <Image
              src={item.destination.image_thumbnail || item.destination.image}
              alt={item.destination.name}
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
            {item.destination.name}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {capitalizeCategory(item.destination.category)}
            {item.duration > 0 && ` · ${formatDuration(item.duration)}`}
          </p>
        </div>

        {/* Drag handle & remove */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1.5 cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    </>
  );
}

export default TripDrawer;
