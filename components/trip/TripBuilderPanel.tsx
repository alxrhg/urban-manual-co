'use client';

import { useState, useCallback, useRef } from 'react';
import {
  X, MapPin, Clock, Navigation, AlertTriangle, Sun, Cloud, CloudRain,
  Sparkles, MoreHorizontal, Trash2, ChevronDown, ChevronUp, Save,
  Share2, Plus, Route, Calendar, Users, Loader2, FolderOpen, ChevronRight,
  GripVertical, Pencil, MessageSquare, Wand2, Check, Minus, ArrowRight,
  Utensils, Zap, CheckCircle, Info, MoveVertical, Timer,
} from 'lucide-react';
import Image from 'next/image';
import { useTripBuilder, TripItem, TripDay, DayInsight } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from '@/lib/trip-intelligence';
import { capitalizeCategory } from '@/lib/utils';

// ============================================
// SUB-COMPONENTS
// ============================================

// Insight icon mapper
function getInsightIcon(icon: DayInsight['icon']) {
  switch (icon) {
    case 'clock': return <Clock className="w-3.5 h-3.5" />;
    case 'route': return <Route className="w-3.5 h-3.5" />;
    case 'crowd': return <Users className="w-3.5 h-3.5" />;
    case 'weather': return <CloudRain className="w-3.5 h-3.5" />;
    case 'food': return <Utensils className="w-3.5 h-3.5" />;
    case 'category': return <Sparkles className="w-3.5 h-3.5" />;
    default: return <Info className="w-3.5 h-3.5" />;
  }
}

function DayInsightsPanel({ insights, onAction }: { insights: DayInsight[]; onAction?: (action: string) => void }) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-3">
      {insights.map((insight, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${
            insight.type === 'warning'
              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              : insight.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
          }`}
        >
          {getInsightIcon(insight.icon)}
          <span className="flex-1">{insight.message}</span>
          {insight.action && onAction && (
            <button
              onClick={() => onAction(insight.action!)}
              className="px-2 py-0.5 rounded bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 font-medium transition-colors"
            >
              {insight.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TripHealthBadge({ score, label }: { score: number; label: string }) {
  const getColor = () => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    if (score >= 60) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    if (score >= 40) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
    return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
  };

  return (
    <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${getColor()}`}>
      {score}% {label}
    </div>
  );
}

interface TripItemCardProps {
  item: TripItem;
  index: number;
  currentDay: number;
  totalDays: number;
  onRemove: () => void;
  onTimeChange: (time: string) => void;
  onNotesChange: (notes: string) => void;
  onMoveToDay: (toDay: number) => void;
  onOpen: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  showTravelTime?: boolean;
}

function TripItemCard({
  item,
  index,
  currentDay,
  totalDays,
  onRemove,
  onTimeChange,
  onNotesChange,
  onMoveToDay,
  onOpen,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  showTravelTime,
}: TripItemCardProps) {
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteValue, setNoteValue] = useState(item.notes || '');
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const getCrowdColor = (level?: number) => {
    if (!level) return 'text-gray-400';
    if (level < 30) return 'text-green-500';
    if (level < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleSaveNotes = () => {
    onNotesChange(noteValue);
    setShowNotes(false);
  };

  return (
    <>
      {/* Travel time indicator */}
      {showTravelTime && item.travelTimeFromPrev && item.travelTimeFromPrev > 5 && (
        <div className="flex items-center gap-2 py-1.5 px-3 text-[11px] text-gray-400">
          <Navigation className="w-3 h-3" />
          <span>{formatDuration(item.travelTimeFromPrev)} travel</span>
        </div>
      )}

      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
        onDragEnd={onDragEnd}
        className={`group relative flex items-start gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-all ${
          isDragging ? 'opacity-50 scale-95' : ''
        }`}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity pt-2">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Time slot */}
        <div className="flex-shrink-0 w-12 text-center">
          {showTimeInput ? (
            <input
              type="time"
              value={item.timeSlot || ''}
              onChange={(e) => {
                onTimeChange(e.target.value);
                setShowTimeInput(false);
              }}
              onBlur={() => setShowTimeInput(false)}
              autoFocus
              className="w-full text-[11px] bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-900 dark:focus:border-white"
            />
          ) : (
            <button
              onClick={() => setShowTimeInput(true)}
              className="text-[12px] font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
            >
              {item.timeSlot || '--:--'}
            </button>
          )}
          <div className="text-[9px] text-gray-400 mt-0.5">
            {formatDuration(item.duration)}
          </div>
        </div>

        {/* Image */}
        <button
          onClick={onOpen}
          className="flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
        >
          {item.destination.image || item.destination.image_thumbnail ? (
            <Image
              src={item.destination.image_thumbnail || item.destination.image || ''}
              alt={item.destination.name}
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={onOpen}
            className="text-[13px] font-medium text-gray-900 dark:text-white truncate block text-left hover:underline"
          >
            {item.destination.name}
          </button>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            {capitalizeCategory(item.destination.category)}
          </p>

          {/* Status indicators */}
          <div className="flex items-center gap-2 mt-1">
            {item.crowdLabel && (
              <span className={`text-[10px] ${getCrowdColor(item.crowdLevel)}`}>
                {item.crowdLabel}
              </span>
            )}
            {item.isOutdoor && (
              <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                <Sun className="w-3 h-3" />
                Outdoor
              </span>
            )}
            {item.notes && !showNotes && (
              <button
                onClick={() => setShowNotes(true)}
                className="text-[10px] text-gray-400 flex items-center gap-0.5 hover:text-gray-600"
              >
                <MessageSquare className="w-3 h-3" />
                Note
              </button>
            )}
          </div>

          {/* Notes input */}
          {showNotes && (
            <div className="mt-2 flex gap-1">
              <input
                type="text"
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 text-[11px] px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:border-gray-400"
                autoFocus
              />
              <button
                onClick={handleSaveNotes}
                className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowNotes(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/20"
            title="Add note"
          >
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {totalDays > 1 && (
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-white/20"
              title="Move to day"
            >
              <MoveVertical className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Remove"
          >
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
          </button>

          {/* Move to day dropdown */}
          {showMoveMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="px-3 py-1 text-[10px] font-medium text-gray-400 uppercase">Move to</p>
              {Array.from({ length: totalDays }, (_, i) => i + 1)
                .filter(d => d !== currentDay)
                .map(dayNum => (
                  <button
                    key={dayNum}
                    onClick={() => {
                      onMoveToDay(dayNum);
                      setShowMoveMenu(false);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[12px] hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2"
                  >
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                    Day {dayNum}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface DaySectionProps {
  day: TripDay;
  dayCount: number;
  isExpanded: boolean;
  insights: DayInsight[];
  onToggle: () => void;
  onRemoveItem: (itemId: string) => void;
  onTimeChange: (itemId: string, time: string) => void;
  onNotesChange: (itemId: string, notes: string) => void;
  onMoveItemToDay: (itemId: string, toDay: number) => void;
  onOptimize: () => void;
  onAutoSchedule: () => void;
  onSuggestNext: () => void;
  onRemoveDay: () => void;
  onOpenDestination: (slug: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onInsightAction: (action: string) => void;
  isSuggesting: boolean;
}

function DaySection({
  day,
  dayCount,
  isExpanded,
  insights,
  onToggle,
  onRemoveItem,
  onTimeChange,
  onNotesChange,
  onMoveItemToDay,
  onOptimize,
  onAutoSchedule,
  onSuggestNext,
  onRemoveDay,
  onOpenDestination,
  onReorder,
  onInsightAction,
  isSuggesting,
}: DaySectionProps) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getWeatherIcon = () => {
    if (!day.weather) return null;
    if (day.weather.isRainy) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if (day.weather.condition.includes('cloud')) return <Cloud className="w-4 h-4 text-gray-400" />;
    return <Sun className="w-4 h-4 text-yellow-400" />;
  };

  const handleDragEnd = () => {
    if (dragFromIndex !== null && dragOverIndex !== null && dragFromIndex !== dragOverIndex) {
      onReorder(dragFromIndex, dragOverIndex);
    }
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Day header */}
      <div className="flex items-center group">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
              <span className="text-[13px] font-semibold text-white dark:text-gray-900">
                {day.dayNumber}
              </span>
            </div>
            <div className="text-left">
              <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                Day {day.dayNumber}
                {day.date && (
                  <span className="text-gray-400 font-normal ml-2">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-gray-500">
                {day.items.length} {day.items.length === 1 ? 'place' : 'places'}
                {day.totalTime > 0 && ` • ${formatDuration(day.totalTime)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {day.isOverstuffed && (
              <span className="text-[11px] text-amber-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Busy
              </span>
            )}
            {getWeatherIcon()}
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
            className="p-2 mr-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
            title="Remove day"
          >
            <Minus className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        )}
      </div>

      {/* Day content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Day insights */}
          <DayInsightsPanel insights={insights} onAction={onInsightAction} />

          {day.items.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[13px] text-gray-400 mb-3">No places added yet</p>
              <button
                onClick={onSuggestNext}
                disabled={isSuggesting}
                className="inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                {isSuggesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5" />
                )}
                Suggest places
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {day.items.map((item, idx) => (
                <TripItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  currentDay={day.dayNumber}
                  totalDays={dayCount}
                  onRemove={() => onRemoveItem(item.id)}
                  onTimeChange={(time) => onTimeChange(item.id, time)}
                  onNotesChange={(notes) => onNotesChange(item.id, notes)}
                  onMoveToDay={(toDay) => onMoveItemToDay(item.id, toDay)}
                  onOpen={() => onOpenDestination(item.destination.slug)}
                  onDragStart={setDragFromIndex}
                  onDragOver={setDragOverIndex}
                  onDragEnd={handleDragEnd}
                  isDragging={dragFromIndex === idx}
                  showTravelTime={idx > 0}
                />
              ))}
            </div>
          )}

          {/* Day actions */}
          {day.items.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={onAutoSchedule}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <Timer className="w-3 h-3" />
                Auto-schedule
              </button>
              {day.items.length >= 2 && (
                <button
                  onClick={onOptimize}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <Route className="w-3 h-3" />
                  Optimize
                </button>
              )}
              <button
                onClick={onSuggestNext}
                disabled={isSuggesting}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isSuggesting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                Suggest next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function TripBuilderPanel() {
  const { user } = useAuth();
  const {
    activeTrip,
    savedTrips,
    isPanelOpen,
    isBuilding,
    isLoadingTrips,
    isSuggestingNext,
    removeFromTrip,
    updateItemTime,
    updateItemNotes,
    addDay,
    removeDay,
    updateTripDetails,
    reorderItems,
    clearTrip,
    saveTrip,
    closePanel,
    optimizeDay,
    autoScheduleDay,
    moveItemToDay,
    getDayInsights,
    getTripHealth,
    suggestNextItem,
    addToTrip,
    switchToTrip,
    refreshSavedTrips,
    totalItems,
  } = useTripBuilder();

  // Get trip health for the header badge
  const tripHealth = getTripHealth();

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [isSaving, setIsSaving] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);

  const toggleDay = useCallback((day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) {
      // TODO: Show login prompt
      alert('Please sign in to save your trip');
      return;
    }
    setIsSaving(true);
    await saveTrip();
    await refreshSavedTrips(); // Refresh the list after saving
    setIsSaving(false);
  }, [user, saveTrip, refreshSavedTrips]);

  const handleShare = useCallback(() => {
    if (activeTrip?.id) {
      const url = `${window.location.origin}/trips/${activeTrip.id}`;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } else {
      alert('Save your trip first to share it');
    }
  }, [activeTrip]);

  const handleOpenDestination = useCallback((slug: string) => {
    const event = new CustomEvent('openDestination', { detail: { slug } });
    window.dispatchEvent(event);
  }, []);

  const handleSwitchTrip = useCallback(async (tripId: string) => {
    setShowTripSelector(false);
    await switchToTrip(tripId);
  }, [switchToTrip]);

  const handleSuggestNext = useCallback(async (dayNumber: number) => {
    const suggestion = await suggestNextItem(dayNumber);
    if (suggestion) {
      addToTrip(suggestion, dayNumber);
    }
  }, [suggestNextItem, addToTrip]);

  const handleTitleSave = useCallback(() => {
    if (editedTitle.trim()) {
      updateTripDetails({ title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  }, [editedTitle, updateTripDetails]);

  const handleDateChange = useCallback((date: string) => {
    updateTripDetails({ startDate: date });
    setIsEditingDate(false);
  }, [updateTripDetails]);

  const handleReorder = useCallback((dayNumber: number, fromIndex: number, toIndex: number) => {
    reorderItems(dayNumber, fromIndex, toIndex);
  }, [reorderItems]);

  const handleInsightAction = useCallback((dayNumber: number, action: string) => {
    switch (action) {
      case 'Auto-schedule':
        autoScheduleDay(dayNumber);
        break;
      case 'Optimize route':
        optimizeDay(dayNumber);
        break;
      case 'Move items':
        // Open panel for that day if not expanded
        setExpandedDays(prev => new Set([...prev, dayNumber]));
        break;
      case 'Add restaurant':
        handleSuggestNext(dayNumber);
        break;
      default:
        break;
    }
  }, [autoScheduleDay, optimizeDay, handleSuggestNext]);

  const handleMoveItemToDay = useCallback((itemId: string, fromDay: number, toDay: number) => {
    moveItemToDay(itemId, fromDay, toDay);
  }, [moveItemToDay]);

  // Show trip selector when no active trip but user is logged in
  if (!isPanelOpen) return null;

  // Show trip selector if no active trip but panel is open
  if (!activeTrip && user && savedTrips.length > 0) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
          onClick={closePanel}
        />
        <div className="fixed right-0 top-0 h-full w-full max-w-[380px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
          <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">
                Your Trips
              </h2>
              <button
                onClick={closePanel}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingTrips ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {savedTrips.map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => handleSwitchTrip(trip.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                        {trip.title}
                      </p>
                      <p className="text-[12px] text-gray-500 truncate">
                        {trip.destination} • {trip.itemCount} places
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (!activeTrip) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
        onClick={closePanel}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[380px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between mb-3">
            <div className="relative flex-1 min-w-0">
              {/* Editable title */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                    autoFocus
                    className="flex-1 text-[18px] font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-900 dark:focus:border-white"
                  />
                </div>
              ) : (
                <button
                  onClick={() => savedTrips.length > 0 && setShowTripSelector(!showTripSelector)}
                  className={`text-left ${savedTrips.length > 0 ? 'hover:opacity-80 cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white truncate">
                      {activeTrip.title}
                    </h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditedTitle(activeTrip.title);
                        setIsEditingTitle(true);
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-all"
                    >
                      <Pencil className="w-3 h-3 text-gray-400" />
                    </button>
                    {savedTrips.length > 0 && (
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTripSelector ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </button>
              )}

              {/* Trip meta info with editable date */}
              <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {activeTrip.city}
                </span>
                {isEditingDate ? (
                  <input
                    type="date"
                    value={activeTrip.startDate || ''}
                    onChange={(e) => handleDateChange(e.target.value)}
                    onBlur={() => setIsEditingDate(false)}
                    autoFocus
                    className="text-[12px] bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingDate(true)}
                    className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    <Calendar className="w-3 h-3" />
                    {activeTrip.startDate
                      ? new Date(activeTrip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'Set date'}
                  </button>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activeTrip.travelers}
                </span>
              </div>

              {/* Trip selector dropdown */}
              {showTripSelector && savedTrips.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="px-3 py-1 text-[11px] font-medium text-gray-400 uppercase">Switch Trip</p>
                  {savedTrips
                    .filter(t => t.id !== activeTrip.id)
                    .slice(0, 5)
                    .map(trip => (
                      <button
                        key={trip.id}
                        onClick={() => handleSwitchTrip(trip.id)}
                        className="w-full px-3 py-2 text-left text-[13px] hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{trip.title}</p>
                          <p className="text-[11px] text-gray-500">{trip.itemCount} places</p>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={closePanel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Stats bar with health score */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="text-center">
              <p className="text-[16px] font-semibold text-gray-900 dark:text-white">{totalItems}</p>
              <p className="text-[10px] text-gray-500">Places</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-[16px] font-semibold text-gray-900 dark:text-white">{activeTrip.days.length}</p>
              <p className="text-[10px] text-gray-500">Days</p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-[16px] font-semibold text-gray-900 dark:text-white">
                {formatDuration(activeTrip.days.reduce((sum, d) => sum + d.totalTime, 0))}
              </p>
              <p className="text-[10px] text-gray-500">Total</p>
            </div>
            {totalItems >= 3 && (
              <>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
                <TripHealthBadge score={tripHealth.score} label={tripHealth.label} />
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isBuilding ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-[14px] text-gray-500">Building your itinerary...</p>
            </div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mb-2">
                Ready to explore {activeTrip.city}?
              </h3>
              <p className="text-[13px] text-gray-500 mb-5 max-w-[240px]">
                Add places from the homepage or let AI suggest the perfect itinerary
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[200px]">
                <button
                  onClick={() => handleSuggestNext(1)}
                  disabled={isSuggestingNext}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isSuggestingNext ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Get AI suggestions
                </button>
                <button
                  onClick={closePanel}
                  className="w-full px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                >
                  Browse destinations
                </button>
              </div>
            </div>
          ) : (
            <div>
              {activeTrip.days.map((day) => (
                <DaySection
                  key={day.dayNumber}
                  day={day}
                  dayCount={activeTrip.days.length}
                  isExpanded={expandedDays.has(day.dayNumber)}
                  insights={getDayInsights(day.dayNumber)}
                  onToggle={() => toggleDay(day.dayNumber)}
                  onRemoveItem={removeFromTrip}
                  onTimeChange={updateItemTime}
                  onNotesChange={updateItemNotes}
                  onMoveItemToDay={(itemId, toDay) => handleMoveItemToDay(itemId, day.dayNumber, toDay)}
                  onOptimize={() => optimizeDay(day.dayNumber)}
                  onAutoSchedule={() => autoScheduleDay(day.dayNumber)}
                  onSuggestNext={() => handleSuggestNext(day.dayNumber)}
                  onRemoveDay={() => removeDay(day.dayNumber)}
                  onOpenDestination={handleOpenDestination}
                  onReorder={(from, to) => handleReorder(day.dayNumber, from, to)}
                  onInsightAction={(action) => handleInsightAction(day.dayNumber, action)}
                  isSuggesting={isSuggestingNext}
                />
              ))}

              {/* Add day button */}
              <button
                onClick={addDay}
                className="w-full p-4 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Day
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !activeTrip.isModified}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {activeTrip.id ? 'Update' : 'Save'} Trip
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Clear trip */}
          <button
            onClick={clearTrip}
            className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-red-500 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Trip
          </button>
        </div>
      </div>
    </>
  );
}
