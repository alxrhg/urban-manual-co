'use client';

import { useState, useCallback, memo } from 'react';
import { X, MapPin, ChevronRight, Loader2, Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
} from '@dnd-kit/core';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { useExpandedDays } from './hooks';
import { TripPanelProps, Trip, TripSummary, TripHealth, DayInsight } from './types';
import TripHeader from './TripHeader';
import TripDayCard from './TripDayCard';
import TripEmptyState from './TripEmptyState';
import TripActions from './TripActions';
import DestinationPalette from './DestinationPalette';
import DragPreview from './DragPreview';
import { toast } from '@/components/ui/sonner';
import type { Destination } from '@/types/destination';

/**
 * TripPanel - Main trip builder panel
 *
 * A slide-out panel that provides the complete trip planning experience:
 * - Trip header with editable title, dates, and health score
 * - Day-by-day itinerary with drag-drop reordering
 * - Smart insights and suggestions
 * - Save, share, and clear actions
 *
 * Designed to feel like a natural extension of the homepage's
 * travel intelligence features.
 */
const TripPanel = memo(function TripPanel({ className = '' }: TripPanelProps) {
  const { user } = useAuth();
  const {
    activeTrip,
    savedTrips,
    isPanelOpen,
    isBuilding,
    isLoadingTrips,
    isSuggestingNext,
    removeFromTrip,
    updateItemTime,
    updateItemNotes,
    addDay,
    removeDay,
    updateTripDetails,
    reorderItems,
    clearTrip,
    saveTrip,
    closePanel,
    optimizeDay,
    autoScheduleDay,
    moveItemToDay,
    getDayInsights,
    getTripHealth,
    suggestNextItem,
    addToTrip,
    switchToTrip,
    refreshSavedTrips,
    totalItems,
  } = useTripBuilder();

  // Local state
  const [isSaving, setIsSaving] = useState(false);
  const [draggedDestination, setDraggedDestination] = useState<Destination | null>(null);
  const [overDayNumber, setOverDayNumber] = useState<number | null>(null);
  const { isExpanded, toggle, expand } = useExpandedDays([1]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Get trip health
  const tripHealth = getTripHealth();

  // DnD event handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const destination = event.active.data.current?.destination as Destination | undefined;
    if (destination) {
      setDraggedDestination(destination);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const dayNumber = event.over?.data.current?.dayNumber as number | undefined;
    setOverDayNumber(dayNumber ?? null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const destination = draggedDestination;
    const dayNumber = event.over?.data.current?.dayNumber as number | undefined;

    setDraggedDestination(null);
    setOverDayNumber(null);

    if (destination && dayNumber) {
      addToTrip(destination, dayNumber);
      expand(dayNumber);
      toast.success(`Added ${destination.name} to Day ${dayNumber}`);
    }
  }, [draggedDestination, addToTrip, expand]);

  // Handlers
  const handleSave = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to save your trip');
      return;
    }
    setIsSaving(true);
    await saveTrip();
    await refreshSavedTrips();
    toast.success('Trip saved');
    setIsSaving(false);
  }, [user, saveTrip, refreshSavedTrips]);

  const handleShare = useCallback(() => {
    if (activeTrip?.id) {
      const url = `${window.location.origin}/trips/${activeTrip.id}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } else {
      toast.info('Save your trip first to share it');
    }
  }, [activeTrip]);

  const handleOpenDestination = useCallback((slug: string) => {
    const event = new CustomEvent('openDestination', { detail: { slug } });
    window.dispatchEvent(event);
  }, []);

  const handleSwitchTrip = useCallback(
    async (tripId: string) => {
      await switchToTrip(tripId);
    },
    [switchToTrip]
  );

  const handleSuggestNext = useCallback(
    async (dayNumber: number) => {
      const suggestion = await suggestNextItem(dayNumber);
      if (suggestion) {
        addToTrip(suggestion, dayNumber);
      }
    },
    [suggestNextItem, addToTrip]
  );

  const handleUpdateTitle = useCallback(
    (title: string) => {
      updateTripDetails({ title });
    },
    [updateTripDetails]
  );

  const handleUpdateDate = useCallback(
    (date: string) => {
      updateTripDetails({ startDate: date });
    },
    [updateTripDetails]
  );

  const handleReorder = useCallback(
    (dayNumber: number, fromIndex: number, toIndex: number) => {
      reorderItems(dayNumber, fromIndex, toIndex);
    },
    [reorderItems]
  );

  const handleInsightAction = useCallback(
    (dayNumber: number, action: string) => {
      switch (action) {
        case 'Auto-schedule':
          autoScheduleDay(dayNumber);
          break;
        case 'Optimize route':
          optimizeDay(dayNumber);
          break;
        case 'Move items':
          expand(dayNumber);
          break;
        case 'Add restaurant':
          handleSuggestNext(dayNumber);
          break;
        default:
          break;
      }
    },
    [autoScheduleDay, optimizeDay, expand, handleSuggestNext]
  );

  const handleMoveItemToDay = useCallback(
    (itemId: string, fromDay: number, toDay: number) => {
      moveItemToDay(itemId, fromDay, toDay);
    },
    [moveItemToDay]
  );

  // Don't render if panel is closed
  if (!isPanelOpen) return null;

  // Show trip selector if user is logged in with saved trips but no active trip
  if (!activeTrip && user && savedTrips.length > 0) {
    return (
      <TripSelector
        trips={savedTrips}
        isLoading={isLoadingTrips}
        onSelectTrip={handleSwitchTrip}
        onClose={closePanel}
        className={className}
      />
    );
  }

  // Don't render if no active trip
  if (!activeTrip) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`
          fixed right-0 top-0 h-full w-full max-w-[400px]
          bg-white dark:bg-gray-900 shadow-2xl z-50
          flex flex-col
          animate-in slide-in-from-right duration-300
          ${className}
        `}
        role="dialog"
        aria-label="Trip Builder"
        aria-modal="true"
      >
        {/* Header */}
        <TripHeader
          trip={activeTrip as Trip}
          health={tripHealth as TripHealth}
          totalItems={totalItems}
          savedTrips={savedTrips as TripSummary[]}
          onClose={closePanel}
          onUpdateTitle={handleUpdateTitle}
          onUpdateDate={handleUpdateDate}
          onSwitchTrip={handleSwitchTrip}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {isBuilding ? (
            <LoadingState />
          ) : totalItems === 0 ? (
            <TripEmptyState
              city={activeTrip.city}
              isLoading={isSuggestingNext}
              onSuggest={() => handleSuggestNext(1)}
              onBrowse={closePanel}
            />
          ) : (
            <div>
              {activeTrip.days.map((day) => (
                <TripDayCard
                  key={day.dayNumber}
                  day={day}
                  dayCount={activeTrip.days.length}
                  isExpanded={isExpanded(day.dayNumber)}
                  isDropTarget={overDayNumber === day.dayNumber}
                  insights={getDayInsights(day.dayNumber) as DayInsight[]}
                  isSuggesting={isSuggestingNext}
                  onToggle={() => toggle(day.dayNumber)}
                  onRemoveItem={removeFromTrip}
                  onUpdateTime={updateItemTime}
                  onUpdateNotes={updateItemNotes}
                  onMoveToDay={(itemId, toDay) =>
                    handleMoveItemToDay(itemId, day.dayNumber, toDay)
                  }
                  onOptimize={() => optimizeDay(day.dayNumber)}
                  onAutoSchedule={() => autoScheduleDay(day.dayNumber)}
                  onSuggestNext={() => handleSuggestNext(day.dayNumber)}
                  onRemoveDay={() => removeDay(day.dayNumber)}
                  onOpenDestination={handleOpenDestination}
                  onReorder={(from, to) => handleReorder(day.dayNumber, from, to)}
                  onInsightAction={(action) =>
                    handleInsightAction(day.dayNumber, action)
                  }
                />
              ))}

              {/* Add day button */}
              <button
                onClick={addDay}
                className="w-full p-4 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Day
              </button>
            </div>
          )}
        </main>

        {/* Destination Palette - Drag source */}
        <DestinationPalette city={activeTrip.city} />

        {/* Footer */}
        <TripActions
          tripId={activeTrip.id}
          isModified={activeTrip.isModified}
          isSaving={isSaving}
          onSave={handleSave}
          onShare={handleShare}
          onClear={clearTrip}
        />
      </aside>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
        {draggedDestination && (
          <DragPreview
            destination={draggedDestination}
            isOverTarget={overDayNumber !== null}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
});

/**
 * Loading state during itinerary building
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      <p className="text-[14px] text-gray-500">Building your itinerary...</p>
    </div>
  );
}

/**
 * Trip selector for choosing from saved trips
 */
function TripSelector({
  trips,
  isLoading,
  onSelectTrip,
  onClose,
  className = '',
}: {
  trips: TripSummary[];
  isLoading: boolean;
  onSelectTrip: (tripId: string) => void;
  onClose: () => void;
  className?: string;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`
          fixed right-0 top-0 h-full w-full max-w-[400px]
          bg-white dark:bg-gray-900 shadow-2xl z-50
          flex flex-col
          animate-in slide-in-from-right duration-300
          ${className}
        `}
        role="dialog"
        aria-label="Your Trips"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">
              Your Trips
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => onSelectTrip(trip.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                      {trip.title}
                    </p>
                    <p className="text-[12px] text-gray-500 truncate">
                      {trip.destination} · {trip.itemCount} places
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default TripPanel;
