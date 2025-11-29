'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Plus, ChevronRight, Clock } from 'lucide-react';
import { formatDuration, formatTimeDisplay } from '@/lib/utils/time-calculations';

export type TimelineEventType =
  | 'morning'
  | 'task'
  | 'work'
  | 'meal'
  | 'travel'
  | 'leisure'
  | 'hotel'
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
  time?: string; // HH:MM format
  duration: number; // in minutes
  type?: TimelineEventType;
  subItems?: TimelineSubItem[];
  scheduledItems?: number;
  isExpanded?: boolean;
  isEditMode?: boolean;
  isAutoExpanded?: boolean; // For hotels that expand to fill time
  onToggleSubItem?: (itemId: string, subItemId: string) => void;
  onTimeChange?: (id: string, time: string) => void;
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
  hotel: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-900 dark:text-indigo-100',
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
  time,
  duration,
  type = 'default',
  subItems,
  scheduledItems,
  isExpanded = true,
  isEditMode = false,
  isAutoExpanded = false,
  onToggleSubItem,
  onTimeChange,
  onEdit,
  onClick,
  className = '',
}: TimelineEventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState(time || '09:00');
  const timeInputRef = useRef<HTMLInputElement>(null);
  const colors = typeColors[type];

  const completedCount = subItems?.filter((item) => item.completed).length || 0;
  const totalSubItems = subItems?.length || 0;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTime && timeInputRef.current) {
      timeInputRef.current.focus();
      timeInputRef.current.select();
    }
  }, [isEditingTime]);

  const handleTimeClick = (e: React.MouseEvent) => {
    if (isEditMode && onTimeChange) {
      e.stopPropagation();
      setEditTimeValue(time || '09:00');
      setIsEditingTime(true);
    }
  };

  const handleTimeSubmit = () => {
    if (editTimeValue && onTimeChange) {
      onTimeChange(id, editTimeValue);
    }
    setIsEditingTime(false);
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTimeSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingTime(false);
      setEditTimeValue(time || '09:00');
    }
  };

  // Get duration color based on type
  const getDurationColor = () => {
    switch (type) {
      case 'task': return 'text-cyan-600 dark:text-cyan-400';
      case 'work': return 'text-emerald-600 dark:text-emerald-400';
      case 'meal': return 'text-amber-600 dark:text-amber-400';
      case 'travel': return 'text-blue-600 dark:text-blue-400';
      case 'leisure': return 'text-purple-600 dark:text-purple-400';
      case 'hotel': return 'text-indigo-600 dark:text-indigo-400';
      default: return 'text-stone-500 dark:text-stone-400';
    }
  };

  return (
    <div
      className={`
        relative rounded-xl border
        ${colors.bg} ${colors.border}
        transition-all duration-200
        ${isHovered ? 'shadow-md' : 'shadow-sm'}
        ${isAutoExpanded ? 'border-dashed' : ''}
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

          {/* Time (editable in edit mode) */}
          {isEditMode && onTimeChange && (
            <div className="flex-shrink-0">
              {isEditingTime ? (
                <input
                  ref={timeInputRef}
                  type="time"
                  value={editTimeValue}
                  onChange={(e) => setEditTimeValue(e.target.value)}
                  onBlur={handleTimeSubmit}
                  onKeyDown={handleTimeKeyDown}
                  className="w-20 px-1.5 py-0.5 text-sm font-medium bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-400 dark:focus:ring-stone-500"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  onClick={handleTimeClick}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-sm font-medium text-stone-600 dark:text-stone-300 bg-white/50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-md hover:bg-white dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600 transition-colors"
                >
                  <Clock className="w-3 h-3" />
                  {time ? formatTimeDisplay(time) : 'Set time'}
                </button>
              )}
            </div>
          )}

          {/* Title */}
          <span className={`font-medium truncate ${colors.text}`}>
            {title}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-sm font-medium px-2 py-0.5 rounded-md ${getDurationColor()}`}>
            {formatDuration(duration)}
            {isAutoExpanded && (
              <span className="ml-1 text-xs opacity-60">(until next)</span>
            )}
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
