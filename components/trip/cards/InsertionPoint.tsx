'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface InsertionPointProps {
  beforeItem: EnrichedItineraryItem | null;
  afterItem: EnrichedItineraryItem | null;
  onAddClick: () => void;
}

/**
 * InsertionPoint - Invisible hover target for adding items between existing items
 *
 * For gaps between items without travel connector (same location or minimal gap).
 * Appears as a dashed line with "+ Add" button on hover.
 */
export default function InsertionPoint({
  beforeItem: _beforeItem,
  afterItem: _afterItem,
  onAddClick,
}: InsertionPointProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAddClick}
      onKeyDown={(e) => e.key === 'Enter' && onAddClick()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="relative cursor-pointer -my-2 py-2 group"
      style={{ minHeight: '16px' }}
    >
      {/* Extended hover target area */}
      <div className="absolute inset-x-0 -inset-y-2" />

      {/* Visible content on hover */}
      <div
        className={`
          relative flex items-center justify-center h-8
          transition-opacity duration-150
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}
      >
        {/* Left dashed line */}
        <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600" />

        {/* Add button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddClick();
          }}
          className={`
            flex items-center gap-1 mx-3
            px-3 py-1 rounded-full text-xs font-medium
            bg-gray-900 dark:bg-white
            text-white dark:text-gray-900
            hover:bg-gray-800 dark:hover:bg-gray-100
            transition-colors duration-150
            shadow-sm
          `}
        >
          <Plus className="w-3 h-3" />
          Add
        </button>

        {/* Right dashed line */}
        <div className="flex-1 h-px border-t border-dashed border-gray-300 dark:border-gray-600" />
      </div>
    </div>
  );
}
