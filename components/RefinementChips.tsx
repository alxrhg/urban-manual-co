'use client';

import { X } from 'lucide-react';
import { ChipGroup, FilterChip, type FilterChipTone } from '@/components/design-system/Chip';

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

const toneMap: Record<RefinementTag['type'], FilterChipTone> = {
  category: 'blue',
  city: 'gray',
  neighborhood: 'green',
  style: 'orange',
  price: 'yellow',
  modifier: 'neutral',
};

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

  return (
    <ChipGroup className={className}>
      {tags.map((tag, index) => {
        const isActive = activeTags.has(`${tag.type}-${tag.value}`);
        const tone = toneMap[tag.type] ?? 'gray';

        return (
          <div key={`${tag.type}-${tag.value}-${index}`} className="relative">
            <FilterChip
              label={tag.label}
              selected={isActive}
              tone={tone}
              onClick={() => onChipClick(tag)}
              aria-label={`Filter by ${tag.label}`}
              className={onChipRemove ? 'pr-7' : undefined}
            />
            {onChipRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChipRemove(tag);
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-500 transition hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                aria-label={`Remove ${tag.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </ChipGroup>
  );
}

