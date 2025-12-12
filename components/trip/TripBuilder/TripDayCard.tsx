'use client';

import { useState, useCallback, memo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sun,
  Cloud,
  CloudRain,
  Minus,
  Wand2,
  Route,
  Timer,
  Loader2,
} from 'lucide-react';
import { TripDayCardProps } from './types';
import { formatDuration, formatDate } from './utils';
import { useDragDrop } from './hooks';
import TripItemRow from './TripItemRow';
import { TripInsightsBar } from './TripInsightsBar';

/**
 * TripDayCard - A complete day section with items and actions
 *
 * Features:
 * - Collapsible header with weather indicator
 * - Drag-drop reordering of items
 * - Day insights display
 * - Quick actions (auto-schedule, optimize, suggest)
 * - Remove day functionality
 */
const TripDayCard = memo(function TripDayCard({
  day,
  dayCount,
  isExpanded,
  insights,
  isSuggesting,
  onToggle,
  onRemoveItem,
  onUpdateTime,
  onUpdateNotes,
  onMoveToDay,
  onOptimize,
  onAutoSchedule,
  onSuggestNext,
  onRemoveDay,
  onOpenDestination,
  onReorder,
  onInsightAction,
}: TripDayCardProps) {
  // Drag and drop state
  const { fromIndex, startDrag, updateDragOver, endDrag } = useDragDrop();

  // Handle drag end with reorder callback
  const handleDragEnd = useCallback(() => {
    endDrag(onReorder);
  }, [endDrag, onReorder]);

  // Weather icon helper
  const WeatherIcon = useCallback(() => {
    if (!day.weather) return null;

    if (day.weather.isRainy) {
      return <CloudRain className="w-4 h-4 text-blue-400" aria-label="Rainy" />;
    }
    if (day.weather.condition.includes('cloud')) {
      return <Cloud className="w-4 h-4 text-gray-400" aria-label="Cloudy" />;
    }
    return <Sun className="w-4 h-4 text-yellow-400" aria-label="Sunny" />;
  }, [day.weather]);

  return (
    <section
      className="border-b border-gray-100/60 dark:border-gray-800/60 last:border-0"
      aria-labelledby={`day-${day.dayNumber}-heading`}
    >
      {/* Day header */}
      <div className="flex items-center group">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          aria-expanded={isExpanded}
          aria-controls={`day-${day.dayNumber}-content`}
        >
          <div className="flex items-center gap-3">
            {/* Day number badge */}
            <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
              <span className="text-[13px] font-bold text-white dark:text-gray-900">
                {day.dayNumber}
              </span>
            </div>

            {/* Day info */}
            <div className="text-left">
              <p
                id={`day-${day.dayNumber}-heading`}
                className="text-[14px] font-medium text-gray-900 dark:text-white"
              >
                Day {day.dayNumber}
                {day.date && (
                  <span className="text-gray-400 font-normal ml-2">
                    {formatDate(day.date, 'medium')}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                {day.items.length} {day.items.length === 1 ? 'place' : 'places'}
                {day.totalTime > 0 && ` · ${formatDuration(day.totalTime)}`}
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {day.isOverstuffed && (
              <span className="text-[11px] text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Busy
              </span>
            )}
            <WeatherIcon />
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* Remove day button */}
        {dayCount > 1 && (
          <button
            onClick={onRemoveDay}
            className="p-2 mr-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            title="Remove day"
            aria-label={`Remove day ${day.dayNumber}`}
          >
            <Minus className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        )}
      </div>

      {/* Day content */}
      {isExpanded && (
        <div
          id={`day-${day.dayNumber}-content`}
          className="px-4 pb-4"
          role="list"
          aria-label={`Places for day ${day.dayNumber}`}
        >
          {/* Day insights */}
          <TripInsightsBar insights={insights} onAction={onInsightAction} />

          {/* Items or empty state */}
          {day.items.length === 0 ? (
            <DayEmptyState
              onSuggest={onSuggestNext}
              isSuggesting={isSuggesting}
            />
          ) : (
            <div className="space-y-2">
              {day.items.map((item, idx) => (
                <TripItemRow
                  key={item.id}
                  item={item}
                  index={idx}
                  currentDay={day.dayNumber}
                  totalDays={dayCount}
                  showTravelTime={idx > 0}
                  isDragging={fromIndex === idx}
                  onRemove={() => onRemoveItem(item.id)}
                  onTimeChange={(time) => onUpdateTime(item.id, time)}
                  onNotesChange={(notes) => onUpdateNotes(item.id, notes)}
                  onMoveToDay={(toDay) => onMoveToDay(item.id, toDay)}
                  onOpen={() => onOpenDestination(item.destination.slug)}
                  onDragStart={() => startDrag(idx)}
                  onDragOver={() => updateDragOver(idx)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}

          {/* Day actions */}
          {day.items.length > 0 && (
            <DayActions
              itemCount={day.items.length}
              isSuggesting={isSuggesting}
              onAutoSchedule={onAutoSchedule}
              onOptimize={onOptimize}
              onSuggestNext={onSuggestNext}
            />
          )}
        </div>
      )}
    </section>
  );
});

/**
 * Empty state for a day with no items
 */
function DayEmptyState({
  onSuggest,
  isSuggesting,
}: {
  onSuggest: () => void;
  isSuggesting: boolean;
}) {
  return (
    <div className="text-center py-8">
      <p className="text-[13px] text-gray-400 mb-4">No places added yet</p>
      <button
        onClick={onSuggest}
        disabled={isSuggesting}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
      >
        {isSuggesting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Wand2 className="w-3.5 h-3.5" />
        )}
        Suggest places
      </button>
    </div>
  );
}

/**
 * Action buttons for a day
 */
function DayActions({
  itemCount,
  isSuggesting,
  onAutoSchedule,
  onOptimize,
  onSuggestNext,
}: {
  itemCount: number;
  isSuggesting: boolean;
  onAutoSchedule: () => void;
  onOptimize: () => void;
  onSuggestNext: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <ActionButton
        icon={<Timer className="w-3.5 h-3.5" />}
        label="Auto-schedule"
        onClick={onAutoSchedule}
      />
      {itemCount >= 2 && (
        <ActionButton
          icon={<Route className="w-3.5 h-3.5" />}
          label="Optimize"
          onClick={onOptimize}
        />
      )}
      <ActionButton
        icon={
          isSuggesting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wand2 className="w-3.5 h-3.5" />
          )
        }
        label="Suggest next"
        onClick={onSuggestNext}
        disabled={isSuggesting}
      />
    </div>
  );
}

/**
 * Reusable action button
 */
function ActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
    >
      {icon}
      {label}
    </button>
  );
}

export default TripDayCard;
