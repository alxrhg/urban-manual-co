'use client';

import { useEffect, useState } from 'react';
import { getTrendingBadge, getCrowdLevelBadge, formatBestTimeText, type PeakTimeRecommendation, type TrendingDestination } from '@/lib/ml/forecasting';

interface DestinationBadgesProps {
  destinationId: number;
  compact?: boolean;
  showTiming?: boolean;
}

export function DestinationBadges({ destinationId, compact = false, showTiming = true }: DestinationBadgesProps) {
  const [trendingData, setTrendingData] = useState<TrendingDestination | null>(null);
  const [peakTimes, setPeakTimes] = useState<PeakTimeRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch trending status
        const trendingRes = await fetch(
          `/api/ml/forecast/trending?top_n=100&forecast_days=7`,
          { signal: AbortSignal.timeout(3000) }
        );

        if (trendingRes.ok) {
          const data = await trendingRes.json();
          const found = data.trending?.find((t: TrendingDestination) => t.destination_id === destinationId);
          if (found) {
            setTrendingData(found);
          }
        }

        // Fetch peak times if showing timing
        if (showTiming) {
          const peakRes = await fetch(
            `/api/ml/forecast/peak-times?destination_id=${destinationId}&forecast_days=7`,
            { signal: AbortSignal.timeout(3000) }
          );

          if (peakRes.ok) {
            const data = await peakRes.json();
            if (data.peak_times && data.peak_times.length > 0) {
              // Process peak times
              const allTimes = data.peak_times.sort((a: any, b: any) =>
                a.predicted_visits - b.predicted_visits
              );

              const formatTimeRange = (hour: number): string => {
                const startHour = hour;
                const formatHour = (h: number) => {
                  if (h === 0) return '12 AM';
                  if (h === 12) return '12 PM';
                  if (h < 12) return `${h} AM`;
                  return `${h - 12} PM`;
                };
                return formatHour(startHour);
              };

              const bestTimes = allTimes.slice(0, 3).map((pt: any) => ({
                day: pt.day_of_week,
                timeRange: formatTimeRange(pt.hour),
                crowd_level: 'low' as const,
              }));

              const worstTimes = allTimes.slice(-3).map((pt: any) => ({
                day: pt.day_of_week,
                timeRange: formatTimeRange(pt.hour),
                crowd_level: 'high' as const,
              }));

              setPeakTimes({ best_times: bestTimes, worst_times: worstTimes });
            }
          }
        }
      } catch (error) {
        // Silently fail - badges are optional enhancements
        console.debug('ML forecasting unavailable for destination', destinationId);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [destinationId, showTiming]);

  if (loading) return null;

  const trendingBadge = trendingData ? getTrendingBadge(trendingData.trend_direction) : null;
  const crowdLevel = peakTimes
    ? peakTimes.best_times.length > peakTimes.worst_times.length
      ? 'low'
      : peakTimes.worst_times.length > peakTimes.best_times.length
      ? 'high'
      : 'medium'
    : null;

  const crowdBadge = crowdLevel ? getCrowdLevelBadge(crowdLevel) : null;

  if (!trendingBadge && !crowdBadge && !peakTimes) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {trendingBadge && (
          <div className={`text-xs ${trendingBadge.color} flex items-center gap-1`}>
            <span>{trendingBadge.emoji}</span>
          </div>
        )}
        {crowdBadge && (
          <div className={`text-xs ${crowdBadge.color} flex items-center gap-1`}>
            <span>{crowdBadge.emoji}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {trendingBadge && (
          <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-dark-blue-900/90 backdrop-blur-sm border border-gray-200 dark:border-dark-blue-600">
            <span className={`text-xs font-medium ${trendingBadge.color} flex items-center gap-1`}>
              <span>{trendingBadge.emoji}</span>
              <span>{trendingBadge.text}</span>
            </span>
          </div>
        )}
        {crowdBadge && (
          <div className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-dark-blue-900/90 backdrop-blur-sm border border-gray-200 dark:border-dark-blue-600">
            <span className={`text-xs font-medium ${crowdBadge.color} flex items-center gap-1`}>
              <span>{crowdBadge.emoji}</span>
              <span>{crowdBadge.text}</span>
            </span>
          </div>
        )}
      </div>
      {peakTimes && peakTimes.best_times.length > 0 && showTiming && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {formatBestTimeText(peakTimes)}
        </div>
      )}
    </div>
  );
}
