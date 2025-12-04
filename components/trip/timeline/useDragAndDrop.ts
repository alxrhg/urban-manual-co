'use client';

import { useState, useCallback, useRef } from 'react';
import type { ItineraryItemWithPosition, TimeGap } from './useItineraryItems';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

export interface DraggedItemState {
  item: ItineraryItemWithPosition;
  sourceIndex: number;
  currentPosition: { x: number; y: number };
}

export interface DropTarget {
  type: 'item' | 'gap';
  index: number;
  position: 'before' | 'after' | 'into';
}

interface UseDragAndDropOptions {
  items: ItineraryItemWithPosition[];
  gaps: TimeGap[];
  onReorder?: (items: EnrichedItineraryItem[]) => void;
  onDropInGap?: (item: ItineraryItemWithPosition, gap: TimeGap) => void;
  enabled?: boolean;
}

interface UseDragAndDropResult {
  draggedItem: DraggedItemState | null;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  handleDragStart: (item: ItineraryItemWithPosition, index: number, event: React.PointerEvent) => void;
  handleDragMove: (event: PointerEvent) => void;
  handleDragEnd: () => void;
  handleDrop: (item: ItineraryItemWithPosition, target: DropTarget) => void;
  getDropTargetForPosition: (y: number, itemPositions: { top: number; height: number }[]) => DropTarget | null;
}

/**
 * Hook for drag-and-drop functionality in the itinerary timeline
 * Supports reordering items and dropping items into gaps
 */
export function useDragAndDrop({
  items,
  gaps,
  onReorder,
  onDropInGap,
  enabled = true,
}: UseDragAndDropOptions): UseDragAndDropResult {
  const [draggedItem, setDraggedItem] = useState<DraggedItemState | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const startPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleDragStart = useCallback(
    (item: ItineraryItemWithPosition, index: number, event: React.PointerEvent) => {
      if (!enabled) return;

      startPositionRef.current = { x: event.clientX, y: event.clientY };
      setDraggedItem({
        item,
        sourceIndex: index,
        currentPosition: { x: event.clientX, y: event.clientY },
      });
    },
    [enabled]
  );

  const handleDragMove = useCallback(
    (event: PointerEvent) => {
      if (!draggedItem) return;

      setDraggedItem((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentPosition: { x: event.clientX, y: event.clientY },
        };
      });
    },
    [draggedItem]
  );

  const handleDragEnd = useCallback(() => {
    if (!draggedItem || !dropTarget) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    // Perform the reorder
    if (dropTarget.type === 'item' && onReorder) {
      const newItems = [...items];
      const [removed] = newItems.splice(draggedItem.sourceIndex, 1);

      let targetIndex = dropTarget.index;
      if (dropTarget.position === 'after') {
        targetIndex += 1;
      }
      // Adjust for removal
      if (draggedItem.sourceIndex < targetIndex) {
        targetIndex -= 1;
      }

      newItems.splice(targetIndex, 0, removed);
      onReorder(newItems);
    } else if (dropTarget.type === 'gap' && onDropInGap) {
      const gap = gaps[dropTarget.index];
      if (gap) {
        onDropInGap(draggedItem.item, gap);
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  }, [draggedItem, dropTarget, items, gaps, onReorder, onDropInGap]);

  const handleDrop = useCallback(
    (item: ItineraryItemWithPosition, target: DropTarget) => {
      if (target.type === 'item' && onReorder) {
        const currentIndex = items.findIndex((i) => i.id === item.id);
        if (currentIndex === -1) return;

        const newItems = [...items];
        const [removed] = newItems.splice(currentIndex, 1);

        let targetIndex = target.index;
        if (target.position === 'after') {
          targetIndex += 1;
        }
        if (currentIndex < targetIndex) {
          targetIndex -= 1;
        }

        newItems.splice(targetIndex, 0, removed);
        onReorder(newItems);
      } else if (target.type === 'gap' && onDropInGap) {
        const gap = gaps[target.index];
        if (gap) {
          onDropInGap(item, gap);
        }
      }
    },
    [items, gaps, onReorder, onDropInGap]
  );

  const getDropTargetForPosition = useCallback(
    (y: number, itemPositions: { top: number; height: number }[]): DropTarget | null => {
      // Check each item position
      for (let i = 0; i < itemPositions.length; i++) {
        const pos = itemPositions[i];
        const midpoint = pos.top + pos.height / 2;

        if (y < pos.top) {
          // Before this item
          return { type: 'item', index: i, position: 'before' };
        } else if (y < midpoint) {
          // Upper half of item - before
          return { type: 'item', index: i, position: 'before' };
        } else if (y < pos.top + pos.height) {
          // Lower half of item - after
          return { type: 'item', index: i, position: 'after' };
        }
      }

      // After last item
      if (itemPositions.length > 0) {
        return { type: 'item', index: itemPositions.length - 1, position: 'after' };
      }

      return null;
    },
    []
  );

  return {
    draggedItem,
    dropTarget,
    isDragging: draggedItem !== null,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDrop,
    getDropTargetForPosition,
  };
}
