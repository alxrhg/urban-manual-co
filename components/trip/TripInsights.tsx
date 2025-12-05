'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Utensils,
  Coffee,
  Camera,
  Wine,
  Bed,
  Plane,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Route,
} from 'lucide-react';

interface TripItem {
  id: string;
  title: string;
  day: number;
  time?: string | null;
  destination_slug?: string | null;
  destination?: {
    category?: string;
    neighborhood?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  parsedNotes?: {
    type?: string;
    category?: string;
  };
}

interface TripDay {
  dayNumber: number;
  date?: string | null;
  items: TripItem[];
}

interface TripInsightsProps {
  days: TripDay[];
  tripDuration: number; // Total days in trip
  onNavigateToDay?: (dayNumber: number) => void;
  onAddToDay?: (dayNumber: number, category?: string) => void;
  className?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'suggestion' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    dayNumber?: number;
    category?: string;
  };
}

interface CategoryStat {
  category: string;
  count: number;
  icon: React.ReactNode;
  label: string;
}

// Duration estimates by category (minutes)
const DURATION_BY_CATEGORY: Record<string, number> = {
  restaurant: 90,
  cafe: 45,
  bar: 60,
  museum: 120,
  gallery: 90,
  landmark: 45,
  attraction: 90,
  hotel: 30,
  shop: 45,
  default: 60,
};

function getDuration(item: TripItem): number {
  const category = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
  const type = item.parsedNotes?.type;

  if (type === 'flight') return 180;
  if (type === 'hotel') return 30;

  for (const [key, duration] of Object.entries(DURATION_BY_CATEGORY)) {
    if (category.includes(key)) return duration;
  }
  return DURATION_BY_CATEGORY.default;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * TripInsights - Unified trip health and intelligence dashboard
 * Shows planning progress, day pacing, category balance, and actionable alerts
 */
export default function TripInsights({
  days,
  tripDuration,
  onNavigateToDay,
  onAddToDay,
  className = '',
}: TripInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const analysis = useMemo(() => {
    const allItems = days.flatMap(d => d.items);
    const totalItems = allItems.length;

    // Category analysis
    const categories: Record<string, number> = {};
    const neighborhoods: Record<string, number> = {};
    let hasHotel = false;
    let hasFlight = false;

    allItems.forEach(item => {
      const cat = (item.parsedNotes?.category || item.destination?.category || '').toLowerCase();
      const type = item.parsedNotes?.type;
      const neighborhood = item.destination?.neighborhood;

      if (cat) {
        // Normalize category names
        let normalizedCat = cat;
        if (cat.includes('restaurant') || cat.includes('dining') || cat.includes('bistro')) normalizedCat = 'restaurant';
        else if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('bakery')) normalizedCat = 'cafe';
        else if (cat.includes('bar') || cat.includes('cocktail') || cat.includes('pub')) normalizedCat = 'bar';
        else if (cat.includes('museum') || cat.includes('gallery')) normalizedCat = 'museum';
        else if (cat.includes('landmark') || cat.includes('attraction') || cat.includes('sight')) normalizedCat = 'attraction';
        else if (cat.includes('hotel') || cat.includes('lodging')) normalizedCat = 'hotel';

        categories[normalizedCat] = (categories[normalizedCat] || 0) + 1;
      }

      if (type === 'hotel' || cat.includes('hotel')) hasHotel = true;
      if (type === 'flight') hasFlight = true;

      if (neighborhood) {
        neighborhoods[neighborhood] = (neighborhoods[neighborhood] || 0) + 1;
      }
    });

    // Day-by-day pacing analysis
    const dayPacing = days.map(day => {
      let totalMinutes = 0;
      let totalTransit = 0;

      day.items.forEach((item, index) => {
        totalMinutes += getDuration(item);

        // Estimate transit to next item
        if (index < day.items.length - 1) {
          const nextItem = day.items[index + 1];
          if (item.destination?.latitude && item.destination?.longitude &&
            nextItem.destination?.latitude && nextItem.destination?.longitude) {
            const distance = calculateDistance(
              item.destination.latitude, item.destination.longitude,
              nextItem.destination.latitude, nextItem.destination.longitude
            );
            totalTransit += Math.ceil(distance * 15); // 15 min per km
          } else {
            totalTransit += 20;
          }
        }
      });

      const totalWithTransit = totalMinutes + totalTransit;
      const usableMinutes = 10 * 60; // 10 hour day
      const utilization = Math.round((totalWithTransit / usableMinutes) * 100);

      return {
        dayNumber: day.dayNumber,
        itemCount: day.items.length,
        totalMinutes,
        totalTransit,
        utilization,
        status: utilization > 120 ? 'overstuffed' as const :
          utilization > 80 ? 'busy' as const :
            day.items.length === 0 ? 'empty' as const :
              day.items.length < 2 ? 'sparse' as const : 'balanced' as const,
      };
    });

    // Calculate planning progress
    const avgItemsPerDay = tripDuration > 0 ? totalItems / tripDuration : 0;
    const progressScore = Math.min(100, Math.round(
      (totalItems > 0 ? 25 : 0) + // Has any items
      (avgItemsPerDay >= 1 ? 25 : avgItemsPerDay * 25) + // At least 1/day
      (avgItemsPerDay >= 2 ? 25 : (avgItemsPerDay - 1) * 25) + // At least 2/day
      (hasHotel || hasFlight ? 25 : 0) // Has logistics
    ));

    // Find clustering opportunities (multiple items in same neighborhood)
    const clusterOpportunities = Object.entries(neighborhoods)
      .filter(([, count]) => count >= 2)
      .map(([neighborhood, count]) => ({ neighborhood, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalItems,
      categories,
      hasHotel,
      hasFlight,
      dayPacing,
      progressScore,
      avgItemsPerDay,
      clusterOpportunities,
    };
  }, [days, tripDuration]);

  // Generate alerts
  const alerts = useMemo(() => {
    const result: Alert[] = [];

    // Empty days alert
    const emptyDays = analysis.dayPacing.filter(d => d.status === 'empty');
    if (emptyDays.length > 0) {
      result.push({
        id: 'empty-days',
        type: 'warning',
        title: `${emptyDays.length} day${emptyDays.length > 1 ? 's' : ''} empty`,
        description: `Day ${emptyDays.map(d => d.dayNumber).join(', ')} ${emptyDays.length > 1 ? 'have' : 'has'} no activities planned`,
        action: { label: 'Add activities', dayNumber: emptyDays[0].dayNumber },
      });
    }

    // Overstuffed days alert
    const overstuffedDays = analysis.dayPacing.filter(d => d.status === 'overstuffed');
    if (overstuffedDays.length > 0) {
      result.push({
        id: 'overstuffed-days',
        type: 'warning',
        title: `${overstuffedDays.length} day${overstuffedDays.length > 1 ? 's' : ''} overpacked`,
        description: `Day ${overstuffedDays.map(d => d.dayNumber).join(', ')} might be too ambitious`,
        action: { label: 'Review', dayNumber: overstuffedDays[0].dayNumber },
      });
    }

    // Category balance suggestions
    const restaurants = analysis.categories['restaurant'] || 0;
    const attractions = analysis.categories['attraction'] || analysis.categories['museum'] || 0;
    const cafes = analysis.categories['cafe'] || 0;

    if (analysis.totalItems >= 3 && attractions === 0) {
      result.push({
        id: 'no-attractions',
        type: 'suggestion',
        title: 'Missing attractions',
        description: 'Add some sights, museums, or landmarks to explore',
        action: { label: 'Add attraction', category: 'attraction' },
      });
    }

    if (restaurants >= 3 && attractions < restaurants - 2) {
      result.push({
        id: 'too-many-restaurants',
        type: 'suggestion',
        title: 'Heavy on dining',
        description: `${restaurants} restaurants but only ${attractions} attractions`,
        action: { label: 'Add attraction', category: 'attraction' },
      });
    }

    if (analysis.totalItems >= 4 && cafes === 0) {
      result.push({
        id: 'no-cafes',
        type: 'suggestion',
        title: 'No morning spots',
        description: 'Consider adding a cafe for breakfast or coffee',
        action: { label: 'Add cafe', category: 'cafe' },
      });
    }

    // Logistics check
    if (analysis.totalItems >= 5 && !analysis.hasHotel && !analysis.hasFlight) {
      result.push({
        id: 'no-logistics',
        type: 'suggestion',
        title: 'Add logistics',
        description: 'Consider adding your hotel or flight details',
        action: { label: 'Add logistics' },
      });
    }

    // Success state
    if (analysis.progressScore >= 75 && result.length === 0) {
      result.push({
        id: 'looking-good',
        type: 'success',
        title: 'Trip looks solid',
        description: 'Good balance of activities across your days',
      });
    }

    return result;
  }, [analysis]);

  // Category stats for display
  const categoryStats: CategoryStat[] = useMemo(() => {
    const stats: CategoryStat[] = [];

    if (analysis.categories['restaurant']) {
      stats.push({
        category: 'restaurant',
        count: analysis.categories['restaurant'],
        icon: <Utensils className="w-3 h-3" />,
        label: 'Restaurants',
      });
    }
    if (analysis.categories['cafe']) {
      stats.push({
        category: 'cafe',
        count: analysis.categories['cafe'],
        icon: <Coffee className="w-3 h-3" />,
        label: 'Cafes',
      });
    }
    if (analysis.categories['attraction'] || analysis.categories['museum']) {
      stats.push({
        category: 'attraction',
        count: (analysis.categories['attraction'] || 0) + (analysis.categories['museum'] || 0),
        icon: <Camera className="w-3 h-3" />,
        label: 'Attractions',
      });
    }
    if (analysis.categories['bar']) {
      stats.push({
        category: 'bar',
        count: analysis.categories['bar'],
        icon: <Wine className="w-3 h-3" />,
        label: 'Bars',
      });
    }
    if (analysis.hasHotel) {
      stats.push({
        category: 'hotel',
        count: analysis.categories['hotel'] || 1,
        icon: <Bed className="w-3 h-3" />,
        label: 'Hotels',
      });
    }
    if (analysis.hasFlight) {
      stats.push({
        category: 'flight',
        count: 1,
        icon: <Plane className="w-3 h-3" />,
        label: 'Flights',
      });
    }

    return stats;
  }, [analysis]);

  if (analysis.totalItems === 0 && days.length === 0) {
    return null;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header with progress */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Trip Health
            </h3>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${analysis.progressScore >= 75
                    ? 'bg-emerald-500'
                    : analysis.progressScore >= 50
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                  }`}
                style={{ width: `${analysis.progressScore}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {analysis.progressScore}%
            </span>
          </div>
        </div>

        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3 rounded-xl ${alert.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : alert.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    }`}
                >
                  {alert.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  ) : alert.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${alert.type === 'warning'
                        ? 'text-amber-800 dark:text-amber-300'
                        : alert.type === 'success'
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {alert.title}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {alert.description}
                    </p>
                  </div>

                  {alert.action && (
                    <button
                      onClick={() => {
                        if (alert.action?.dayNumber && onNavigateToDay) {
                          onNavigateToDay(alert.action.dayNumber);
                        } else if (alert.action?.category && onAddToDay) {
                          onAddToDay(1, alert.action.category);
                        }
                      }}
                      className="text-[10px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white whitespace-nowrap"
                    >
                      {alert.action.label} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Day pacing mini-chart */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
              Day Pacing
            </p>
            <div className="flex items-end gap-1">
              {analysis.dayPacing.map(day => (
                <button
                  key={day.dayNumber}
                  onClick={() => onNavigateToDay?.(day.dayNumber)}
                  className="flex-1 group"
                  title={`Day ${day.dayNumber}: ${day.itemCount} items, ${day.utilization}% utilization`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${day.status === 'overstuffed'
                        ? 'bg-red-400 dark:bg-red-500'
                        : day.status === 'busy'
                          ? 'bg-amber-400 dark:bg-amber-500'
                          : day.status === 'empty'
                            ? 'bg-gray-200 dark:bg-gray-700'
                            : day.status === 'sparse'
                              ? 'bg-gray-300 dark:bg-gray-600'
                              : 'bg-emerald-400 dark:bg-emerald-500'
                      } group-hover:opacity-80`}
                    style={{ height: `${Math.max(8, Math.min(32, day.utilization / 3))}px` }}
                  />
                  <div className="text-[9px] text-gray-400 text-center mt-1">
                    {day.dayNumber}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {categoryStats.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {categoryStats.map(stat => (
                  <div
                    key={stat.category}
                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-gray-500 dark:text-gray-400">{stat.icon}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300">{stat.count}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Neighborhood clustering hint */}
          {analysis.clusterOpportunities.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Route className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-medium text-blue-800 dark:text-blue-300">
                  Clustering opportunity
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  {analysis.clusterOpportunities[0].count} places in {analysis.clusterOpportunities[0].neighborhood} — consider grouping them
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
