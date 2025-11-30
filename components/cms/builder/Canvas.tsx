'use client';

import React, { useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageBuilder } from '@/contexts/PageBuilderContext';
import { BlockRenderer } from './BlockRenderer';
import { SortableBlock } from './SortableBlock';
import { CanvasEmptyState } from './CanvasEmptyState';
import type { Breakpoint } from '@/types/cms';

const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export function Canvas() {
  const {
    state,
    selectBlock,
    hoverBlock,
    moveBlock,
    getChildBlocks,
    dispatch,
  } = usePageBuilder();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const rootBlocks = getChildBlocks(undefined);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    dispatch({ type: 'SELECT_BLOCK', payload: active.id as string });
  }, [dispatch]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string || null);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const activeBlock = state.blocks.find((b) => b.id === active.id);
    const overBlock = state.blocks.find((b) => b.id === over.id);

    if (!activeBlock) return;

    // Determine new position
    let newParentId = overBlock?.parent_id;
    let newIndex = overBlock?.position ?? 0;

    // If dropping onto a container block, add as child
    if (overBlock) {
      const overDefinition = state.blocks.find((b) => b.id === over.id);
      // Check if over block can accept children (simplified check)
      if (['container', 'columns', 'grid', 'section'].includes(overBlock.type)) {
        newParentId = over.id as string;
        newIndex = getChildBlocks(over.id as string).length;
      }
    }

    moveBlock(active.id as string, newParentId, newIndex);
  }, [state.blocks, moveBlock, getChildBlocks]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas background
    if (e.target === canvasRef.current) {
      selectBlock(null);
    }
  }, [selectBlock]);

  const activeBlock = activeId ? state.blocks.find((b) => b.id === activeId) : null;

  // Canvas width based on breakpoint
  const canvasWidth = BREAKPOINT_WIDTHS[state.breakpoint];

  if (state.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-gray-100 rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading page...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900 p-8"
      onClick={handleCanvasClick}
    >
      <motion.div
        ref={canvasRef}
        className="mx-auto bg-white dark:bg-gray-950 shadow-xl rounded-lg overflow-hidden transition-all duration-300 ease-out"
        style={{
          width: canvasWidth,
          minHeight: 'calc(100vh - 200px)',
          transform: `scale(${state.zoom / 100})`,
          transformOrigin: 'top center',
        }}
        animate={{
          width: canvasWidth,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Grid overlay */}
        {state.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <SortableContext
            items={rootBlocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="relative min-h-full">
              {rootBlocks.length === 0 && !state.isPreviewing ? (
                <CanvasEmptyState />
              ) : (
                <AnimatePresence mode="popLayout">
                  {rootBlocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      isSelected={state.selectedBlockId === block.id}
                      isHovered={state.hoveredBlockId === block.id}
                      showOutlines={state.showOutlines && !state.isPreviewing}
                      breakpoint={state.breakpoint}
                      onSelect={() => selectBlock(block.id)}
                      onHover={(hover) => hoverBlock(hover ? block.id : null)}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </SortableContext>

          {/* Drag overlay for smooth dragging */}
          <DragOverlay
            adjustScale={false}
            dropAnimation={{
              duration: 250,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeBlock && (
              <motion.div
                className="opacity-90 shadow-2xl rounded-lg"
                initial={{ scale: 1 }}
                animate={{ scale: 1.02, rotate: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <BlockRenderer
                  block={activeBlock}
                  breakpoint={state.breakpoint}
                  isPreview
                />
              </motion.div>
            )}
          </DragOverlay>
        </DndContext>
      </motion.div>
    </div>
  );
}
