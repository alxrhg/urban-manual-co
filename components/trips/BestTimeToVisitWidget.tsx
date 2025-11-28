'use client';

import { useState, useEffect } from 'react';
import { Calendar, Sun, Users, DollarSign, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

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

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * BestTimeToVisitWidget - Shows optimal travel timing analysis
 * Uses the best-time-to-visit intelligence API
 */
export default function BestTimeToVisitWidget({
  destination,
  startDate,
  endDate,
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
  const isBadTiming = tripMonthData && tripMonthData.overallScore < 50;

  return (
    <div className={className}>
      {/* Trip Month Analysis */}
      {tripMonthData && (
        <div className={`p-4 rounded-xl mb-4 ${isOptimalTiming ? 'bg-green-50 dark:bg-green-900/20' : isBadTiming ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-stone-50 dark:bg-gray-800/50'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOptimalTiming ? 'bg-green-100 dark:bg-green-900/40' : isBadTiming ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-stone-100 dark:bg-gray-800'}`}>
              {isOptimalTiming ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-900 dark:text-white">
                Your trip: {tripMonth}
              </p>
              <p className="text-xs text-stone-600 dark:text-gray-400 mt-0.5">
                {isOptimalTiming
                  ? 'Great timing! This is an excellent time to visit.'
                  : isBadTiming
                  ? `Consider visiting in ${data.bestOverall?.month || 'a different month'} for better conditions.`
                  : 'Decent timing, though other months might be slightly better.'}
              </p>

              {/* Score breakdown */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-stone-400" />
                  <span className={`text-xs font-medium ${getScoreColor(tripMonthData.weatherScore)}`}>
                    {tripMonthData.weatherScore}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span className={`text-xs font-medium ${getScoreColor(tripMonthData.crowdScore)}`}>
                    {tripMonthData.crowdScore}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                  <span className={`text-xs font-medium ${getScoreColor(tripMonthData.priceScore)}`}>
                    {tripMonthData.priceScore}%
                  </span>
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
            <div className="p-3 bg-stone-50 dark:bg-gray-800/50 rounded-xl text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
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
              <div className="p-3 bg-stone-50 dark:bg-gray-800/50 rounded-xl text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-amber-600 dark:text-amber-400" />
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
              <div className="p-3 bg-stone-50 dark:bg-gray-800/50 rounded-xl text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
            {data.months.slice(0, 12).map((month) => (
              <div
                key={month.month}
                className={`p-1.5 rounded-lg text-center ${tripMonth?.toLowerCase() === month.month.toLowerCase() ? 'ring-2 ring-stone-900 dark:ring-white' : ''} ${getScoreBg(month.overallScore)}`}
              >
                <p className="text-[10px] font-medium text-stone-700 dark:text-gray-300">
                  {month.month.slice(0, 3)}
                </p>
                <p className={`text-[10px] font-bold ${getScoreColor(month.overallScore)}`}>
                  {month.overallScore}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
