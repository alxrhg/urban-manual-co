'use client';

import { useState, useCallback, memo, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  GripVertical,
  X,
  Clock,
  Navigation,
  MoreHorizontal,
  Save,
  Share2,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { useAuth } from '@/contexts/AuthContext';
import { capitalizeCategory } from '@/lib/utils';

// ============================================
// SUBTLE INTELLIGENCE - Works automatically
// ============================================

interface DayAnalysis {
  pacingStatus: 'relaxed' | 'balanced' | 'packed' | 'overstuffed';
  pacingHint?: string;
  totalMinutes: number;
  hasTimeGap: boolean;
  gapHint?: string;
  isOptimized: boolean;
  routeHint?: string;
}

/**
 * Analyze a day's schedule automatically - no button needed
 */
function analyzeDayAutomatically(items: any[]): DayAnalysis {
  const totalMinutes = items.reduce((sum, item) => {
    // Estimate duration based on category
    const category = (item.destination?.category || '').toLowerCase();
    let duration = 60; // default
    if (category.includes('restaurant') || category.includes('dining')) duration = 90;
    else if (category.includes('museum') || category.includes('gallery')) duration = 120;
    else if (category.includes('cafe') || category.includes('coffee')) duration = 45;
    else if (category.includes('bar') || category.includes('club')) duration = 60;
    return sum + duration + (item.travelTimeFromPrev || 0);
  }, 0);

  const hours = totalMinutes / 60;

  let pacingStatus: DayAnalysis['pacingStatus'] = 'balanced';
  let pacingHint: string | undefined;

  if (hours > 12) {
    pacingStatus = 'overstuffed';
    pacingHint = 'Tight schedule';
  } else if (hours > 9) {
    pacingStatus = 'packed';
    pacingHint = 'Full day';
  } else if (hours < 4 && items.length > 0) {
    pacingStatus = 'relaxed';
    pacingHint = 'Light day';
  }

  // Check for time gaps
  const hasTimeGap = items.length >= 2 && items.some((item, idx) => {
    if (idx === 0) return false;
    const travelTime = item.travelTimeFromPrev || 0;
    return travelTime > 30; // More than 30 min gap
  });

  // Check if route could be optimized (simple heuristic)
  let isOptimized = true;
  let routeHint: string | undefined;
  if (items.length >= 3) {
    // Check if items are roughly in geographic order
    // This is a simple heuristic - a real optimizer would do TSP
    let totalBacktrack = 0;
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1].destination;
      const curr = items[i].destination;
      if (prev?.latitude && curr?.latitude) {
        // Simple check: if we're going back north after going south, might be suboptimal
        const latDiff = curr.latitude - prev.latitude;
        if (i >= 2) {
          const prevPrev = items[i - 2].destination;
          if (prevPrev?.latitude) {
            const prevLatDiff = prev.latitude - prevPrev.latitude;
            if ((latDiff > 0 && prevLatDiff < -0.01) || (latDiff < 0 && prevLatDiff > 0.01)) {
              totalBacktrack++;
            }
          }
        }
      }
    }
    if (totalBacktrack >= 2) {
      isOptimized = false;
      routeHint = 'Could reduce walking';
    }
  }

  return {
    pacingStatus,
    pacingHint,
    totalMinutes,
    hasTimeGap,
    gapHint: hasTimeGap ? 'Long walk between stops' : undefined,
    isOptimized,
    routeHint,
  };
}

// Helper to format date strings
function formatDateString(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Helper to format duration
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * TripContent - Intelligent trip editor with subtle automation
 *
 * Philosophy: Intelligence works automatically in the background.
 * No AI buttons, no prompts - optimization happens silently
 * and results appear naturally as part of the UI.
 *
 * Features:
 * - Inline time editing (tap to edit)
 * - Drag to reorder (grip handle)
 * - Automatic pacing analysis (no button)
 * - Subtle route optimization hints
 * - Contextual insights shown naturally
 */
const TripContent = memo(function TripContent() {
  const { user } = useAuth();
  const { navigate } = useIntelligentDrawer();
  const {
    activeTrip,
    removeFromTrip,
    updateItemTime,
    addDay,
    removeDay,
    reorderItems,
    saveTrip,
    clearTrip,
    optimizeDay,
    autoScheduleDay,
    getDayInsights,
    getTripHealth,
    totalItems,
  } = useTripBuilder();

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [isSaving, setIsSaving] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const tripHealth = getTripHealth();

  // Auto-save when trip changes (debounced)
  useEffect(() => {
    if (!user || !activeTrip?.isModified) return;

    const timer = setTimeout(async () => {
      await saveTrip();
      setRecentlySaved(true);
      setTimeout(() => setRecentlySaved(false), 2000);
    }, 3000); // Auto-save after 3 seconds of no changes

    return () => clearTimeout(timer);
  }, [activeTrip?.isModified, user, saveTrip]);

  // Analyze each day automatically
  const dayAnalyses = useMemo(() => {
    if (!activeTrip) return {};
    const analyses: Record<number, DayAnalysis> = {};
    activeTrip.days.forEach(day => {
      analyses[day.dayNumber] = analyzeDayAutomatically(day.items);
    });
    return analyses;
  }, [activeTrip]);

  // Toggle day expansion
  const toggleDay = useCallback((dayNumber: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  }, []);

  // Open destination in drawer
  const handleOpenDestination = useCallback(
    (destination: any) => {
      navigate('destination', { destination });
    },
    [navigate]
  );

  // Handle manual save
  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    await saveTrip();
    setIsSaving(false);
    setRecentlySaved(true);
    setTimeout(() => setRecentlySaved(false), 2000);
  }, [user, saveTrip]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!activeTrip?.id) return;
    const url = `${window.location.origin}/trips/${activeTrip.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: activeTrip.title, url });
      } catch {
        await navigator.clipboard.writeText(url);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [activeTrip]);

  // Handle item reorder via drag
  const handleDragStart = useCallback((itemId: string) => {
    setDraggingItemId(itemId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingItemId(null);
  }, []);

  // Apply optimization silently when user taps a subtle hint
  const handleSubtleOptimize = useCallback((dayNumber: number) => {
    optimizeDay(dayNumber);
  }, [optimizeDay]);

  if (!activeTrip) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-[15px] font-medium text-gray-900 dark:text-white mb-2">
          No active trip
        </p>
        <p className="text-[13px] text-gray-500 text-center">
          Browse destinations and tap + to start planning
        </p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Trip Header - Clean, minimal */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {activeTrip.title}
            </h2>
            <div className="flex items-center gap-3 text-[13px] text-gray-500 flex-wrap">
              {activeTrip.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {activeTrip.city}
                </span>
              )}
              {activeTrip.startDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateString(activeTrip.startDate)}
                </span>
              )}
              <span>{totalItems} places</span>
            </div>
          </div>

          {/* Save status & actions */}
          <div className="flex items-center gap-1">
            {/* Auto-save indicator - subtle */}
            {recentlySaved && (
              <span className="text-[11px] text-green-600 flex items-center gap-1 mr-2">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>
              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={() => {
                      handleSave();
                      setShowActions(false);
                    }}
                    disabled={isSaving || !user}
                    className="w-full px-3 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save now
                  </button>
                  <button
                    onClick={() => {
                      handleShare();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={() => {
                      clearTrip();
                      setShowActions(false);
                    }}
                    className="w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subtle trip health - only show if there's an issue */}
        {totalItems > 0 && tripHealth.score < 70 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            <span>{tripHealth.label}</span>
          </div>
        )}
      </div>

      {/* Days - Clean timeline style */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {activeTrip.days.map((day) => {
          const isExpanded = expandedDays.has(day.dayNumber);
          const analysis = dayAnalyses[day.dayNumber];
          const insights = getDayInsights(day.dayNumber);

          return (
            <div key={day.dayNumber}>
              {/* Day Header - Tap to expand */}
              <button
                onClick={() => toggleDay(day.dayNumber)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center text-[13px] font-semibold">
                    {day.dayNumber}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                        Day {day.dayNumber}
                      </p>
                      {/* Subtle pacing indicator */}
                      {analysis?.pacingHint && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          analysis.pacingStatus === 'overstuffed'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                            : analysis.pacingStatus === 'relaxed'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                        }`}>
                          {analysis.pacingHint}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-gray-500">
                      {day.items.length} place{day.items.length !== 1 ? 's' : ''}
                      {day.date && ` · ${formatDateString(day.date)}`}
                      {analysis && day.items.length > 0 && (
                        <span className="ml-1">· {formatDuration(analysis.totalMinutes)}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Subtle route hint - tap to fix */}
                  {analysis?.routeHint && !analysis.isOptimized && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubtleOptimize(day.dayNumber);
                      }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      {analysis.routeHint}
                    </button>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Day Content - Expanded */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  {/* Subtle insights - only genuinely useful ones */}
                  {insights.length > 0 && insights.some(i => i.type === 'warning') && (
                    <div className="mb-3 space-y-1.5">
                      {insights.filter(i => i.type === 'warning').slice(0, 1).map((insight, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                        >
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span className="flex-1">{insight.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Items - Editable timeline */}
                  {day.items.length > 0 ? (
                    <div className="space-y-1">
                      {day.items.map((item, idx) => (
                        <TripItemCard
                          key={item.id}
                          item={item}
                          index={idx}
                          showTravelTime={idx > 0 && !!item.travelTimeFromPrev && item.travelTimeFromPrev > 5}
                          isDragging={draggingItemId === item.id}
                          onOpen={() => handleOpenDestination(item.destination)}
                          onRemove={() => removeFromTrip(item.id)}
                          onUpdateTime={(time) => updateItemTime(item.id, time)}
                          onDragStart={() => handleDragStart(item.id)}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-[13px] text-gray-400 mb-2">No places yet</p>
                      <button
                        onClick={() => navigate('destination', {})}
                        className="text-[13px] font-medium text-gray-900 dark:text-white hover:underline"
                      >
                        Browse destinations
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Day - Simple */}
      <button
        onClick={addDay}
        className="w-full px-5 py-4 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add day
      </button>
    </div>
  );
});

/**
 * Individual trip item card with inline editing
 */
function TripItemCard({
  item,
  index,
  showTravelTime,
  isDragging,
  onOpen,
  onRemove,
  onUpdateTime,
  onDragStart,
  onDragEnd,
}: {
  item: any;
  index: number;
  showTravelTime?: boolean;
  isDragging?: boolean;
  onOpen: () => void;
  onRemove: () => void;
  onUpdateTime: (time: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [isEditingTime, setIsEditingTime] = useState(false);

  const image = item.destination?.image || item.destination?.image_thumbnail;

  return (
    <>
      {/* Travel time connector - subtle */}
      {showTravelTime && (
        <div className="flex items-center gap-2 py-1 pl-14 text-[10px] text-gray-400">
          <Navigation className="w-2.5 h-2.5" />
          <span>{item.travelTimeFromPrev} min</span>
        </div>
      )}

      {/* Item card - draggable, editable */}
      <div
        className={`group flex items-center gap-3 p-2.5 rounded-xl transition-all ${
          isDragging
            ? 'bg-blue-50 dark:bg-blue-900/20 scale-[1.02] shadow-lg'
            : 'hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
      >
        {/* Drag handle */}
        <button
          onMouseDown={onDragStart}
          onMouseUp={onDragEnd}
          onTouchStart={onDragStart}
          onTouchEnd={onDragEnd}
          className="p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-gray-300" />
        </button>

        {/* Time - tap to edit */}
        <div className="w-12 text-center flex-shrink-0">
          {isEditingTime ? (
            <input
              type="time"
              defaultValue={item.timeSlot || ''}
              onBlur={(e) => {
                onUpdateTime(e.target.value);
                setIsEditingTime(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateTime((e.target as HTMLInputElement).value);
                  setIsEditingTime(false);
                }
              }}
              autoFocus
              className="w-full text-[11px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <button
              onClick={() => setIsEditingTime(true)}
              className="text-[12px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Tap to edit time"
            >
              {item.timeSlot || '--:--'}
            </button>
          )}
        </div>

        {/* Thumbnail */}
        <button
          onClick={onOpen}
          className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0"
        >
          {image ? (
            <Image
              src={image}
              alt={item.destination?.name || ''}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </button>

        {/* Info - tap to view details */}
        <button onClick={onOpen} className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
            {item.destination?.name || 'Unknown'}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {capitalizeCategory(item.destination?.category || '')}
          </p>
        </button>

        {/* Remove - shows on hover */}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          title="Remove"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </>
  );
}

export default TripContent;
