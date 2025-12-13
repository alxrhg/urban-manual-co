'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { useTripBuilder, type ActiveTrip, type TripItem } from '@/contexts/TripBuilderContext';
import ItineraryCard from './ItineraryCard';
import { Calendar, Clock, Plus, Sparkles, Route, AlertCircle } from 'lucide-react';

interface CanvasTimelineProps {
  trip: ActiveTrip | null;
  overDayNumber: number | null;
}

interface DayLaneProps {
  dayNumber: number;
  date?: string;
  items: TripItem[];
  isOver: boolean;
  isOverstuffed?: boolean;
  totalTime?: number;
  totalTravel?: number;
}

// ============================================
// DAY LANE COMPONENT
// ============================================

function DayLane({ dayNumber, date, items, isOver, isOverstuffed, totalTime, totalTravel }: DayLaneProps) {
  const { removeFromTrip } = useTripBuilder();
  const { setNodeRef, isOver: isDropOver } = useDroppable({
    id: `day-lane-${dayNumber}`,
    data: {
      type: 'day-lane',
      dayNumber,
    },
  });

  const isHighlighted = isOver || isDropOver;

  // Format date
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : `Day ${dayNumber}`;

  // Separate items: regular activities and hotel (night pass)
  const { activities, nightStay } = useMemo(() => {
    const hotelItem = items.find(item => {
      const cat = (item.destination.category || '').toLowerCase();
      return cat.includes('hotel') || cat.includes('resort') || cat.includes('ryokan');
    });

    const otherItems = items.filter(item => item !== hotelItem);

    return {
      activities: otherItems,
      nightStay: hotelItem,
    };
  }, [items]);

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300
        ${isHighlighted
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.01] shadow-lg'
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50'
        }
      `}
    >
      {/* Day Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            layout
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg
              ${isHighlighted
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }
            `}
          >
            {dayNumber}
          </motion.div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {formattedDate}
            </h3>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{activities.length} {activities.length === 1 ? 'activity' : 'activities'}</span>
              {totalTime !== undefined && totalTime > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(totalTime)}
                  </span>
                </>
              )}
              {totalTravel !== undefined && totalTravel > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="flex items-center gap-1">
                    <Route className="w-3 h-3" />
                    {formatDuration(totalTravel)} travel
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {isOverstuffed && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Packed</span>
            </div>
          )}
          {items.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Plus className="w-3.5 h-3.5" />
              <span>Drop spots here</span>
            </div>
          )}
        </div>
      </div>

      {/* Items or Empty State */}
      {activities.length > 0 ? (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {activities.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                  delay: index * 0.05,
                }}
              >
                <ItineraryCard
                  item={item}
                  onRemove={() => removeFromTrip(item.id)}
                  layoutId={`card-${item.id}`}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          layout
          className={`
            min-h-[120px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all
            ${isHighlighted
              ? 'border-blue-400 bg-blue-100/50 dark:bg-blue-900/30'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
            }
          `}
        >
          <Calendar className={`w-8 h-8 mb-2 ${isHighlighted ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`} />
          <p className={`text-sm ${isHighlighted ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            {isHighlighted ? 'Release to schedule' : 'Drag spots from the guide'}
          </p>
        </motion.div>
      )}

      {/* Night Pass (Hotel) */}
      {nightStay && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800"
        >
          <ItineraryCard
            item={nightStay}
            variant="night-pass"
            layoutId={`card-${nightStay.id}`}
          />
        </motion.div>
      )}

      {/* Drop indicator animation */}
      {isHighlighted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
        >
          <div className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950" />
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-6"
      >
        <Calendar className="w-10 h-10 text-white" />
      </motion.div>
      <motion.h2
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
      >
        Your Canvas
      </motion.h2>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm"
      >
        Drag spots from the guide on the right to build your perfect itinerary
      </motion.p>
      <motion.button
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onStart}
        className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:opacity-90 transition-opacity"
      >
        Start Planning
      </motion.button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CanvasTimeline({ trip, overDayNumber }: CanvasTimelineProps) {
  const { startTrip, addDay, getTripHealth } = useTripBuilder();

  // Get trip health for insights
  const health = trip ? getTripHealth() : null;

  // If no trip, show start prompt
  if (!trip) {
    return <EmptyState onStart={() => startTrip('', 3)} />;
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {trip.title || 'My Trip'}
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}
            </span>
            {trip.startDate && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span>
                  {new Date(trip.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {trip.endDate && trip.endDate !== trip.startDate && (
                    <>
                      {' - '}
                      {new Date(trip.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </>
                  )}
                </span>
              </>
            )}
            {health && (
              <>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className={`flex items-center gap-1 ${
                  health.score >= 80 ? 'text-green-600 dark:text-green-400' :
                  health.score >= 60 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  <Sparkles className="w-4 h-4" />
                  {health.label}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Day Lanes */}
      <motion.div layout className="space-y-4">
        <AnimatePresence>
          {trip.days.map((day) => (
            <DayLane
              key={day.dayNumber}
              dayNumber={day.dayNumber}
              date={day.date}
              items={day.items}
              isOver={overDayNumber === day.dayNumber}
              isOverstuffed={day.isOverstuffed}
              totalTime={day.totalTime}
              totalTravel={day.totalTravel}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Add Day Button */}
      <motion.button
        layout
        onClick={addDay}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Add Day</span>
      </motion.button>
    </div>
  );
}
