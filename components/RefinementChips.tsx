'use client';

import { X } from 'lucide-react';

export interface RefinementTag {
  type: 'category' | 'city' | 'neighborhood' | 'style' | 'price' | 'modifier';
  value: string;
  label: string;
}

interface RefinementChipsProps {
  tags: RefinementTag[];
  onChipClick: (tag: RefinementTag) => void;
  onChipRemove?: (tag: RefinementTag) => void;
  activeTags?: Set<string>;
  className?: string;
}

export function RefinementChips({
  tags,
  onChipClick,
  onChipRemove,
  activeTags = new Set(),
  className = '',
}: RefinementChipsProps) {
  if (tags.length === 0) {
    return null;
  }

  const getTagColor = (type: RefinementTag['type']) => {
    switch (type) {
      case 'category':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'city':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300';
      case 'neighborhood':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
      case 'style':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300';
      case 'price':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300';
      case 'modifier':
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag, index) => {
        const isActive = activeTags.has(`${tag.type}-${tag.value}`);
        const baseClasses = `inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-medium transition-all cursor-pointer ${
          isActive
            ? 'ring-2 ring-black dark:ring-white'
            : 'hover:scale-105 hover:shadow-sm'
        }`;
        const colorClasses = getTagColor(tag.type);

        return (
          <button
            key={`${tag.type}-${tag.value}-${index}`}
            onClick={() => onChipClick(tag)}
            className={`${baseClasses} ${colorClasses}`}
            aria-label={`Filter by ${tag.label}`}
          >
            <span>{tag.label}</span>
            {onChipRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChipRemove(tag);
                }}
                className="ml-0.5 hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </button>
        );
      })}
    </div>
  );
}

