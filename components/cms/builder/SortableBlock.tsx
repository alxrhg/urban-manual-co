'use client';

import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Copy,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  MoreHorizontal,
} from 'lucide-react';
import { usePageBuilder } from '@/contexts/PageBuilderContext';
import { BlockRenderer } from './BlockRenderer';
import type { CMSBlock, Breakpoint } from '@/types/cms';

interface SortableBlockProps {
  block: CMSBlock;
  isSelected: boolean;
  isHovered: boolean;
  showOutlines: boolean;
  breakpoint: Breakpoint;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  depth?: number;
}

export function SortableBlock({
  block,
  isSelected,
  isHovered,
  showOutlines,
  breakpoint,
  onSelect,
  onHover,
  depth = 0,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const {
    deleteBlock,
    duplicateBlock,
    updateBlock,
    getBlockDefinition,
    state,
  } = usePageBuilder();

  const definition = getBlockDefinition(block.type);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  }, [onSelect]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBlock(block.id);
  }, [block.id, deleteBlock]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateBlock(block.id);
  }, [block.id, duplicateBlock]);

  const handleToggleLock = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(block.id, { is_locked: !block.is_locked });
  }, [block.id, block.is_locked, updateBlock]);

  const handleToggleHidden = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    updateBlock(block.id, { is_hidden: !block.is_hidden });
  }, [block.id, block.is_hidden, updateBlock]);

  if (block.is_hidden && !showOutlines) {
    return null;
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`
        relative group
        ${showOutlines ? 'outline outline-1 outline-transparent' : ''}
        ${isSelected && showOutlines ? 'outline-blue-500 outline-2' : ''}
        ${isHovered && !isSelected && showOutlines ? 'outline-blue-300' : ''}
        ${block.is_hidden ? 'opacity-40' : ''}
        ${block.is_locked ? 'pointer-events-none' : ''}
      `}
      onClick={handleClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: block.is_hidden && !showOutlines ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      layout
    >
      {/* Block label */}
      {showOutlines && (isSelected || isHovered) && (
        <motion.div
          className={`
            absolute -top-6 left-0 px-2 py-0.5 text-xs font-medium rounded-t
            ${isSelected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}
          `}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.15 }}
        >
          {block.name || definition?.label || block.type}
        </motion.div>
      )}

      {/* Block toolbar */}
      {showOutlines && isSelected && !block.is_locked && (
        <motion.div
          className="absolute -top-6 right-0 flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.15 }}
        >
          {/* Drag handle */}
          <button
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5 text-gray-500" />
          </button>

          {/* Duplicate */}
          <button
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            onClick={handleDuplicate}
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5 text-gray-500" />
          </button>

          {/* Toggle visibility */}
          <button
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            onClick={handleToggleHidden}
            title={block.is_hidden ? 'Show' : 'Hide'}
          >
            {block.is_hidden ? (
              <EyeOff className="h-3.5 w-3.5 text-gray-500" />
            ) : (
              <Eye className="h-3.5 w-3.5 text-gray-500" />
            )}
          </button>

          {/* Toggle lock */}
          <button
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            onClick={handleToggleLock}
            title={block.is_locked ? 'Unlock' : 'Lock'}
          >
            <Lock className={`h-3.5 w-3.5 ${block.is_locked ? 'text-amber-500' : 'text-gray-500'}`} />
          </button>

          {/* Delete */}
          <button
            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </motion.div>
      )}

      {/* Lock indicator */}
      {block.is_locked && showOutlines && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/5 dark:bg-gray-100/5 pointer-events-none">
          <Lock className="h-6 w-6 text-gray-400" />
        </div>
      )}

      {/* Block content */}
      <BlockRenderer
        block={block}
        breakpoint={breakpoint}
        isEditing={isSelected && !state.isPreviewing}
      />
    </motion.div>
  );
}
