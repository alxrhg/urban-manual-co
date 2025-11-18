'use client';

import { useEffect, useState } from 'react';
import { isMlClientEnabled } from '@/lib/ml/flags';

interface ForecastData {
  peak_date: string;
  peak_demand: number;
  low_date: string;
  low_demand: number;
  average_demand: number;
  recommendation: string;
}

export function useForecastData(destinationId: number, forecastDays: number = 30) {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchForecast() {
      if (!isMlClientEnabled) {
        setForecast(null);
        setError('ML service disabled');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/ml/forecast/peak-times?destination_id=${destinationId}&forecast_days=${forecastDays}`,
          { signal: AbortSignal.timeout(3000) }
        );

        if (response.ok) {
          const data = await response.json();
          setForecast(data);
        } else {
          setError('Failed to fetch forecast data');
        }
      } catch (error) {
        setError('Failed to fetch forecast data');
        console.debug('Forecast unavailable for destination', destinationId);
      } finally {
        setLoading(false);
      }
    }

    if (destinationId) {
      fetchForecast();
    }
  }, [destinationId, forecastDays]);

  return { forecast, loading, error };
}
