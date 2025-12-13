'use client';

import { useDroppable } from '@dnd-kit/core';
import { ReactNode } from 'react';

interface DayDropZoneProps {
  dayNumber: number;
  children: ReactNode;
  className?: string;
}

/**
 * DayDropZone - A wrapper that makes any content a valid drop target for bucket list items
 */
export default function DayDropZone({ dayNumber, children, className = '' }: DayDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-drop-${dayNumber}`,
    data: {
      type: 'day',
      dayNumber,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        transition-all duration-200
        ${isOver ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-950 rounded-2xl' : ''}
        ${className}
      `}
    >
      {children}
      {isOver && (
        <div className="mt-2 p-3 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Drop here to add to Day {dayNumber}
          </p>
        </div>
      )}
    </div>
  );
}
