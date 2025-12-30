'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

interface ForecastInfoProps {
  destinationId: number;
  compact?: boolean;
}

interface ForecastData {
  peak_date: string;
  peak_demand: number;
  low_date: string;
  low_demand: number;
  average_demand: number;
  recommendation: string;
}

export function ForecastInfo({ destinationId, compact = false }: ForecastInfoProps) {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchForecast() {
      try {
        const response = await fetch(
          `/api/ml/forecast/peak-times?destination_id=${destinationId}&forecast_days=30`,
          { signal: AbortSignal.timeout(3000) }
        );

        if (response.ok) {
          const data = await response.json();
          setForecast(data);
        }
      } catch (error) {
        // Silently fail - forecast is optional
        console.debug('Forecast unavailable for destination', destinationId);
      } finally {
        setLoading(false);
      }
    }

    if (destinationId) {
      fetchForecast();
    }
  }, [destinationId]);

  if (loading || !forecast) return null;

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
    <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-gray-500 dark:text-[#8b949e]" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Demand Forecast
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-[#8b949e]">Best time to visit:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(forecast.low_date)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-[#8b949e]">Peak demand:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(forecast.peak_date)}
          </span>
        </div>

        {forecast.recommendation && (
          <p className="text-xs text-gray-500 dark:text-[#8b949e] pt-3 mt-1 border-t border-gray-100 dark:border-[#30363d]">
            {forecast.recommendation}
          </p>
        )}
      </div>
    </div>
  );
}





