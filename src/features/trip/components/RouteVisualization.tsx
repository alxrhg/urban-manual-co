'use client';

import { useMemo, useState } from 'react';
import { MapPin, Navigation, Footprints, Car, Train, Clock, ChevronDown, ChevronUp, Route, Sparkles, Loader2 } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface RouteVisualizationProps {
  items: EnrichedItineraryItem[];
  dayNumber: number;
  onOptimizeRoute?: (items: EnrichedItineraryItem[]) => void;
  isOptimizing?: boolean;
  className?: string;
}

interface RouteSegment {
  from: EnrichedItineraryItem;
  to: EnrichedItineraryItem;
  distance: number; // km
  walkingTime: number; // minutes
  drivingTime: number; // minutes
  mode: 'walk' | 'drive' | 'transit';
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function formatDuration(mins: number): string {
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${Math.round(mins)} min`;
  const hours = Math.floor(mins / 60);
  const minutes = Math.round(mins % 60);
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function parseTime(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function formatMinutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60) % 24;
  const minutes = mins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// TSP nearest neighbor optimization
function optimizeRoute(items: EnrichedItineraryItem[]): EnrichedItineraryItem[] {
  if (items.length <= 2) return items;

  const itemsWithCoords = items.filter(item => {
    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lon = item.destination?.longitude ?? item.parsedNotes?.longitude;
    return lat && lon;
  });

  if (itemsWithCoords.length < 2) return items;

  // Start with first item (usually has fixed time)
  const optimized: EnrichedItineraryItem[] = [itemsWithCoords[0]];
  const remaining = itemsWithCoords.slice(1);

  while (remaining.length > 0) {
    const current = optimized[optimized.length - 1];
    const currentLat = current.destination?.latitude ?? current.parsedNotes?.latitude ?? 0;
    const currentLon = current.destination?.longitude ?? current.parsedNotes?.longitude ?? 0;

    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((item, idx) => {
      const itemLat = item.destination?.latitude ?? item.parsedNotes?.latitude ?? 0;
      const itemLon = item.destination?.longitude ?? item.parsedNotes?.longitude ?? 0;
      const dist = calculateDistance(currentLat, currentLon, itemLat, itemLon);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    optimized.push(remaining[nearestIdx]);
    remaining.splice(nearestIdx, 1);
  }

  // Re-add items without coordinates at the end
  const withoutCoords = items.filter(item => {
    const lat = item.destination?.latitude ?? item.parsedNotes?.latitude;
    const lon = item.destination?.longitude ?? item.parsedNotes?.longitude;
    return !lat || !lon;
  });

  return [...optimized, ...withoutCoords];
}

export default function RouteVisualization({
  items,
  dayNumber,
  onOptimizeRoute,
  isOptimizing = false,
  className = '',
}: RouteVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate route segments
  const { segments, totalDistance, totalWalkingTime, totalDrivingTime, canOptimize, savingsEstimate } = useMemo(() => {
    const sortedItems = [...items]
      .filter(item => item.time)
      .sort((a, b) => {
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        return timeA - timeB;
      });

    const segs: RouteSegment[] = [];
    let total = 0;
    let walkTime = 0;
    let driveTime = 0;

    for (let i = 0; i < sortedItems.length - 1; i++) {
      const from = sortedItems[i];
      const to = sortedItems[i + 1];

      const fromLat = from.destination?.latitude ?? from.parsedNotes?.latitude;
      const fromLon = from.destination?.longitude ?? from.parsedNotes?.longitude;
      const toLat = to.destination?.latitude ?? to.parsedNotes?.latitude;
      const toLon = to.destination?.longitude ?? to.parsedNotes?.longitude;

      if (fromLat && fromLon && toLat && toLon) {
        const dist = calculateDistance(fromLat, fromLon, toLat, toLon);
        const walkMins = dist * 15; // ~4km/h
        const driveMins = dist * 3; // ~20km/h in city

        total += dist;
        walkTime += walkMins;
        driveTime += driveMins;

        segs.push({
          from,
          to,
          distance: dist,
          walkingTime: walkMins,
          drivingTime: driveMins,
          mode: dist < 1 ? 'walk' : dist < 3 ? 'walk' : 'drive',
        });
      }
    }

    // Calculate potential savings from optimization
    const optimized = optimizeRoute(sortedItems);
    let optimizedDistance = 0;
    for (let i = 0; i < optimized.length - 1; i++) {
      const from = optimized[i];
      const to = optimized[i + 1];
      const fromLat = from.destination?.latitude ?? from.parsedNotes?.latitude;
      const fromLon = from.destination?.longitude ?? from.parsedNotes?.longitude;
      const toLat = to.destination?.latitude ?? to.parsedNotes?.latitude;
      const toLon = to.destination?.longitude ?? to.parsedNotes?.longitude;
      if (fromLat && fromLon && toLat && toLon) {
        optimizedDistance += calculateDistance(fromLat, fromLon, toLat, toLon);
      }
    }

    const savings = total - optimizedDistance;
    const canOpt = sortedItems.length >= 3 && savings > 0.2; // At least 200m savings

    return {
      segments: segs,
      totalDistance: total,
      totalWalkingTime: walkTime,
      totalDrivingTime: driveTime,
      canOptimize: canOpt,
      savingsEstimate: savings,
    };
  }, [items]);

  if (segments.length === 0) {
    return null;
  }

  const handleOptimize = () => {
    if (onOptimizeRoute) {
      const optimized = optimizeRoute(items);
      onOptimizeRoute(optimized);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-gray-900 dark:text-white">
              Route Overview
            </span>
            <span className="text-[11px] text-gray-400">
              Day {dayNumber}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              {formatDistance(totalDistance)}
            </span>
            <span className="flex items-center gap-1">
              <Footprints className="w-3 h-3" />
              {formatDuration(totalWalkingTime)}
            </span>
            <span className="flex items-center gap-1">
              <Car className="w-3 h-3" />
              {formatDuration(totalDrivingTime)}
            </span>
          </div>
        </div>
        {canOptimize && onOptimizeRoute && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOptimize();
            }}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors disabled:opacity-50"
          >
            {isOptimizing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Optimize
            {savingsEstimate > 0.2 && (
              <span className="text-blue-200">
                -{formatDistance(savingsEstimate)}
              </span>
            )}
          </button>
        )}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded route details */}
      {isExpanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <div className="space-y-0">
            {segments.map((segment, index) => {
              const fromTime = parseTime(segment.from.time);
              const toTime = parseTime(segment.to.time);

              return (
                <div key={index} className="relative">
                  {/* From location */}
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-900 dark:bg-white border-2 border-white dark:border-gray-900 shadow-sm" />
                      <div className="w-0.5 h-12 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                          {segment.from.title}
                        </span>
                        {fromTime !== null && (
                          <span className="text-[11px] text-gray-400 tabular-nums">
                            {formatMinutesToTime(fromTime)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {segment.from.destination?.neighborhood || segment.from.description}
                      </p>
                    </div>
                  </div>

                  {/* Travel segment */}
                  <div className="flex items-center gap-3 pl-1.5 -my-1">
                    <div className="w-0" /> {/* Spacer for alignment */}
                    <div className="flex items-center gap-2 py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] text-gray-500 dark:text-gray-400">
                      {segment.mode === 'walk' ? (
                        <Footprints className="w-3 h-3" />
                      ) : segment.mode === 'drive' ? (
                        <Car className="w-3 h-3" />
                      ) : (
                        <Train className="w-3 h-3" />
                      )}
                      <span>{formatDistance(segment.distance)}</span>
                      <span className="text-gray-400">·</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(segment.mode === 'walk' ? segment.walkingTime : segment.drivingTime)}</span>
                    </div>
                  </div>

                  {/* Last item in route */}
                  {index === segments.length - 1 && (
                    <div className="flex items-start gap-3 mt-2">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                            {segment.to.title}
                          </span>
                          {toTime !== null && (
                            <span className="text-[11px] text-gray-400 tabular-nums">
                              {formatMinutesToTime(toTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {segment.to.destination?.neighborhood || segment.to.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Route summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[18px] font-semibold text-gray-900 dark:text-white">
                  {formatDistance(totalDistance)}
                </div>
                <div className="text-[11px] text-gray-500">Total distance</div>
              </div>
              <div>
                <div className="text-[18px] font-semibold text-gray-900 dark:text-white">
                  {formatDuration(totalWalkingTime)}
                </div>
                <div className="text-[11px] text-gray-500">Walking</div>
              </div>
              <div>
                <div className="text-[18px] font-semibold text-gray-900 dark:text-white">
                  {segments.length + 1}
                </div>
                <div className="text-[11px] text-gray-500">Stops</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
