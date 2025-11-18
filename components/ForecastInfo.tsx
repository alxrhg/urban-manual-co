'use client';

import { TrendingUp, TrendingDown, Minus, Calendar, AlertCircle } from 'lucide-react';
import { useForecastData } from '@/hooks/useForecastData';

interface ForecastInfoProps {
  destinationId: number;
  compact?: boolean;
  forecastDays?: number;
}

export function ForecastInfo({ destinationId, compact = false, forecastDays = 30 }: ForecastInfoProps) {
  const { forecast, loading, error } = useForecastData(destinationId, forecastDays);

  if (loading) {
    return compact ? null : (
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Demand Forecast
          </h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Best time to visit:</span>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Peak demand:</span>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return compact ? null : (
      <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
            Forecast Unavailable
          </h3>
        </div>
        <p className="text-xs text-yellow-700 dark:text-yellow-200">
          Could not load demand forecast data at this time.
        </p>
      </div>
    );
  }

  if (!forecast) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <Calendar className="h-3 w-3" />
        <span>Best: {formatDate(forecast.low_date)}</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Demand Forecast
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Best time to visit:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDate(forecast.low_date)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Peak demand:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDate(forecast.peak_date)}
          </span>
        </div>

        {forecast.recommendation && (
          <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-800">
            {forecast.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}





