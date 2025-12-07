'use client';

import { useState, useCallback } from 'react';
import {
  X, MapPin, Clock, Navigation, AlertTriangle, Sun, Cloud, CloudRain,
  Sparkles, MoreHorizontal, Trash2, ChevronDown, ChevronUp, Save,
  Share2, Plus, Route, Calendar, Users, Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { useTripBuilder, TripItem, TripDay } from '@/contexts/TripBuilderContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from '@/lib/trip-intelligence';
import { capitalizeCategory } from '@/lib/utils';

// ============================================
// SUB-COMPONENTS
// ============================================

interface TripItemCardProps {
  item: TripItem;
  onRemove: () => void;
  onTimeChange: (time: string) => void;
  onOpen: () => void;
  showTravelTime?: boolean;
}

function TripItemCard({ item, onRemove, onTimeChange, onOpen, showTravelTime }: TripItemCardProps) {
  const [showTimeInput, setShowTimeInput] = useState(false);

  const getCrowdColor = (level?: number) => {
    if (!level) return 'text-gray-400';
    if (level < 30) return 'text-green-500';
    if (level < 60) return 'text-yellow-500';
    return 'text-red-500';
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

      <div className="group relative flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
        {/* Time slot */}
        <div className="flex-shrink-0 w-14 text-center">
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
              className="w-full text-[12px] bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-gray-900 dark:focus:border-white"
            />
          ) : (
            <button
              onClick={() => setShowTimeInput(true)}
              className="text-[13px] font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
            >
              {item.timeSlot || '--:--'}
            </button>
          )}
          <div className="text-[10px] text-gray-400 mt-0.5">
            {formatDuration(item.duration)}
          </div>
        </div>

        {/* Image */}
        <button
          onClick={onOpen}
          className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700"
        >
          {item.destination.image || item.destination.image_thumbnail ? (
            <Image
              src={item.destination.image_thumbnail || item.destination.image || ''}
              alt={item.destination.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-400" />
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
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </>
  );
}

interface DaySectionProps {
  day: TripDay;
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveItem: (itemId: string) => void;
  onTimeChange: (itemId: string, time: string) => void;
  onOptimize: () => void;
  onOpenDestination: (slug: string) => void;
}

function DaySection({
  day,
  isExpanded,
  onToggle,
  onRemoveItem,
  onTimeChange,
  onOptimize,
  onOpenDestination,
}: DaySectionProps) {
  const getWeatherIcon = () => {
    if (!day.weather) return null;
    if (day.weather.isRainy) return <CloudRain className="w-4 h-4 text-blue-400" />;
    if (day.weather.condition.includes('cloud')) return <Cloud className="w-4 h-4 text-gray-400" />;
    return <Sun className="w-4 h-4 text-yellow-400" />;
  };

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      {/* Day header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
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

      {/* Day content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {day.items.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-gray-400">
              No places added yet
            </div>
          ) : (
            <div className="space-y-2">
              {day.items.map((item, idx) => (
                <TripItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => onRemoveItem(item.id)}
                  onTimeChange={(time) => onTimeChange(item.id, time)}
                  onOpen={() => onOpenDestination(item.destination.slug)}
                  showTravelTime={idx > 0}
                />
              ))}
            </div>
          )}

          {/* Day actions */}
          {day.items.length >= 2 && (
            <button
              onClick={onOptimize}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Route className="w-3.5 h-3.5" />
              Optimize Route
            </button>
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
    isPanelOpen,
    isBuilding,
    removeFromTrip,
    updateItemTime,
    clearTrip,
    saveTrip,
    closePanel,
    optimizeDay,
    totalItems,
  } = useTripBuilder();

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(false);
  }, [user, saveTrip]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    if (activeTrip?.id) {
      const url = `${window.location.origin}/trips/${activeTrip.id}`;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } else {
      alert('Save your trip first to share it');
    }
  }, [activeTrip]);

  const handleOpenDestination = useCallback((slug: string) => {
    // Open destination drawer - dispatch event or use context
    const event = new CustomEvent('openDestination', { detail: { slug } });
    window.dispatchEvent(event);
  }, []);

  if (!isPanelOpen || !activeTrip) return null;

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
            <div>
              <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">
                {activeTrip.title}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {activeTrip.city}
                </span>
                {activeTrip.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(activeTrip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activeTrip.travelers}
                </span>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Stats bar */}
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
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 dark:text-white mb-2">
                Start adding places
              </h3>
              <p className="text-[13px] text-gray-500 mb-4">
                Browse destinations and click "Add to Trip" to build your itinerary
              </p>
              <button
                onClick={closePanel}
                className="px-4 py-2 text-[13px] font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              >
                Browse Destinations
              </button>
            </div>
          ) : (
            <div>
              {activeTrip.days.map((day) => (
                <DaySection
                  key={day.dayNumber}
                  day={day}
                  isExpanded={expandedDays.has(day.dayNumber)}
                  onToggle={() => toggleDay(day.dayNumber)}
                  onRemoveItem={removeFromTrip}
                  onTimeChange={updateItemTime}
                  onOptimize={() => optimizeDay(day.dayNumber)}
                  onOpenDestination={handleOpenDestination}
                />
              ))}

              {/* Add day button */}
              <button
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
