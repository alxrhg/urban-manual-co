'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface InsertionPointProps {
  dayNumber: number;
  afterIndex: number;
  onInsert: (dayNumber: number, afterIndex: number) => void;
  className?: string;
}

/**
 * InsertionPoint - Shows "+ Add" button on hover between timeline items
 * Reveals itself on hover, triggers insertion callback when clicked
 */
export default function InsertionPoint({
  dayNumber,
  afterIndex,
  onInsert,
  className = '',
}: InsertionPointProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative h-6 group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hover area */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Visible line and button on hover */}
        <div
          className={`
            flex items-center gap-2 transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          {/* Left dashed line */}
          <div className="flex-1 h-px border-t border-dashed border-stone-300 dark:border-gray-600" />

          {/* Add button */}
          <button
            onClick={() => onInsert(dayNumber, afterIndex)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5
              bg-white dark:bg-gray-800
              border border-stone-200 dark:border-gray-700
              rounded-full
              text-xs font-medium text-stone-600 dark:text-gray-300
              hover:bg-stone-50 dark:hover:bg-gray-700
              hover:border-stone-300 dark:hover:border-gray-600
              hover:text-stone-900 dark:hover:text-white
              transition-all duration-200
              shadow-sm hover:shadow
            `}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>

          {/* Right dashed line */}
          <div className="flex-1 h-px border-t border-dashed border-stone-300 dark:border-gray-600" />
        </div>
      </div>

      {/* Always-visible subtle indicator (very faint) */}
      <div
        className={`
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          w-1.5 h-1.5 rounded-full
          bg-stone-200 dark:bg-gray-700
          transition-opacity duration-200
          ${isHovered ? 'opacity-0' : 'opacity-40'}
        `}
      />
    </div>
  );
}

/**
 * Compact insertion point for tight spaces
 * Just shows a "+" icon that expands on hover
 */
export function CompactInsertionPoint({
  dayNumber,
  afterIndex,
  onInsert,
  className = '',
}: InsertionPointProps) {
  return (
    <div className={`relative h-4 flex items-center justify-center group ${className}`}>
      <button
        onClick={() => onInsert(dayNumber, afterIndex)}
        className={`
          w-5 h-5 rounded-full
          flex items-center justify-center
          bg-transparent hover:bg-stone-100 dark:hover:bg-gray-800
          text-stone-300 dark:text-gray-600
          hover:text-stone-500 dark:hover:text-gray-400
          opacity-0 group-hover:opacity-100
          transition-all duration-200
          border border-transparent hover:border-stone-200 dark:hover:border-gray-700
        `}
        aria-label={`Add item after position ${afterIndex}`}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
