'use client';

import { ReactNode } from 'react';
import TimelineItem from './TimelineItem';
import type { TimeBlock, DayPlan } from '@/services/intelligence/planner/types';

interface TimelineFeedProps {
  dayPlan: DayPlan;
  onBlockClick?: (block: TimeBlock) => void;
  onBlockEdit?: (block: TimeBlock) => void;
}

/**
 * TimelineFeed - Grouped list with vertical timeline
 * Lovably style: left border with dot markers
 */
export default function TimelineFeed({
  dayPlan,
  onBlockClick,
  onBlockEdit,
}: TimelineFeedProps) {
  // Group blocks by time of day
  const groupBlocks = (blocks: TimeBlock[]) => {
    const groups: { label: string; blocks: TimeBlock[] }[] = [];
    let currentGroup: { label: string; blocks: TimeBlock[] } | null = null;

    for (const block of blocks) {
      // Skip transit blocks in the feed view
      if (block.type === 'transit') continue;

      const hour = block.startTime
        ? parseInt(block.startTime.split(':')[0], 10)
        : 9;

      let label = 'Morning';
      if (hour >= 12 && hour < 17) label = 'Afternoon';
      else if (hour >= 17) label = 'Evening';

      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, blocks: [] };
        groups.push(currentGroup);
      }

      currentGroup.blocks.push(block);
    }

    return groups;
  };

  const groups = groupBlocks(dayPlan.blocks);

  // Format date for header
  const dateLabel = dayPlan.date
    ? new Date(dayPlan.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : `Day ${dayPlan.dayNumber}`;

  return (
    <div className="px-6 py-4">
      {/* Day Header */}
      <h2 className="font-serif text-3xl text-gray-900 dark:text-white mb-6">
        {dateLabel}
      </h2>

      {/* Timeline */}
      <div className="relative pl-6 border-l border-gray-200 dark:border-gray-800 ml-1">
        {groups.map((group, groupIdx) => (
          <div key={group.label} className="mb-8 last:mb-0">
            {/* Group Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm py-3 z-10 -ml-6 pl-6">
              <h3 className="font-serif text-xl italic text-gray-400 dark:text-gray-600">
                {group.label}
              </h3>
            </div>

            {/* Items */}
            {group.blocks.map((block, idx) => (
              <TimelineItem
                key={block.id}
                block={block}
                onClick={() => onBlockClick?.(block)}
                onEdit={() => onBlockEdit?.(block)}
                isLast={idx === group.blocks.length - 1 && groupIdx === groups.length - 1}
              />
            ))}
          </div>
        ))}

        {/* Empty State */}
        {groups.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-400 dark:text-gray-600 text-sm">
              No activities planned for this day
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
