'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Plus, Clock } from 'lucide-react';
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

// Clean color schemes matching the calendar screenshot style
const typeColors: Record<TimelineEventType, { bg: string; text: string; duration: string }> = {
  morning: {
    bg: 'bg-white dark:bg-stone-800',
    text: 'text-stone-900 dark:text-white',
    duration: 'text-stone-400 dark:text-stone-500',
  },
  task: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/50',
    text: 'text-cyan-900 dark:text-cyan-100',
    duration: 'text-cyan-500 dark:text-cyan-400',
  },
  work: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-900 dark:text-emerald-100',
    duration: 'text-emerald-500 dark:text-emerald-400',
  },
  meal: {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-900 dark:text-amber-100',
    duration: 'text-amber-500 dark:text-amber-400',
  },
  travel: {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-900 dark:text-blue-100',
    duration: 'text-blue-500 dark:text-blue-400',
  },
  leisure: {
    bg: 'bg-purple-100 dark:bg-purple-900/50',
    text: 'text-purple-900 dark:text-purple-100',
    duration: 'text-purple-500 dark:text-purple-400',
  },
  hotel: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    text: 'text-indigo-900 dark:text-indigo-100',
    duration: 'text-indigo-500 dark:text-indigo-400',
  },
  default: {
    bg: 'bg-stone-100 dark:bg-stone-800',
    text: 'text-stone-900 dark:text-white',
    duration: 'text-stone-400 dark:text-stone-500',
  },
};

/**
 * TimelineEventCard - Clean calendar-style time block
 * Matches the simple, minimal design from the screenshot
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
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState(time || '09:00');
  const timeInputRef = useRef<HTMLInputElement>(null);
  const colors = typeColors[type];

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

  return (
    <div
      className={`
        h-full rounded-2xl overflow-hidden cursor-pointer
        ${colors.bg}
        ${isAutoExpanded ? 'opacity-80' : ''}
        ${className}
      `}
      onClick={() => onClick?.(id)}
    >
      {/* Header: Icon + Title + Duration */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Icon */}
          {icon && (
            <span className="text-base flex-shrink-0">{icon}</span>
          )}
          {/* Plus icon for task type */}
          {type === 'task' && !icon && (
            <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0">
              <Plus className="w-3 h-3 text-white" />
            </div>
          )}

          {/* Title */}
          <span className={`font-semibold truncate ${colors.text}`}>
            {title}
          </span>
        </div>

        {/* Duration Badge */}
        <span className={`text-sm font-medium flex-shrink-0 ml-2 ${colors.duration}`}>
          {formatDuration(duration)}
        </span>
      </div>

      {/* Time editor (only in edit mode) */}
      {isEditMode && onTimeChange && (
        <div className="px-3 pb-2">
          {isEditingTime ? (
            <input
              ref={timeInputRef}
              type="time"
              value={editTimeValue}
              onChange={(e) => setEditTimeValue(e.target.value)}
              onBlur={handleTimeSubmit}
              onKeyDown={handleTimeKeyDown}
              className="w-24 px-2 py-1 text-sm bg-white dark:bg-stone-700 border border-stone-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <button
              onClick={handleTimeClick}
              className="flex items-center gap-1.5 px-2 py-1 text-sm text-stone-500 dark:text-stone-400 bg-white/60 dark:bg-stone-700/60 rounded-lg hover:bg-white dark:hover:bg-stone-700 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {time ? formatTimeDisplay(time) : 'Set time'}
            </button>
          )}
        </div>
      )}

      {/* Sub-items with checkmarks */}
      {isExpanded && subItems && subItems.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {subItems.map((subItem) => (
            <button
              key={subItem.id}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubItem?.(id, subItem.id);
              }}
              className="flex items-center gap-2 w-full text-left"
            >
              <div className={`
                w-4 h-4 rounded flex items-center justify-center flex-shrink-0
                ${subItem.completed
                  ? 'bg-cyan-500'
                  : 'border-2 border-stone-300 dark:border-stone-500'
                }
              `}>
                {subItem.completed && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              <span className={`
                text-sm
                ${subItem.completed
                  ? 'text-stone-400 line-through'
                  : 'text-stone-600 dark:text-stone-300'
                }
              `}>
                {subItem.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Scheduled items count */}
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
