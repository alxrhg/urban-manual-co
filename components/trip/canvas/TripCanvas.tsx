'use client';

import { useCallback } from 'react';
import { LayoutGroup } from 'framer-motion';
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
import { UrbanStudioProvider, useUrbanStudio } from './useUrbanStudio';
import type { Destination } from '@/types/destination';
import CanvasTimeline from './CanvasTimeline';
import StudioPanel from './StudioPanel';
import MorphingDragPreview from './MorphingDragPreview';

interface TripCanvasProps {
  destinations?: Destination[];
  city?: string;
}

function TripCanvasInner({ destinations = [], city }: TripCanvasProps) {
  const { activeTrip, addToTrip, moveItem, startTrip } = useTripBuilder();
  const { dragState, startDrag, updateDragOver, endDrag } = useUrbanStudio();

  // Configure sensors for pointer and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // Ensure trip exists when canvas loads
  const ensureTrip = useCallback(() => {
    if (!activeTrip && city) {
      startTrip(city, 3);
    }
  }, [activeTrip, city, startTrip]);

  // Handle drag start - store the dragged destination
  const handleDragStart = useCallback((event: DragStartEvent) => {
    ensureTrip();
    const { active } = event;
    const destination = active.data.current?.destination as Destination | undefined;
    if (destination) {
      startDrag(destination);
    }
  }, [ensureTrip, startDrag]);

  // Handle drag over - track which day we're hovering
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const dayNumber = over.data.current?.dayNumber as number | undefined;
      updateDragOver(dayNumber ?? null);
    } else {
      updateDragOver(null);
    }
  }, [updateDragOver]);

  // Handle drag end - add to trip or move item
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    const destination = dragState.activeDestination;
    endDrag();

    if (!over) return;

    const itemId = active.data.current?.itemId as string | undefined;
    const dayNumber = over.data.current?.dayNumber as number | undefined;

    if (!dayNumber) return;

    // If dragging from sidebar (new item)
    if (destination && !itemId) {
      addToTrip(destination, dayNumber);
    }
    // If moving existing item
    else if (itemId) {
      const toIndex = over.data.current?.index ?? 0;
      moveItem(itemId, dayNumber, toIndex);
    }
  }, [addToTrip, moveItem, dragState.activeDestination, endDrag]);

  const effectiveCity = city || activeTrip?.city || '';

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <LayoutGroup>
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
          {/* Left Panel - Timeline (The Canvas) */}
          <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
            <CanvasTimeline
              trip={activeTrip}
              overDayNumber={dragState.overDayNumber}
            />
          </div>

          {/* Center Divider with gradient */}
          <div className="w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

          {/* Right Panel - Studio Panel (Palette/Inspector) */}
          <div className="w-80 lg:w-96 overflow-y-auto">
            <StudioPanel
              city={effectiveCity}
              sourceDestinations={destinations}
            />
          </div>
        </div>
      </LayoutGroup>

      {/* Drag Overlay with Morphing Preview */}
      <DragOverlay dropAnimation={{
        duration: 250,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {dragState.activeDestination && (
          <MorphingDragPreview
            destination={dragState.activeDestination}
            isOverTimeline={dragState.overDayNumber !== null}
            dayNumber={dragState.overDayNumber}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default function TripCanvas(props: TripCanvasProps) {
  return (
    <UrbanStudioProvider>
      <TripCanvasInner {...props} />
    </UrbanStudioProvider>
  );
}
