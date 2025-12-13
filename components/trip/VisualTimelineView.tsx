'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Coffee,
  Utensils,
  Martini,
  Landmark,
  MapPin,
  Plane,
  Train,
  Camera,
  Clock,
  Navigation,
} from 'lucide-react';
import type { TripDay, EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  parseTimeToMinutes,
  formatMinutesToTime,
  formatTimeDisplay,
  formatDuration,
  estimateDuration,
} from '@/lib/utils/time-calculations';

interface VisualTimelineViewProps {
  day: TripDay;
  onEditItem?: (item: EnrichedItineraryItem) => void;
  activeItemId?: string | null;
}

interface TimelineBlock {
  id: string;
  type: 'activity' | 'travel' | 'free';
  startMinutes: number;
  endMinutes: number;
  duration: number;
  title: string;
  subtitle?: string;
  item?: EnrichedItineraryItem;
  category?: string;
}

// Get icon for item type
function getIconForCategory(category?: string) {
  switch (category) {
    case 'breakfast':
    case 'cafe':
      return <Coffee className="w-4 h-4" />;
    case 'restaurant':
      return <Utensils className="w-4 h-4" />;
    case 'bar':
    case 'nightlife':
      return <Martini className="w-4 h-4" />;
    case 'museum':
    case 'gallery':
    case 'attraction':
      return <Landmark className="w-4 h-4" />;
    case 'flight':
      return <Plane className="w-4 h-4" />;
    case 'train':
      return <Train className="w-4 h-4" />;
    case 'activity':
      return <Camera className="w-4 h-4" />;
    default:
      return <MapPin className="w-4 h-4" />;
  }
}

// Get category color classes
function getCategoryColors(category?: string): { bg: string; border: string; text: string } {
  switch (category) {
    case 'breakfast':
    case 'cafe':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-600 dark:text-amber-400',
      };
    case 'restaurant':
      return {
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-orange-200 dark:border-orange-800',
        text: 'text-orange-600 dark:text-orange-400',
      };
    case 'bar':
    case 'nightlife':
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-600 dark:text-purple-400',
      };
    case 'museum':
    case 'gallery':
    case 'attraction':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-600 dark:text-blue-400',
      };
    case 'flight':
    case 'train':
      return {
        bg: 'bg-sky-50 dark:bg-sky-900/20',
        border: 'border-sky-200 dark:border-sky-800',
        text: 'text-sky-600 dark:text-sky-400',
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-800/50',
        border: 'border-gray-200 dark:border-gray-700',
        text: 'text-gray-600 dark:text-gray-400',
      };
  }
}

// Estimate travel time between two locations (simplified)
function estimateTravelTime(
  from?: { latitude?: number; longitude?: number },
  to?: { latitude?: number; longitude?: number }
): number {
  if (!from?.latitude || !from?.longitude || !to?.latitude || !to?.longitude) {
    return 15; // Default 15 minutes if no coordinates
  }

  // Haversine distance in km
  const R = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Estimate: walking ~5km/h, so ~12 min/km, but cap at reasonable values
  const walkingMinutes = Math.round(distance * 12);
  return Math.max(5, Math.min(walkingMinutes, 45));
}

/**
 * VisualTimelineView - Clean visual timeline showing activities, travel, and free time
 * Shows time blocks proportionally to help visualize the day's schedule at a glance
 */
export default function VisualTimelineView({
  day,
  onEditItem,
  activeItemId,
}: VisualTimelineViewProps) {
  const formatDayDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return format(parseISO(dateStr), 'EEEE, MMMM d');
    } catch {
      return null;
    }
  };

  const formattedDate = formatDayDate(day.date);

  // Build timeline blocks from items
  const timelineBlocks = useMemo<TimelineBlock[]>(() => {
    const blocks: TimelineBlock[] = [];

    // Filter and sort items by time
    const sortedItems = [...day.items]
      .filter((item) => {
        // Exclude hotels from timeline (they're shown separately)
        if (item.parsedNotes?.type === 'hotel') return false;
        return true;
      })
      .map((item) => {
        const time = item.time || item.parsedNotes?.departureTime || '09:00';
        const startMinutes = parseTimeToMinutes(time);
        const category = item.parsedNotes?.type || item.parsedNotes?.category || item.destination?.category;
        const duration = item.parsedNotes?.duration || estimateDuration(category);
        return { item, startMinutes, duration, category };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);

    // Build blocks with travel time and free time gaps
    for (let i = 0; i < sortedItems.length; i++) {
      const current = sortedItems[i];
      const prev = i > 0 ? sortedItems[i - 1] : null;

      // Check if there's time between previous item and this one
      if (prev) {
        const prevEndMinutes = prev.startMinutes + prev.duration;
        const gapMinutes = current.startMinutes - prevEndMinutes;

        if (gapMinutes > 0) {
          // Estimate travel time
          const fromCoords = prev.item.destination || prev.item.parsedNotes;
          const toCoords = current.item.destination || current.item.parsedNotes;
          const travelTime = estimateTravelTime(
            fromCoords as { latitude?: number; longitude?: number },
            toCoords as { latitude?: number; longitude?: number }
          );

          // Add travel block
          if (travelTime > 0 && travelTime <= gapMinutes) {
            blocks.push({
              id: `travel-${prev.item.id}-${current.item.id}`,
              type: 'travel',
              startMinutes: prevEndMinutes,
              endMinutes: prevEndMinutes + travelTime,
              duration: travelTime,
              title: `${formatDuration(travelTime)} travel`,
              subtitle: 'to next stop',
            });

            // If there's remaining time after travel, it's free time
            const freeTimeMinutes = gapMinutes - travelTime;
            if (freeTimeMinutes >= 30) {
              blocks.push({
                id: `free-${prev.item.id}-${current.item.id}`,
                type: 'free',
                startMinutes: prevEndMinutes + travelTime,
                endMinutes: current.startMinutes,
                duration: freeTimeMinutes,
                title: 'Free Time',
                subtitle: formatDuration(freeTimeMinutes),
              });
            }
          } else if (gapMinutes >= 30) {
            // Just show as free time if gap is significant
            blocks.push({
              id: `free-${prev.item.id}-${current.item.id}`,
              type: 'free',
              startMinutes: prevEndMinutes,
              endMinutes: current.startMinutes,
              duration: gapMinutes,
              title: 'Free Time',
              subtitle: formatDuration(gapMinutes),
            });
          }
        }
      }

      // Add activity block
      blocks.push({
        id: current.item.id,
        type: 'activity',
        startMinutes: current.startMinutes,
        endMinutes: current.startMinutes + current.duration,
        duration: current.duration,
        title: current.item.title || 'Activity',
        subtitle: formatDuration(current.duration),
        item: current.item,
        category: current.category,
      });
    }

    return blocks;
  }, [day.items]);

  // Calculate visual properties
  const { minTime, maxTime, totalMinutes } = useMemo(() => {
    if (timelineBlocks.length === 0) {
      return { minTime: 9 * 60, maxTime: 18 * 60, totalMinutes: 9 * 60 };
    }

    const starts = timelineBlocks.map((b) => b.startMinutes);
    const ends = timelineBlocks.map((b) => b.endMinutes);
    const min = Math.min(...starts);
    const max = Math.max(...ends);

    // Round to nearest hour for cleaner display
    const roundedMin = Math.floor(min / 60) * 60;
    const roundedMax = Math.ceil(max / 60) * 60;

    return {
      minTime: roundedMin,
      maxTime: roundedMax,
      totalMinutes: roundedMax - roundedMin,
    };
  }, [timelineBlocks]);

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers: number[] = [];
    for (let hour = Math.floor(minTime / 60); hour <= Math.ceil(maxTime / 60); hour++) {
      markers.push(hour);
    }
    return markers;
  }, [minTime, maxTime]);

  // Calculate block height as percentage
  const getBlockHeight = (duration: number) => {
    const minHeight = 48; // Minimum height in pixels
    const pixelsPerMinute = 2;
    return Math.max(minHeight, duration * pixelsPerMinute);
  };

  if (day.items.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className="text-center py-8">
          <Clock className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No activities planned</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add stops to see the timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
          <span className="text-base font-semibold text-gray-900 dark:text-white">
            Day {day.dayNumber}
          </span>
          {formattedDate && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {day.items.filter((i) => i.parsedNotes?.type !== 'hotel').length} stops
        </span>
      </div>

      {/* Timeline Content */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Time Column */}
          <div className="flex-shrink-0 w-14 relative">
            {hourMarkers.map((hour) => {
              const position = ((hour * 60 - minTime) / totalMinutes) * 100;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ top: `${position}%` }}
                >
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                    {formatTimeDisplay(formatMinutesToTime(hour * 60))}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Timeline Blocks */}
          <div className="flex-1 relative" style={{ minHeight: `${totalMinutes * 2}px` }}>
            {/* Hour lines */}
            {hourMarkers.map((hour) => {
              const position = ((hour * 60 - minTime) / totalMinutes) * 100;
              return (
                <div
                  key={`line-${hour}`}
                  className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800/50"
                  style={{ top: `${position}%` }}
                />
              );
            })}

            {/* Blocks */}
            {timelineBlocks.map((block) => {
              const topPercent = ((block.startMinutes - minTime) / totalMinutes) * 100;
              const height = getBlockHeight(block.duration);

              if (block.type === 'travel') {
                return (
                  <div
                    key={block.id}
                    className="absolute left-0 right-0 flex items-center px-3 py-2"
                    style={{ top: `${topPercent}%`, height: `${height}px` }}
                  >
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                      <Navigation className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{block.title}</span>
                    </div>
                  </div>
                );
              }

              if (block.type === 'free') {
                return (
                  <div
                    key={block.id}
                    className="absolute left-0 right-0 flex items-center px-3 py-2"
                    style={{ top: `${topPercent}%`, height: `${height}px` }}
                  >
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
                      <Clock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {block.title}
                      </span>
                      <span className="text-xs text-emerald-500 dark:text-emerald-500">
                        ({block.subtitle})
                      </span>
                    </div>
                  </div>
                );
              }

              // Activity block
              const colors = getCategoryColors(block.category);
              const isActive = block.item?.id === activeItemId;

              return (
                <div
                  key={block.id}
                  className="absolute left-0 right-0 px-1 py-1"
                  style={{ top: `${topPercent}%`, height: `${height}px` }}
                >
                  <button
                    onClick={() => block.item && onEditItem?.(block.item)}
                    className={`
                      w-full h-full rounded-xl border transition-all text-left
                      ${colors.bg} ${colors.border}
                      ${isActive ? 'ring-2 ring-gray-900 dark:ring-white ring-offset-1' : 'hover:shadow-sm'}
                    `}
                  >
                    <div className="flex items-start gap-2 px-3 py-2 h-full">
                      <div className={`flex-shrink-0 ${colors.text} mt-0.5`}>
                        {getIconForCategory(block.category)}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {block.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeDisplay(formatMinutesToTime(block.startMinutes))} ·{' '}
                          {block.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
