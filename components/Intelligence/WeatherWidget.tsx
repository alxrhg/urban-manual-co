'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Loader2,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Thermometer,
} from 'lucide-react';
import { parseDateString } from '@/lib/utils';

interface WeatherDay {
  date: string;
  dayOfWeek: string;
  temp: { min: number; max: number };
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  precipitationProbability: number;
}

interface ItineraryDay {
  dayNumber: number;
  date?: string;
  hasOutdoorActivities?: boolean;
  activities?: string[];
}

interface WeatherWidgetProps {
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  latitude?: number;
  longitude?: number;
  itineraryDays?: ItineraryDay[];
  compact?: boolean;
  tempUnit?: 'C' | 'F';
  className?: string;
}

// Weather code mapping
const getCondition = (code: number): { condition: string; icon: string } => {
  if (code === 0) return { condition: 'Clear', icon: 'sun' };
  if (code <= 3) return { condition: 'Partly Cloudy', icon: 'cloud' };
  if (code <= 49) return { condition: 'Foggy', icon: 'cloud' };
  if (code <= 59) return { condition: 'Drizzle', icon: 'rain' };
  if (code <= 69) return { condition: 'Rain', icon: 'rain' };
  if (code <= 79) return { condition: 'Snow', icon: 'snow' };
  if (code <= 99) return { condition: 'Thunderstorm', icon: 'rain' };
  return { condition: 'Unknown', icon: 'cloud' };
};

const getWeatherIcon = (icon: string, size: 'sm' | 'md' | 'lg' = 'md') => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  const className = sizeClasses[size];

  switch (icon) {
    case 'sun':
      return <Sun className={`${className} text-amber-400`} />;
    case 'rain':
      return <CloudRain className={`${className} text-blue-400`} />;
    case 'snow':
      return <CloudSnow className={`${className} text-blue-200`} />;
    default:
      return <Cloud className={`${className} text-stone-400`} />;
  }
};

export default function WeatherWidget({
  destination,
  startDate,
  endDate,
  latitude,
  longitude,
  itineraryDays = [],
  compact = false,
  tempUnit = 'C',
  className = '',
}: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!startDate) {
        setError('No trip dates set');
        setLoading(false);
        return;
      }

      const start = parseDateString(startDate);
      const now = new Date();
      if (!start) {
        setError('Invalid date');
        setLoading(false);
        return;
      }

      const daysUntilTrip = Math.ceil(
        (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilTrip > 14) {
        setError('Weather available closer to trip');
        setLoading(false);
        return;
      }

      if (daysUntilTrip < -30) {
        setError('Trip has passed');
        setLoading(false);
        return;
      }

      try {
        let lat = latitude;
        let lon = longitude;

        if (!lat || !lon) {
          if (!destination) {
            setError('No destination set');
            setLoading(false);
            return;
          }

          const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1`
          );
          const geoData = await geoResponse.json();

          if (!geoData.results?.[0]) {
            setError('Location not found');
            setLoading(false);
            return;
          }

          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode,windspeed_10m_max,relative_humidity_2m_mean&timezone=auto&forecast_days=16`
        );
        const weatherData = await weatherResponse.json();

        if (!weatherData.daily) {
          setError('Weather data unavailable');
          setLoading(false);
          return;
        }

        const tripStart = parseDateString(startDate);
        const tripEnd = parseDateString(endDate) || tripStart;

        const forecastDays: WeatherDay[] = [];
        weatherData.daily.time.forEach((date: string, i: number) => {
          const dayDate = parseDateString(date);
          if (dayDate && tripStart && tripEnd && dayDate >= tripStart && dayDate <= tripEnd) {
            const { condition, icon } = getCondition(weatherData.daily.weathercode[i]);
            forecastDays.push({
              date,
              dayOfWeek: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
              temp: {
                min: Math.round(weatherData.daily.temperature_2m_min[i]),
                max: Math.round(weatherData.daily.temperature_2m_max[i]),
              },
              condition,
              icon,
              humidity: Math.round(weatherData.daily.relative_humidity_2m_mean[i]),
              windSpeed: Math.round(weatherData.daily.windspeed_10m_max[i]),
              precipitation: Math.round(weatherData.daily.precipitation_sum[i] * 10) / 10,
              precipitationProbability:
                weatherData.daily.precipitation_probability_max?.[i] ?? 0,
            });
          }
        });

        if (forecastDays.length === 0) {
          setError('Forecast not yet available');
        } else {
          setWeather(forecastDays);
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Failed to load weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [destination, startDate, endDate, latitude, longitude]);

  // Calculate rain alerts for itinerary days
  const rainAlerts = useMemo(() => {
    if (weather.length === 0 || itineraryDays.length === 0) return [];

    const alerts: Array<{
      dayNumber: number;
      date: string;
      precipitation: number;
      probability: number;
      activities: string[];
    }> = [];

    weather.forEach((day, index) => {
      const itineraryDay = itineraryDays.find(
        (d) => d.date === day.date || d.dayNumber === index + 1
      );

      if (
        itineraryDay?.hasOutdoorActivities &&
        (day.precipitationProbability > 40 || day.precipitation > 2)
      ) {
        alerts.push({
          dayNumber: itineraryDay.dayNumber,
          date: day.date,
          precipitation: day.precipitation,
          probability: day.precipitationProbability,
          activities: itineraryDay.activities || [],
        });
      }
    });

    return alerts;
  }, [weather, itineraryDays]);

  // Summary stats
  const stats = useMemo(() => {
    if (weather.length === 0) return null;

    const temps = weather.map((d) => d.temp.max);
    const avgTemp = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const minTemp = Math.min(...weather.map((d) => d.temp.min));
    const maxTemp = Math.max(...temps);
    const rainyDays = weather.filter(
      (d) => d.precipitationProbability > 40 || d.precipitation > 2
    ).length;

    return { avgTemp, minTemp, maxTemp, rainyDays };
  }, [weather]);

  const convertTemp = (temp: number) => {
    if (tempUnit === 'F') {
      return Math.round((temp * 9) / 5 + 32);
    }
    return temp;
  };

  const formatDate = (dateStr: string) => {
    const date = parseDateString(dateStr);
    if (!date) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`rounded-2xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 p-6 ${className}`}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`rounded-2xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 p-6 ${className}`}
      >
        <div className="text-center py-4">
          <Cloud className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs text-stone-500">{error}</p>
        </div>
      </div>
    );
  }

  // Compact view
  if (compact && stats) {
    return (
      <div
        className={`rounded-xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 px-4 py-3 ${className}`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium">
              {convertTemp(stats.avgTemp)}°{tempUnit}
            </span>
          </div>
          {stats.rainyDays > 0 && (
            <div className="flex items-center gap-1.5 text-blue-500">
              <CloudRain className="w-4 h-4" />
              <span className="text-xs font-medium">
                {stats.rainyDays} rainy {stats.rainyDays === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Calculate SVG curve points for temperature visualization
  const tempCurvePoints = useMemo(() => {
    if (weather.length < 2) return '';

    const padding = 20;
    const width = 100;
    const height = 40;

    const temps = weather.map((d) => d.temp.max);
    const minTemp = Math.min(...temps) - 2;
    const maxTemp = Math.max(...temps) + 2;
    const range = maxTemp - minTemp || 1;

    const points = temps.map((temp, i) => {
      const x = padding + (i / (temps.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((temp - minTemp) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [weather]);

  return (
    <div
      className={`rounded-2xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 overflow-hidden ${className}`}
    >
      {/* Header with glass effect */}
      <div className="px-5 py-4 border-b border-stone-200/50 dark:border-stone-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-400/20 flex items-center justify-center">
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                Weather Forecast
              </h3>
              {destination && (
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {destination}
                </p>
              )}
            </div>
          </div>

          {/* Temperature summary pill */}
          {stats && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800">
              <span className="text-xs font-medium text-stone-600 dark:text-stone-300">
                {convertTemp(stats.minTemp)}° – {convertTemp(stats.maxTemp)}°
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Rain Alerts Section */}
      {rainAlerts.length > 0 && (
        <div className="px-5 py-3 bg-blue-50/50 dark:bg-blue-900/20 border-b border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Rain Alert{rainAlerts.length > 1 ? 's' : ''}
              </p>
              <div className="mt-1 space-y-1">
                {rainAlerts.map((alert) => (
                  <p
                    key={alert.dayNumber}
                    className="text-[11px] text-blue-600 dark:text-blue-400"
                  >
                    <span className="font-medium">Day {alert.dayNumber}</span>:{' '}
                    {alert.probability}% chance of rain
                    {alert.activities.length > 0 && (
                      <span className="text-blue-500 dark:text-blue-500">
                        {' '}
                        – outdoor activities planned
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Temperature Curve */}
      {weather.length > 1 && (
        <div className="px-5 py-4">
          <svg
            viewBox="0 0 100 50"
            className="w-full h-12"
            preserveAspectRatio="none"
          >
            {/* Gradient fill */}
            <defs>
              <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(251, 191, 36)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(251, 191, 36)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Fill area */}
            <path
              d={`${tempCurvePoints} L ${100 - 20},${50 - 20} L 20,${50 - 20} Z`}
              fill="url(#tempGradient)"
            />

            {/* Line */}
            <path
              d={tempCurvePoints}
              fill="none"
              stroke="rgb(251, 191, 36)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots for each day */}
            {weather.map((day, i) => {
              const temps = weather.map((d) => d.temp.max);
              const minTemp = Math.min(...temps) - 2;
              const maxTemp = Math.max(...temps) + 2;
              const range = maxTemp - minTemp || 1;

              const x = 20 + (i / (weather.length - 1)) * 60;
              const y = 30 - ((day.temp.max - minTemp) / range) * 20;

              const hasRain =
                day.precipitationProbability > 40 || day.precipitation > 2;

              return (
                <circle
                  key={day.date}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={hasRain ? 'rgb(96, 165, 250)' : 'rgb(251, 191, 36)'}
                  stroke="white"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>
      )}

      {/* Day cards */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {weather.map((day, index) => {
            const hasRain =
              day.precipitationProbability > 40 || day.precipitation > 2;
            const isOutdoorDay = itineraryDays.some(
              (d) => d.date === day.date || d.dayNumber === index + 1
            );

            return (
              <div
                key={day.date}
                className={`flex-shrink-0 w-16 p-2.5 rounded-xl text-center transition-colors ${
                  hasRain
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200/50 dark:border-blue-700/50'
                    : 'bg-stone-50 dark:bg-stone-800/50 border border-stone-200/30 dark:border-stone-700/30'
                }`}
              >
                <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                  {day.dayOfWeek}
                </p>
                <div className="flex justify-center my-1.5">
                  {getWeatherIcon(day.icon, 'md')}
                </div>
                <p className="text-xs font-semibold text-stone-900 dark:text-white">
                  {convertTemp(day.temp.max)}°
                </p>
                <p className="text-[10px] text-stone-400">
                  {convertTemp(day.temp.min)}°
                </p>

                {hasRain && (
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5 text-blue-400" />
                    <span className="text-[9px] font-medium text-blue-500">
                      {day.precipitationProbability}%
                    </span>
                  </div>
                )}

                {isOutdoorDay && hasRain && (
                  <div className="mt-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer stats */}
      {stats && (
        <div className="px-5 py-3 border-t border-stone-200/50 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-800/30">
          <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              <span>
                Avg {convertTemp(stats.avgTemp)}°{tempUnit}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3" />
              <span>
                {Math.round(
                  weather.reduce((sum, d) => sum + d.windSpeed, 0) / weather.length
                )}{' '}
                km/h
              </span>
            </div>
            {stats.rainyDays > 0 && (
              <div className="flex items-center gap-1 text-blue-500">
                <CloudRain className="w-3 h-3" />
                <span>
                  {stats.rainyDays} {stats.rainyDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline rain alert badge for day headers
 */
export function RainAlertBadge({
  probability,
  precipitation,
  hasOutdoorActivities = false,
}: {
  probability: number;
  precipitation: number;
  hasOutdoorActivities?: boolean;
}) {
  if (probability < 40 && precipitation < 2) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
        hasOutdoorActivities
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-700/50'
          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/50'
      }`}
    >
      <CloudRain className="w-3 h-3" />
      <span>{probability}%</span>
      {hasOutdoorActivities && (
        <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
      )}
    </span>
  );
}
