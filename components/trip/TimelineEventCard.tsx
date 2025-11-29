'use client';

import { useState } from 'react';
import { Check, Plus, ChevronRight } from 'lucide-react';
import { formatDuration } from '@/lib/utils/time-calculations';

export type TimelineEventType =
  | 'morning'
  | 'task'
  | 'work'
  | 'meal'
  | 'travel'
  | 'leisure'
  | 'default';

export interface TimelineSubItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface TimelineEventCardProps {
  id: string;
  title: string;
  icon?: string;
  duration: number; // in minutes
  type?: TimelineEventType;
  subItems?: TimelineSubItem[];
  scheduledItems?: number;
  isExpanded?: boolean;
  onToggleSubItem?: (itemId: string, subItemId: string) => void;
  onEdit?: (id: string) => void;
  onClick?: (id: string) => void;
  className?: string;
}

// Color schemes for different event types
const typeColors: Record<TimelineEventType, { bg: string; border: string; text: string }> = {
  morning: {
    bg: 'bg-white dark:bg-stone-900',
    border: 'border-stone-200 dark:border-stone-700',
    text: 'text-stone-900 dark:text-white',
  },
  task: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-900 dark:text-cyan-100',
  },
  work: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-900 dark:text-emerald-100',
  },
  meal: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-100',
  },
  travel: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100',
  },
  leisure: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-900 dark:text-purple-100',
  },
  default: {
    bg: 'bg-stone-50 dark:bg-stone-900',
    border: 'border-stone-200 dark:border-stone-700',
    text: 'text-stone-900 dark:text-white',
  },
};

/**
 * TimelineEventCard - A card representing an event in the visual timeline
 * Features colored backgrounds, icons, duration badges, and optional sub-items
 */
export default function TimelineEventCard({
  id,
  title,
  icon,
  duration,
  type = 'default',
  subItems,
  scheduledItems,
  isExpanded = true,
  onToggleSubItem,
  onEdit,
  onClick,
  className = '',
}: TimelineEventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = typeColors[type];

  const completedCount = subItems?.filter((item) => item.completed).length || 0;
  const totalSubItems = subItems?.length || 0;

  return (
    <div
      className={`
        relative rounded-xl border
        ${colors.bg} ${colors.border}
        transition-all duration-200
        ${isHovered ? 'shadow-md' : 'shadow-sm'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(id)}
    >
      {/* Main Card Content */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          {icon && (
            <span className="text-lg flex-shrink-0">{icon}</span>
          )}
          {/* Add Icon for task type */}
          {type === 'task' && !icon && (
            <div className="w-6 h-6 rounded-full bg-cyan-400 dark:bg-cyan-500 flex items-center justify-center flex-shrink-0">
              <Plus className="w-3.5 h-3.5 text-white" />
            </div>
          )}

          {/* Title */}
          <span className={`font-medium truncate ${colors.text}`}>
            {title}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`
            text-sm font-medium px-2 py-0.5 rounded-md
            ${type === 'task' ? 'text-cyan-600 dark:text-cyan-400' : ''}
            ${type === 'work' ? 'text-emerald-600 dark:text-emerald-400' : ''}
            ${type === 'morning' || type === 'default' ? 'text-stone-500 dark:text-stone-400' : ''}
            ${type === 'meal' ? 'text-amber-600 dark:text-amber-400' : ''}
            ${type === 'travel' ? 'text-blue-600 dark:text-blue-400' : ''}
            ${type === 'leisure' ? 'text-purple-600 dark:text-purple-400' : ''}
          `}>
            {formatDuration(duration)}
          </span>

          {/* Edit indicator on hover */}
          {isHovered && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(id);
              }}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-stone-400 dark:text-stone-500" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-items (like checklist items) */}
      {isExpanded && subItems && subItems.length > 0 && (
        <div className="px-3 pb-3 space-y-1.5">
          {subItems.map((subItem) => (
            <button
              key={subItem.id}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubItem?.(id, subItem.id);
              }}
              className="flex items-center gap-2 w-full text-left group/item"
            >
              <div className={`
                w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0
                transition-colors
                ${subItem.completed
                  ? 'bg-cyan-500 dark:bg-cyan-600'
                  : 'border-2 border-stone-300 dark:border-stone-600 group-hover/item:border-cyan-400'
                }
              `}>
                {subItem.completed && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </div>
              <span className={`
                text-sm transition-colors
                ${subItem.completed
                  ? 'text-stone-400 dark:text-stone-500 line-through'
                  : 'text-stone-600 dark:text-stone-300'
                }
              `}>
                {subItem.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Collapsed sub-items indicator */}
      {!isExpanded && subItems && subItems.length > 0 && (
        <div className="px-3 pb-2">
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {completedCount}/{totalSubItems} completed
          </span>
        </div>
      )}

      {/* Scheduled items count (for collapsed blocks) */}
      {scheduledItems && scheduledItems > 0 && (
        <div className="px-3 pb-3">
          <span className="text-sm text-stone-500 dark:text-stone-400">
            {scheduledItems} scheduled items
          </span>
        </div>
      )}
    </div>
  );
}
