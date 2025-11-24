'use client';

import React from 'react';
import {
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  WindIcon,
} from 'lucide-react';

interface TripWeatherForecastProps {
  destination: string;
  startDate: string;
  endDate: string;
}

export function TripWeatherForecast({
  destination,
  startDate,
  endDate,
}: TripWeatherForecastProps) {
  // Mock weather data - in real app would call weather API
  const mockWeather = [
    {
      temp: 22,
      condition: 'sunny',
      precipitation: 10,
      wind: 12,
    },
    {
      temp: 20,
      condition: 'cloudy',
      precipitation: 30,
      wind: 15,
    },
    {
      temp: 18,
      condition: 'rainy',
      precipitation: 80,
      wind: 20,
    },
    {
      temp: 21,
      condition: 'sunny',
      precipitation: 5,
      wind: 10,
    },
    {
      temp: 23,
      condition: 'sunny',
      precipitation: 0,
      wind: 8,
    },
  ];

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <SunIcon className="w-8 h-8 text-amber-500" />;
      case 'cloudy':
        return <CloudIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />;
      case 'rainy':
        return <CloudRainIcon className="w-8 h-8 text-blue-500" />;
      default:
        return <CloudIcon className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />;
    }
  };

  const getDays = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h3 className="text-[11px] text-neutral-400 dark:text-neutral-500 tracking-[0.2em] uppercase mb-3">
          Weather Forecast
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{destination}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {getDays().map((day, index) => {
          const weather = mockWeather[index % mockWeather.length];
          return (
            <div
              key={day.toISOString()}
              className="p-6 border border-neutral-200 dark:border-neutral-800 text-center"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                {day.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <div className="flex justify-center mb-4">
                {getWeatherIcon(weather.condition)}
              </div>
              <p className="text-2xl font-light text-neutral-900 dark:text-neutral-100 mb-4">
                {weather.temp}°C
              </p>
              <div className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center justify-center gap-2">
                  <CloudRainIcon className="w-3 h-3" />
                  {weather.precipitation}%
                </div>
                <div className="flex items-center justify-center gap-2">
                  <WindIcon className="w-3 h-3" />
                  {weather.wind} km/h
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

