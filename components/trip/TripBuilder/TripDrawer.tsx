'use client';

import { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  MapPin,
  Clock,
  ChevronDown,
  Sparkles,
  Route,
  Calendar,
  Users,
  Plus,
  Minus,
  GripVertical,
  Navigation,
  Sun,
  CloudRain,
  Wand2,
  Timer,
  Save,
  Share2,
  MoreHorizontal,
  Loader2,
  Map,
  List,
  Grip,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from './utils';
import { capitalizeCategory } from '@/lib/utils';

type ViewMode = 'timeline' | 'cards' | 'map';

/**
 * TripDrawer - Intelligent bottom sheet trip interface
 *
 * A reimagined trip planner that feels like a natural extension
 * of the browsing experience. Features:
 *
 * - Bottom sheet that expands smoothly
 * - Multiple view modes (timeline, cards, map)
 * - Inline AI suggestions
 * - Smart day grouping
 * - Gesture-based interactions
 */
const TripDrawer = memo(function TripDrawer() {
  const { user } = useAuth();
  const {
    activeTrip,
    isPanelOpen,
    isBuilding,
    isSuggestingNext,
    removeFromTrip,
    updateItemTime,
    addDay,
    removeDay,
    clearTrip,
    saveTrip,
    closePanel,
    optimizeDay,
    autoScheduleDay,
    getDayInsights,
    getTripHealth,
    suggestNextItem,
    addToTrip,
    totalItems,
  } = useTripBuilder();

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<'peek' | 'half' | 'full'>('half');

  // Drag controls for sheet
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  // Get trip health
  const tripHealth = getTripHealth();

  // Handle sheet drag
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
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

  // Handle suggest
  const handleSuggestNext = useCallback(async (dayNumber: number) => {
    const suggestion = await suggestNextItem(dayNumber);
    if (suggestion) {
      addToTrip(suggestion, dayNumber);
    }
  }, [suggestNextItem, addToTrip]);

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
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40"
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
          bg-white dark:bg-gray-900
          rounded-t-3xl shadow-2xl
          flex flex-col
          transition-[height] duration-300
          ${heightClasses[sheetHeight]}
        `}
      >
        {/* Handle */}
        <div className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            {/* Trip info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white dark:text-gray-900" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">
                  {activeTrip.title}
                </h2>
                <p className="text-[12px] text-gray-500 flex items-center gap-2">
                  <span>{totalItems} places</span>
                  <span>·</span>
                  <span>{activeTrip.days.length} days</span>
                  {tripHealth.score > 0 && (
                    <>
                      <span>·</span>
                      <span className={`font-medium ${
                        tripHealth.score >= 70 ? 'text-green-500' :
                        tripHealth.score >= 50 ? 'text-amber-500' :
                        'text-red-500'
                      }`}>
                        {tripHealth.score}% health
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !activeTrip.isModified}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <Save className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <button
                onClick={closePanel}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* View mode tabs */}
          <div className="flex items-center gap-1 mt-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
            <ViewModeButton
              mode="timeline"
              icon={<List className="w-4 h-4" />}
              label="Timeline"
              isActive={viewMode === 'timeline'}
              onClick={() => setViewMode('timeline')}
            />
            <ViewModeButton
              mode="cards"
              icon={<Grip className="w-4 h-4" />}
              label="Cards"
              isActive={viewMode === 'cards'}
              onClick={() => setViewMode('cards')}
            />
            <ViewModeButton
              mode="map"
              icon={<Map className="w-4 h-4" />}
              label="Map"
              isActive={viewMode === 'map'}
              onClick={() => setViewMode('map')}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isBuilding ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-[14px] text-gray-500">Building your trip...</p>
            </div>
          ) : totalItems === 0 ? (
            <EmptyState
              city={activeTrip.city}
              isLoading={isSuggestingNext}
              onSuggest={() => handleSuggestNext(1)}
              onClose={closePanel}
            />
          ) : viewMode === 'timeline' ? (
            <TimelineView
              days={activeTrip.days}
              expandedDay={expandedDay}
              isSuggesting={isSuggestingNext}
              onToggleDay={setExpandedDay}
              onRemoveItem={removeFromTrip}
              onUpdateTime={updateItemTime}
              onOptimize={optimizeDay}
              onAutoSchedule={autoScheduleDay}
              onSuggestNext={handleSuggestNext}
              onRemoveDay={removeDay}
              getDayInsights={getDayInsights}
            />
          ) : viewMode === 'cards' ? (
            <CardsView
              days={activeTrip.days}
              onRemoveItem={removeFromTrip}
            />
          ) : (
            <MapView city={activeTrip.city} days={activeTrip.days} />
          )}
        </div>

        {/* Footer */}
        {totalItems > 0 && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <button
                onClick={addDay}
                className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add day
              </button>

              <button
                onClick={clearTrip}
                className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                Clear trip
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

/**
 * View mode button
 */
function ViewModeButton({
  mode,
  icon,
  label,
  isActive,
  onClick,
}: {
  mode: ViewMode;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
        text-[12px] font-medium transition-all
        ${isActive
          ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Empty state for new trips
 */
function EmptyState({
  city,
  isLoading,
  onSuggest,
  onClose,
}: {
  city: string;
  isLoading: boolean;
  onSuggest: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-purple-500" />
      </div>
      <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white mb-2">
        Start planning {city}
      </h3>
      <p className="text-[13px] text-gray-500 mb-6 max-w-[260px]">
        Add places from the homepage or let AI curate your perfect trip
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <button
          onClick={onSuggest}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          AI suggestions
        </button>
        <button
          onClick={onClose}
          className="w-full px-4 py-3 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Browse destinations
        </button>
      </div>
    </div>
  );
}

/**
 * Timeline view showing days in sequence
 */
function TimelineView({
  days,
  expandedDay,
  isSuggesting,
  onToggleDay,
  onRemoveItem,
  onUpdateTime,
  onOptimize,
  onAutoSchedule,
  onSuggestNext,
  onRemoveDay,
  getDayInsights,
}: {
  days: any[];
  expandedDay: number;
  isSuggesting: boolean;
  onToggleDay: (day: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateTime: (itemId: string, time: string) => void;
  onOptimize: (day: number) => void;
  onAutoSchedule: (day: number) => void;
  onSuggestNext: (day: number) => void;
  onRemoveDay: (day: number) => void;
  getDayInsights: (day: number) => any[];
}) {
  return (
    <div className="space-y-3">
      {days.map((day) => {
        const isExpanded = expandedDay === day.dayNumber;
        const insights = getDayInsights(day.dayNumber);

        return (
          <div
            key={day.dayNumber}
            className={`rounded-2xl border transition-all ${
              isExpanded
                ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                : 'border-transparent'
            }`}
          >
            {/* Day header */}
            <button
              onClick={() => onToggleDay(day.dayNumber)}
              className="w-full flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                  <span className="text-[12px] font-bold text-white dark:text-gray-900">
                    {day.dayNumber}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                    Day {day.dayNumber}
                    {day.date && (
                      <span className="text-gray-400 font-normal ml-2 text-[12px]">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {day.items.length} places · {formatDuration(day.totalTime)}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                  <div className="px-4 pb-4 space-y-2">
                    {/* Insights */}
                    {insights.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {insights.slice(0, 2).map((insight: any, idx: number) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${
                              insight.type === 'warning'
                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{insight.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Items */}
                    {day.items.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-[12px] text-gray-400 mb-2">No places yet</p>
                        <button
                          onClick={() => onSuggestNext(day.dayNumber)}
                          disabled={isSuggesting}
                          className="text-[12px] font-medium text-gray-900 dark:text-white"
                        >
                          + Add places
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
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

                    {/* Day actions */}
                    {day.items.length > 0 && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => onAutoSchedule(day.dayNumber)}
                          className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Timer className="w-3 h-3 inline mr-1" />
                          Schedule
                        </button>
                        {day.items.length >= 2 && (
                          <button
                            onClick={() => onOptimize(day.dayNumber)}
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Route className="w-3 h-3 inline mr-1" />
                            Optimize
                          </button>
                        )}
                        <button
                          onClick={() => onSuggestNext(day.dayNumber)}
                          disabled={isSuggesting}
                          className="px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Wand2 className="w-3 h-3 inline mr-1" />
                          Suggest
                        </button>
                      </div>
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
 * Single timeline item
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
        <div className="flex items-center gap-2 py-1 pl-12 text-[10px] text-gray-400">
          <Navigation className="w-3 h-3" />
          {formatDuration(item.travelTimeFromPrev)}
        </div>
      )}
      <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors">
        <div className="w-10 text-center flex-shrink-0">
          <span className="text-[12px] font-medium text-gray-900 dark:text-white">
            {item.timeSlot || '--:--'}
          </span>
        </div>
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
          {item.destination.image ? (
            <Image
              src={item.destination.image_thumbnail || item.destination.image}
              alt={item.destination.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
            {item.destination.name}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {capitalizeCategory(item.destination.category)} · {formatDuration(item.duration)}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </>
  );
}

/**
 * Cards view showing all items as cards
 */
function CardsView({
  days,
  onRemoveItem,
}: {
  days: any[];
  onRemoveItem: (itemId: string) => void;
}) {
  const allItems = days.flatMap(day =>
    day.items.map((item: any) => ({ ...item, dayNumber: day.dayNumber }))
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {allItems.map((item) => (
        <div
          key={item.id}
          className="relative group rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5"
        >
          <div className="aspect-square">
            {item.destination.image ? (
              <Image
                src={item.destination.image_thumbnail || item.destination.image}
                alt={item.destination.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-[12px] font-medium text-white truncate">
              {item.destination.name}
            </p>
            <p className="text-[10px] text-white/70">
              Day {item.dayNumber} · {item.timeSlot || 'Unscheduled'}
            </p>
          </div>
          <button
            onClick={() => onRemoveItem(item.id)}
            className="absolute top-2 right-2 p-1.5 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Map view placeholder
 */
function MapView({ city, days }: { city: string; days: any[] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
        <Map className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-[14px] font-medium text-gray-900 dark:text-white mb-1">
        Map coming soon
      </p>
      <p className="text-[12px] text-gray-500">
        Visualize your {city} route
      </p>
    </div>
  );
}

export default TripDrawer;
