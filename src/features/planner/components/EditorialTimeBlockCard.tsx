'use client';

import { memo } from 'react';
import Image from 'next/image';
import { MoreVertical, Users } from 'lucide-react';
import type { TimeBlock } from '@/lib/intelligence/types';

interface EditorialTimeBlockCardProps {
  block: TimeBlock;
  active?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onMoreActions?: () => void;
  dragHandleProps?: any;
}

/**
 * EditorialTimeBlockCard - Lovably 'Flat, Square-Image' Style
 * Minimalist editorial typography with grayscale images
 */
export const EditorialTimeBlockCard = memo(function EditorialTimeBlockCard({
  block,
  active,
  onEdit,
  onRemove,
  onMoreActions,
  dragHandleProps,
}: EditorialTimeBlockCardProps) {
  const startTime = block.startTime || '--:--';
  const isBusy =
    block.smartData?.crowdLevel === 'high' ||
    block.smartData?.crowdLevel === 'very_high';

  // Skip transit blocks in editorial view
  if (block.type === 'transit') {
    return null;
  }

  return (
    <div
      className={`
        group flex gap-4 p-4 transition-colors cursor-pointer
        ${active
          ? 'bg-gray-50 dark:bg-gray-900'
          : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
        }
      `}
      onClick={onEdit}
      {...dragHandleProps}
    >
      {/* 1. Minimal Time Column */}
      <div className="w-12 text-xs font-mono text-gray-400 dark:text-gray-600 pt-1 flex-shrink-0">
        {startTime}
      </div>

      {/* 2. Square Visual (Lovably Style) */}
      <div className="relative h-16 w-16 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-sm overflow-hidden">
        {block.place?.image || block.place?.imageThumbnail ? (
          <Image
            src={block.place.imageThumbnail || block.place.image || ''}
            alt={block.title}
            fill
            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700 font-serif text-xl italic">
            {block.title.charAt(0)}
          </div>
        )}
      </div>

      {/* 3. Content - Editorial Typography */}
      <div className="flex-1 space-y-1 min-w-0">
        <h3 className="font-serif text-lg leading-tight text-gray-900 dark:text-white truncate">
          {block.title}
        </h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-widest">
          {block.category || block.type}
        </p>

        {/* Intelligence Badge (Minimal) */}
        {isBusy && (
          <span className="inline-flex items-center gap-1 text-[10px] border border-gray-200 dark:border-gray-800 px-2 py-0.5 rounded-full text-gray-400 dark:text-gray-600">
            <Users className="w-2.5 h-2.5" />
            Busy at {startTime}
          </span>
        )}
      </div>

      {/* 4. Action (Hidden until hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoreActions?.();
          }}
          className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default EditorialTimeBlockCard;
