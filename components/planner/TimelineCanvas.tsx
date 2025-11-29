'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Plane, Sparkles, Clock, MapPin, Zap } from 'lucide-react';
import TimeBlockCard from './TimeBlockCard';
import type { TimeBlock, DayPlan, DayPlanStats } from '@/lib/intelligence/types';
import { estimateTransit } from '@/lib/intelligence/transit';
import { calculateDayStats, formatTimeFromMinutes, parseTimeToMinutes } from '@/lib/intelligence/types';
import { fillGapsInTimeline, applyFillSuggestions } from '@/lib/intelligence/autoFill';

interface TimelineCanvasProps {
  dayPlan: DayPlan;
  onBlocksChange: (blocks: TimeBlock[]) => void;
  onBlockEdit?: (block: TimeBlock) => void;
  onBlockRemove?: (blockId: string) => void;
  onAddPlace?: () => void;
  onAddFlight?: () => void;
  onAIPlan?: () => void;
  /** Callback for smart route optimization */
  onSmartOptimize?: () => void;
  isAIPlanning?: boolean;
  isOptimizing?: boolean;
  /** Starting location for route optimization (e.g., hotel) */
  startingLocation?: { lat: number; lng: number };
  className?: string;
}

// Sortable wrapper for TimeBlockCard
function SortableBlock({
  block,
  index,
  isExpanded,
  onToggleExpand,
  onEdit,
  onRemove,
  onToggleLock,
  onTimeChange,
  showConnector,
}: {
  block: TimeBlock;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onToggleLock?: () => void;
  onTimeChange?: (time: string) => void;
  showConnector: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: block.isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Don't render transit blocks as sortable
  if (block.type === 'transit') {
    return (
      <div ref={setNodeRef} style={style}>
        <TimeBlockCard
          block={block}
          isDragging={isDragging}
          showConnector={false}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TimeBlockCard
        block={block}
        orderNumber={index + 1}
        isDragging={isDragging}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
        onRemove={onRemove}
        onToggleLock={onToggleLock}
        onTimeChange={onTimeChange}
        dragHandleProps={{ ...attributes, ...listeners }}
        showConnector={showConnector}
      />
    </div>
  );
}

export default function TimelineCanvas({
  dayPlan,
  onBlocksChange,
  onBlockEdit,
  onBlockRemove,
  onAddPlace,
  onAddFlight,
  onAIPlan,
  onSmartOptimize,
  isAIPlanning,
  isOptimizing,
  startingLocation,
  className = '',
}: TimelineCanvasProps) {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Get non-transit blocks for ordering
  const activityBlocks = dayPlan.blocks.filter((b) => b.type !== 'transit');
  const activeBlock = activeId ? dayPlan.blocks.find((b) => b.id === activeId) : null;

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end - reorder and recalculate transit
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const oldIndex = activityBlocks.findIndex((b) => b.id === active.id);
      const newIndex = activityBlocks.findIndex((b) => b.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Reorder activity blocks
      const reorderedActivities = arrayMove(activityBlocks, oldIndex, newIndex);

      // Recalculate times based on new order
      const newBlocks = recalculateTimeline(reorderedActivities);
      onBlocksChange(newBlocks);
    },
    [activityBlocks, onBlocksChange]
  );

  // Recalculate timeline with transit blocks
  const recalculateTimeline = useCallback((activities: TimeBlock[]): TimeBlock[] => {
    const result: TimeBlock[] = [];
    let currentMinutes = parseTimeToMinutes(activities[0]?.startTime || '09:00');

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const prev = i > 0 ? activities[i - 1] : null;

      // Insert transit block between activities
      if (prev && prev.place && activity.place) {
        const fromCoords = prev.place.latitude && prev.place.longitude
          ? { lat: prev.place.latitude, lng: prev.place.longitude }
          : null;
        const toCoords = activity.place.latitude && activity.place.longitude
          ? { lat: activity.place.latitude, lng: activity.place.longitude }
          : null;

        if (fromCoords && toCoords) {
          const transit = estimateTransit(fromCoords, toCoords);

          if (transit.distanceKm >= 0.3) {
            const transitBlock: TimeBlock = {
              id: `transit_${prev.id}_${activity.id}`,
              type: 'transit',
              title: `To ${activity.title}`,
              durationMinutes: transit.durationMinutes,
              isLocked: false,
              startTime: formatTimeFromMinutes(currentMinutes),
              smartData: {
                transitMode: transit.mode,
                transitMinutes: transit.durationMinutes,
                transitDistanceKm: transit.distanceKm,
              },
            };
            result.push(transitBlock);
            currentMinutes += transit.durationMinutes;
          }
        }
      }

      // Update activity time
      const updatedActivity = {
        ...activity,
        startTime: formatTimeFromMinutes(currentMinutes),
        endTime: formatTimeFromMinutes(currentMinutes + activity.durationMinutes),
      };
      result.push(updatedActivity);
      currentMinutes += activity.durationMinutes;
    }

    return result;
  }, []);

  // Handle time change for a block
  const handleTimeChange = useCallback(
    (blockId: string, newTime: string) => {
      const updatedBlocks = dayPlan.blocks.map((b) =>
        b.id === blockId ? { ...b, startTime: newTime } : b
      );
      onBlocksChange(updatedBlocks);
    },
    [dayPlan.blocks, onBlocksChange]
  );

  // Handle toggle lock
  const handleToggleLock = useCallback(
    (blockId: string) => {
      const updatedBlocks = dayPlan.blocks.map((b) =>
        b.id === blockId ? { ...b, isLocked: !b.isLocked } : b
      );
      onBlocksChange(updatedBlocks);
    },
    [dayPlan.blocks, onBlocksChange]
  );

  // Handle smart route optimization (TSP-lite nearest neighbor)
  const handleSmartOptimize = useCallback(() => {
    if (onSmartOptimize) {
      onSmartOptimize();
      return;
    }

    // Client-side nearest neighbor optimization
    const activities = activityBlocks.filter((b) => !b.isLocked && b.place?.latitude && b.place?.longitude);
    const lockedBlocks = activityBlocks.filter((b) => b.isLocked);

    if (activities.length < 2) return;

    // Start from hotel/starting location or first block
    const start = startingLocation || (activities[0].place
      ? { lat: activities[0].place.latitude!, lng: activities[0].place.longitude! }
      : null);

    if (!start) return;

    // Nearest neighbor sort
    const sorted: TimeBlock[] = [];
    const remaining = [...activities];
    let current = start;

    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const block = remaining[i];
        if (!block.place?.latitude || !block.place?.longitude) continue;

        const dist = Math.sqrt(
          Math.pow(block.place.latitude - current.lat, 2) +
          Math.pow(block.place.longitude - current.lng, 2)
        );

        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const nearest = remaining.splice(nearestIdx, 1)[0];
      sorted.push(nearest);
      current = { lat: nearest.place!.latitude!, lng: nearest.place!.longitude! };
    }

    // Merge locked blocks back in their original positions
    const optimized = [...sorted, ...lockedBlocks];

    // Recalculate timeline with new order
    const newBlocks = recalculateTimeline(optimized);
    onBlocksChange(newBlocks);
  }, [activityBlocks, onBlocksChange, onSmartOptimize, startingLocation, recalculateTimeline]);

  // Handle auto-fill gaps
  const handleAutoFill = useCallback(() => {
    const suggestions = fillGapsInTimeline(dayPlan.blocks);
    if (suggestions.length > 0) {
      const filledBlocks = applyFillSuggestions(dayPlan.blocks, suggestions);
      const recalculated = recalculateTimeline(filledBlocks.filter(b => b.type !== 'transit'));
      onBlocksChange(recalculated);
    }
  }, [dayPlan.blocks, onBlocksChange, recalculateTimeline]);

  // Stats display
  const stats = dayPlan.stats;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Stats Bar */}
      <div className="px-4 py-3 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          {dayPlan.date && (
            <p className="text-xs text-gray-500">{new Date(dayPlan.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          )}

          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {stats.activityCount} places
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {Math.floor(stats.totalPlannedMinutes / 60)}h planned
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (stats.totalPlannedMinutes / (10 * 60)) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{Math.floor(stats.totalPlannedMinutes / 60)}h of activities</span>
          <span>{Math.floor(stats.freeTimeMinutes / 60)}h free</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        {activityBlocks.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activityBlocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {dayPlan.blocks.map((block, idx) => {
                  // Skip transit blocks in sortable context (they're rendered inline)
                  if (block.type === 'transit') {
                    return (
                      <TimeBlockCard
                        key={block.id}
                        block={block}
                        showConnector={false}
                      />
                    );
                  }

                  const activityIndex = activityBlocks.findIndex((b) => b.id === block.id);
                  const nextBlock = dayPlan.blocks[idx + 1];
                  const showConnector = nextBlock && nextBlock.type !== 'transit';

                  return (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      index={activityIndex}
                      isExpanded={expandedBlockId === block.id}
                      onToggleExpand={() =>
                        setExpandedBlockId(expandedBlockId === block.id ? null : block.id)
                      }
                      onEdit={() => onBlockEdit?.(block)}
                      onRemove={() => onBlockRemove?.(block.id)}
                      onToggleLock={() => handleToggleLock(block.id)}
                      onTimeChange={(time) => handleTimeChange(block.id, time)}
                      showConnector={showConnector}
                    />
                  );
                })}
              </div>
            </SortableContext>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeBlock && activeBlock.type !== 'transit' && (
                <TimeBlockCard
                  block={activeBlock}
                  isDragging
                  orderNumber={activityBlocks.findIndex((b) => b.id === activeBlock.id) + 1}
                />
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Empty State */
          <div className="text-center py-12 px-6 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-950">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
              Plan Day {dayPlan.dayNumber}
            </h3>
            <p className="text-xs text-gray-500 mb-6 max-w-xs mx-auto">
              Add places to your itinerary or let AI help you build the perfect day.
            </p>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center gap-2">
        <button
          onClick={onAddPlace}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Place
        </button>
        <button
          onClick={onAddFlight}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Add flight"
        >
          <Plane className="w-4 h-4" />
        </button>
        {/* Smart Optimize Button - TSP-lite nearest neighbor */}
        <button
          onClick={handleSmartOptimize}
          disabled={isOptimizing || activityBlocks.length < 2}
          className="px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50 transition-colors"
          title="Optimize route order"
        >
          <Zap className={`w-4 h-4 ${isOptimizing ? 'animate-pulse' : ''}`} />
        </button>
        {onAIPlan && (
          <button
            onClick={onAIPlan}
            disabled={isAIPlanning}
            className="px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all"
            title="AI Plan"
          >
            <Sparkles className={`w-4 h-4 ${isAIPlanning ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
