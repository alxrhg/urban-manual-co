'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowUpDown, Calendar, Clock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

export interface ConflictInfo {
  dayNumber: number;
  item1: EnrichedItineraryItem;
  item2: EnrichedItineraryItem;
  overlapMinutes: number;
}

interface ConflictResolutionProps {
  conflict: ConflictInfo;
  availableDays: number[];
  onSwapOrder: (dayNumber: number, item1Id: string, item2Id: string) => void;
  onMoveToDay: (itemId: string, toDayNumber: number) => void;
  onClearTime: (itemId: string) => void;
  onAcknowledge: (conflictId: string) => void;
}

/**
 * ConflictResolution - Interactive conflict resolution UI
 *
 * Philosophy: Conflicts are a system failure, not a user error.
 * Instead of just warning, we propose actionable solutions.
 */
export function ConflictResolution({
  conflict,
  availableDays,
  onSwapOrder,
  onMoveToDay,
  onClearTime,
  onAcknowledge,
}: ConflictResolutionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowDayPicker(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const conflictId = `${conflict.item1.id}-${conflict.item2.id}`;
  const item1Name = conflict.item1.destination?.name || conflict.item1.title || 'Item 1';
  const item2Name = conflict.item2.destination?.name || conflict.item2.title || 'Item 2';
  const otherDays = availableDays.filter(d => d !== conflict.dayNumber);

  const handleSwap = () => {
    onSwapOrder(conflict.dayNumber, conflict.item1.id, conflict.item2.id);
    setIsOpen(false);
  };

  const handleMoveToDay = (itemId: string, dayNumber: number) => {
    onMoveToDay(itemId, dayNumber);
    setIsOpen(false);
    setShowDayPicker(null);
  };

  const handleClearTime = (itemId: string) => {
    onClearTime(itemId);
    setIsOpen(false);
  };

  const handleAcknowledge = () => {
    onAcknowledge(conflictId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[12px] text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors group"
      >
        <span>
          2 items overlap
          <span className="mx-1 text-amber-400 dark:text-amber-500">·</span>
          <span className="font-medium group-hover:underline">Resolve</span>
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1 z-50 w-64 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
          >
            {/* Header showing conflicting items */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">{item1Name}</span>
                {' '}and{' '}
                <span className="font-medium text-gray-700 dark:text-gray-300">{item2Name}</span>
                {' '}overlap by ~{conflict.overlapMinutes} min
              </p>
            </div>

            {/* Resolution options */}
            <div className="py-1">
              {/* Option 1: Swap order */}
              <button
                onClick={handleSwap}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                <span>Swap order</span>
              </button>

              {/* Option 2: Move to another day */}
              {otherDays.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowDayPicker(showDayPicker ? null : 'select')}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>Move to another day</span>
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showDayPicker ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showDayPicker && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-gray-50 dark:bg-gray-800/30"
                      >
                        <div className="px-3 py-2 space-y-1">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">Which item to move?</p>

                          {/* Select item 1 */}
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate">
                              {item1Name}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {otherDays.map(day => (
                                <button
                                  key={`item1-day-${day}`}
                                  onClick={() => handleMoveToDay(conflict.item1.id, day)}
                                  className="px-2 py-1 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                >
                                  Day {day}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

                          {/* Select item 2 */}
                          <div className="space-y-1">
                            <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400 truncate">
                              {item2Name}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {otherDays.map(day => (
                                <button
                                  key={`item2-day-${day}`}
                                  onClick={() => handleMoveToDay(conflict.item2.id, day)}
                                  className="px-2 py-1 text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                                >
                                  Day {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Option 3: Make flexible (clear time) */}
              <div className="relative group">
                <button
                  onClick={() => handleClearTime(conflict.item2.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Make flexible</span>
                  <span className="text-[10px] text-gray-400">(remove time)</span>
                </button>
              </div>

              {/* Option 4: Keep both (acknowledge) */}
              <button
                onClick={handleAcknowledge}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Check className="w-3.5 h-3.5 text-gray-400" />
                <span>Keep both</span>
                <span className="text-[10px] text-gray-400">(dismiss)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Wrapper component for multiple conflicts
 */
interface ConflictResolutionListProps {
  conflicts: ConflictInfo[];
  availableDays: number[];
  onSwapOrder: (dayNumber: number, item1Id: string, item2Id: string) => void;
  onMoveToDay: (itemId: string, toDayNumber: number) => void;
  onClearTime: (itemId: string) => void;
  acknowledgedConflicts: Set<string>;
  onAcknowledge: (conflictId: string) => void;
}

export function ConflictResolutionList({
  conflicts,
  availableDays,
  onSwapOrder,
  onMoveToDay,
  onClearTime,
  acknowledgedConflicts,
  onAcknowledge,
}: ConflictResolutionListProps) {
  // Filter out acknowledged conflicts
  const activeConflicts = conflicts.filter(
    c => !acknowledgedConflicts.has(`${c.item1.id}-${c.item2.id}`)
  );

  if (activeConflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeConflicts.map((conflict, index) => (
        <div
          key={`conflict-${conflict.dayNumber}-${index}`}
          className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
        >
          <ConflictResolution
            conflict={conflict}
            availableDays={availableDays}
            onSwapOrder={onSwapOrder}
            onMoveToDay={onMoveToDay}
            onClearTime={onClearTime}
            onAcknowledge={onAcknowledge}
          />
        </div>
      ))}
    </div>
  );
}

export default ConflictResolution;
