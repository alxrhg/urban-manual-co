'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GapInsertionZoneProps {
  /** Callback when user clicks to insert at this position */
  onInsert: () => void;
  /** Whether the zone is currently active/expanded */
  isActive?: boolean;
  /** Additional class names */
  className?: string;
  /** Text to show (optional, defaults to "Add stop") */
  label?: string;
}

/**
 * GapInsertionZone - Interactive gap between itinerary items
 *
 * Appears on hover to allow quick insertion of items at that position.
 * Uses expand animation to feel natural without being intrusive.
 *
 * Usage:
 * ```tsx
 * <GapInsertionZone
 *   onInsert={() => handleAddItem(afterIndex)}
 * />
 * ```
 */
export function GapInsertionZone({
  onInsert,
  isActive = false,
  className,
  label = 'Add stop',
}: GapInsertionZoneProps) {
  const [isHovered, setIsHovered] = useState(false);
  const showExpanded = isHovered || isActive;

  return (
    <div
      className={cn(
        'relative group',
        'py-1',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible hit area for better UX */}
      <div className="absolute inset-0 -my-2" />

      {/* The actual insertion zone */}
      <div
        className={cn(
          'relative flex items-center justify-center',
          'transition-all duration-200 ease-out',
          showExpanded ? 'h-10' : 'h-2'
        )}
      >
        {/* Horizontal line indicator */}
        <div
          className={cn(
            'absolute left-4 right-4 h-px',
            'transition-all duration-200',
            showExpanded
              ? 'bg-blue-400 dark:bg-blue-500'
              : 'bg-transparent group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
          )}
        />

        {/* Add button - appears on hover/active */}
        <button
          onClick={onInsert}
          className={cn(
            'relative z-10',
            'flex items-center gap-1.5 px-3 py-1.5',
            'text-xs font-medium',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'rounded-full',
            'shadow-sm',
            'transition-all duration-200 ease-out',
            'hover:border-blue-400 dark:hover:border-blue-500',
            'hover:text-blue-600 dark:hover:text-blue-400',
            'active:scale-95',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            showExpanded
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-90 pointer-events-none'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * GapInsertionIndicator - Minimal version that just shows a line
 *
 * For use cases where a full button is too heavy.
 */
export function GapInsertionIndicator({
  onInsert,
  className,
}: {
  onInsert: () => void;
  className?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onInsert}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative w-full py-2 -my-1',
        'group cursor-pointer',
        'focus-visible:outline-none',
        className
      )}
      aria-label="Insert item here"
    >
      {/* Line */}
      <div
        className={cn(
          'h-0.5 mx-4 rounded-full',
          'transition-all duration-200',
          isHovered
            ? 'bg-blue-400 dark:bg-blue-500'
            : 'bg-transparent group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
        )}
      />

      {/* Plus icon on hover */}
      <div
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-5 h-5 rounded-full',
          'flex items-center justify-center',
          'bg-blue-500 text-white',
          'transition-all duration-200',
          isHovered
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-75'
        )}
      >
        <Plus className="w-3 h-3" strokeWidth={2.5} />
      </div>
    </button>
  );
}

export default GapInsertionZone;
