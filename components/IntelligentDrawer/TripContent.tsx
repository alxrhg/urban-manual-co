'use client';

import { useState, useCallback, memo } from 'react';
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
  Sparkles,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  MoreHorizontal,
  Save,
  Share2,
  Trash2,
  Route,
} from 'lucide-react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { useIntelligentDrawer } from './IntelligentDrawerContext';
import { useAuth } from '@/contexts/AuthContext';
import { capitalizeCategory } from '@/lib/utils';

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

/**
 * TripContent - Full trip editor inside the intelligent drawer
 *
 * Features:
 * - Day-by-day itinerary with expand/collapse
 * - Drag-drop reordering (within days)
 * - Smart insights per day
 * - Trip health score
 * - Quick actions (save, share, optimize)
 * - Seamless destination opening
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

  const tripHealth = getTripHealth();

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

  // Handle save
  const handleSave = useCallback(async () => {
    if (!user) return;
    setIsSaving(true);
    await saveTrip();
    setIsSaving(false);
  }, [user, saveTrip]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!activeTrip?.id) return;
    const url = `${window.location.origin}/trips/${activeTrip.id}`;
    await navigator.clipboard.writeText(url);
  }, [activeTrip]);

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
          Start browsing destinations and add them to create your trip
        </p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Trip Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-1">
              {activeTrip.title}
            </h2>
            <div className="flex items-center gap-3 text-[13px] text-gray-500">
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
            </div>
          </div>

          {/* Actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={() => {
                    handleSave();
                    setShowActions(false);
                  }}
                  disabled={isSaving || !user}
                  className="w-full px-3 py-2 text-left text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Trip'}
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
                  Clear Trip
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trip Health */}
        {totalItems > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
                Trip Health
              </span>
              <span
                className={`text-[12px] font-semibold ${
                  tripHealth.score >= 80
                    ? 'text-green-600'
                    : tripHealth.score >= 60
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {tripHealth.label} ({tripHealth.score}%)
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  tripHealth.score >= 80
                    ? 'bg-green-500'
                    : tripHealth.score >= 60
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${tripHealth.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Days */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {activeTrip.days.map((day) => {
          const isExpanded = expandedDays.has(day.dayNumber);
          const insights = getDayInsights(day.dayNumber);

          return (
            <div key={day.dayNumber}>
              {/* Day Header */}
              <button
                onClick={() => toggleDay(day.dayNumber)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center text-[13px] font-semibold">
                    {day.dayNumber}
                  </div>
                  <div className="text-left">
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                      Day {day.dayNumber}
                    </p>
                    <p className="text-[12px] text-gray-500">
                      {day.items.length} place{day.items.length !== 1 ? 's' : ''}
                      {day.date && ` · ${formatDateString(day.date)}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {insights.length > 0 && (
                    <div
                      className={`w-2 h-2 rounded-full ${
                        insights.some((i) => i.type === 'warning')
                          ? 'bg-amber-500'
                          : insights.some((i) => i.type === 'success')
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                    />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Day Content */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  {/* Insights */}
                  {insights.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {insights.slice(0, 2).map((insight, i) => (
                        <InsightPill key={i} insight={insight} />
                      ))}
                    </div>
                  )}

                  {/* Items */}
                  {day.items.length > 0 ? (
                    <div className="space-y-2">
                      {day.items.map((item, idx) => (
                        <TripItemCard
                          key={item.id}
                          item={item}
                          index={idx}
                          showTravelTime={idx > 0 && !!item.travelTimeFromPrev && item.travelTimeFromPrev > 5}
                          onOpen={() => handleOpenDestination(item.destination)}
                          onRemove={() => removeFromTrip(item.id)}
                          onUpdateTime={(time) => updateItemTime(item.id, time)}
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

                  {/* Day Actions */}
                  {day.items.length > 1 && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => optimizeDay(day.dayNumber)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Route className="w-3.5 h-3.5" />
                        Optimize Route
                      </button>
                      <button
                        onClick={() => autoScheduleDay(day.dayNumber)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gray-100 dark:bg-white/10 text-[12px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Auto-Schedule
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Day */}
      <button
        onClick={addDay}
        className="w-full px-5 py-4 flex items-center justify-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Day
      </button>
    </div>
  );
});

/**
 * Individual trip item card
 */
function TripItemCard({
  item,
  index,
  showTravelTime,
  onOpen,
  onRemove,
  onUpdateTime,
}: {
  item: any;
  index: number;
  showTravelTime?: boolean;
  onOpen: () => void;
  onRemove: () => void;
  onUpdateTime: (time: string) => void;
}) {
  const [isEditingTime, setIsEditingTime] = useState(false);

  const image = item.destination?.image || item.destination?.image_thumbnail;

  return (
    <>
      {/* Travel time connector */}
      {showTravelTime && (
        <div className="flex items-center gap-2 py-1 px-2 text-[11px] text-gray-400">
          <Navigation className="w-3 h-3" />
          <span>{item.travelTimeFromPrev} min walk</span>
        </div>
      )}

      {/* Item card */}
      <div className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
        {/* Time */}
        <div className="w-12 text-center flex-shrink-0">
          {isEditingTime ? (
            <input
              type="time"
              defaultValue={item.timeSlot || ''}
              onBlur={(e) => {
                onUpdateTime(e.target.value);
                setIsEditingTime(false);
              }}
              autoFocus
              className="w-full text-[11px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5"
            />
          ) : (
            <button
              onClick={() => setIsEditingTime(true)}
              className="text-[12px] font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
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

        {/* Info */}
        <button onClick={onOpen} className="flex-1 text-left min-w-0">
          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
            {item.destination?.name || 'Unknown'}
          </p>
          <p className="text-[11px] text-gray-500 truncate">
            {capitalizeCategory(item.destination?.category || '')}
          </p>
        </button>

        {/* Actions */}
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
        </button>
      </div>
    </>
  );
}

/**
 * Insight pill component
 */
function InsightPill({ insight }: { insight: any }) {
  const icons = {
    clock: Clock,
    route: Navigation,
    food: Sparkles,
    weather: AlertCircle,
    category: Lightbulb,
    crowd: AlertCircle,
  };
  const Icon = icons[insight.icon as keyof typeof icons] || Lightbulb;

  const colors = {
    warning: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    tip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    success: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] ${
        colors[insight.type as keyof typeof colors]
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{insight.message}</span>
      {insight.action && (
        <button className="font-medium hover:underline">{insight.action}</button>
      )}
    </div>
  );
}

export default TripContent;
