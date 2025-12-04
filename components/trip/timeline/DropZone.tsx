'use client';

import { useState, useCallback, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { formatMinutesToTime, formatTimeDisplay } from '@/lib/utils/time-calculations';
import type { TimeGap } from './useItineraryItems';
import type { Destination } from '@/types/destination';

interface DropZoneProps {
  gap: TimeGap;
  onDrop: (destination: Destination) => void;
  children?: ReactNode;
  className?: string;
  minHeight?: number;
}

/**
 * DropZone - Interactive area for dropping destinations into timeline gaps
 * Shows visual feedback when hovering and contains suggestion chips
 */
export function DropZone({
  gap,
  onDrop,
  children,
  className = '',
  minHeight = 60,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);
      setIsDragActive(false);

      // Try to get destination data from the drop
      const destinationData = e.dataTransfer.getData('application/json');
      if (destinationData) {
        try {
          const destination = JSON.parse(destinationData) as Destination;
          onDrop(destination);
        } catch (err) {
          console.error('Failed to parse dropped destination:', err);
        }
      }
    },
    [onDrop]
  );

  const startTimeLabel = formatTimeDisplay(formatMinutesToTime(gap.startTime));
  const endTimeLabel = formatTimeDisplay(formatMinutesToTime(gap.endTime));

  return (
    <div
      className={`
        relative group
        ${className}
      `}
      style={{ minHeight }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone visual indicator */}
      <div
        className={`
          absolute inset-0 rounded-xl border-2 border-dashed
          transition-all duration-200
          ${isOver
            ? 'border-gray-400 dark:border-gray-500 bg-gray-100/50 dark:bg-gray-800/50'
            : 'border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700'
          }
        `}
      />

      {/* Time range label - subtle, shows on hover */}
      <div
        className={`
          absolute left-2 top-2
          text-[10px] text-gray-400 dark:text-gray-500
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
        `}
      >
        {startTimeLabel} – {endTimeLabel}
      </div>

      {/* Center content area */}
      <div className="relative flex flex-col items-center justify-center h-full py-3 px-4">
        {/* Add button - shows when empty or on hover */}
        {!children && (
          <button
            className={`
              flex items-center gap-1.5 px-3 py-1.5
              text-xs font-medium text-gray-400 dark:text-gray-500
              rounded-full
              transition-all duration-200
              opacity-0 group-hover:opacity-100
              hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800
            `}
          >
            <Plus className="w-3 h-3" />
            Add activity
          </button>
        )}

        {/* Children (suggestion chips, etc.) */}
        {children && (
          <div className="w-full">{children}</div>
        )}
      </div>

      {/* Drop indicator overlay */}
      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/5 dark:bg-white/5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg">
            <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Drop here
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
