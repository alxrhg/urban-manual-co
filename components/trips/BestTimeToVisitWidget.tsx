'use client';

import { useState, useEffect } from 'react';
import { Calendar, Sun, Users, DollarSign, Loader2, AlertCircle, Check } from 'lucide-react';

interface MonthData {
  month: string;
  monthIndex: number;
  weatherScore: number;
  crowdScore: number;
  priceScore: number;
  overallScore: number;
  recommendation?: string;
}

interface BestTimeData {
  city: string;
  country?: string;
  months: MonthData[];
  bestOverall?: {
    month: string;
    score: number;
    reason: string;
  };
  bestForBudget?: {
    month: string;
    score: number;
  };
  bestForWeather?: {
    month: string;
    score: number;
  };
  bestForCrowds?: {
    month: string;
    score: number;
  };
}

interface BestTimeToVisitWidgetProps {
  destination: string | null;
  startDate?: string | null;
  endDate?: string | null;
  className?: string;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

/**
 * BestTimeToVisitWidget - Shows optimal travel timing analysis
 * Uses the best-time-to-visit intelligence API
 */
export default function BestTimeToVisitWidget({
  destination,
  startDate,
  className = '',
}: BestTimeToVisitWidgetProps) {
  const [data, setData] = useState<BestTimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get trip month for comparison
  const tripMonth = startDate ? new Date(startDate).toLocaleString('default', { month: 'long' }) : null;

  useEffect(() => {
    if (!destination) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/intelligence/best-time-to-visit?city=${encodeURIComponent(destination)}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch timing data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Failed to fetch best time to visit:', err);
        setError('Unable to load timing analysis');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [destination]);

  if (!destination) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`text-center py-6 ${className}`}>
        <AlertCircle className="w-5 h-5 mx-auto text-stone-400 mb-2" />
        <p className="text-xs text-stone-500 dark:text-gray-400">
          {error || 'No timing data available'}
        </p>
      </div>
    );
  }

  // Find trip month data if available
  const tripMonthData = tripMonth
    ? data.months?.find(m => m.month.toLowerCase() === tripMonth.toLowerCase())
    : null;

  // Determine if trip timing is optimal
  const isOptimalTiming = tripMonthData && tripMonthData.overallScore >= 70;

  return (
    <div className={className}>
      {/* Trip Month Analysis */}
      {tripMonthData && (
        <div className="p-4 rounded-xl border border-stone-200 dark:border-gray-800 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              {isOptimalTiming ? (
                <Check className="w-4 h-4 text-stone-600 dark:text-gray-400" />
              ) : (
                <Calendar className="w-4 h-4 text-stone-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Your trip: {tripMonth}
              </p>
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                {isOptimalTiming
                  ? 'Great timing for visiting.'
                  : `Consider ${data.bestOverall?.month || 'other months'} for better conditions.`}
              </p>

              {/* Score breakdown */}
              <div className="flex items-center gap-4 mt-3 text-xs text-stone-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3 h-3" />
                  <span>{getScoreLabel(tripMonthData.weatherScore)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  <span>{getScoreLabel(tripMonthData.crowdScore)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" />
                  <span>{getScoreLabel(tripMonthData.priceScore)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best Month Recommendations */}
      {data.bestOverall && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wide">
            Best Times to Visit
          </p>

          <div className="grid grid-cols-3 gap-2">
            {/* Best Overall */}
            <div className="p-3 border border-stone-200 dark:border-gray-800 rounded-xl text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                <Check className="w-4 h-4 text-stone-600 dark:text-gray-400" />
              </div>
              <p className="text-xs font-medium text-stone-900 dark:text-white">
                {data.bestOverall.month}
              </p>
              <p className="text-[10px] text-stone-500 dark:text-gray-400">
                Best overall
              </p>
            </div>

            {/* Best for Weather */}
            {data.bestForWeather && (
              <div className="p-3 border border-stone-200 dark:border-gray-800 rounded-xl text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-stone-500" />
                </div>
                <p className="text-xs font-medium text-stone-900 dark:text-white">
                  {data.bestForWeather.month}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-gray-400">
                  Best weather
                </p>
              </div>
            )}

            {/* Best for Budget */}
            {data.bestForBudget && (
              <div className="p-3 border border-stone-200 dark:border-gray-800 rounded-xl text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-stone-100 dark:bg-gray-800 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-stone-500" />
                </div>
                <p className="text-xs font-medium text-stone-900 dark:text-white">
                  {data.bestForBudget.month}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-gray-400">
                  Best prices
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Month-by-month breakdown (compact) */}
      {data.months && data.months.length > 0 && (
        <div className="mt-4 pt-4 border-t border-stone-100 dark:border-gray-800">
          <p className="text-xs font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Monthly Overview
          </p>
          <div className="grid grid-cols-6 gap-1">
            {data.months.slice(0, 12).map((month) => {
              const isCurrentMonth = tripMonth?.toLowerCase() === month.month.toLowerCase();
              return (
                <div
                  key={month.month}
                  className={`p-1.5 rounded-lg text-center border ${
                    isCurrentMonth
                      ? 'border-stone-900 dark:border-white'
                      : 'border-stone-200 dark:border-gray-800'
                  }`}
                >
                  <p className="text-[10px] font-medium text-stone-700 dark:text-gray-300">
                    {month.month.slice(0, 3)}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-gray-400">
                    {month.overallScore}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
