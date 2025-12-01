'use client';

import { useState } from 'react';
import { CloudRain, ArrowRight, X, Check } from 'lucide-react';

interface WeatherSwapAlertProps {
  rainyDay: {
    dayNumber: number;
    date?: string;
    outdoorActivities: string[];
  };
  suggestedSwapDay: {
    dayNumber: number;
    date?: string;
    weather: string;
  };
  onAcceptSwap?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * WeatherSwapAlert - Suggests moving outdoor activities based on weather
 */
export default function WeatherSwapAlert({
  rainyDay,
  suggestedSwapDay,
  onAcceptSwap,
  onDismiss,
  className = '',
}: WeatherSwapAlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleAccept = () => {
    onAcceptSwap?.();
    setIsDismissed(true);
  };

  return (
    <div className={`p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-xl ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
          <CloudRain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Rain expected on Day {rainyDay.dayNumber}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            Move {rainyDay.outdoorActivities.length === 1
              ? rainyDay.outdoorActivities[0]
              : `${rainyDay.outdoorActivities.length} outdoor activities`
            } to Day {suggestedSwapDay.dayNumber}?
          </p>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                Day {rainyDay.dayNumber}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-400" />
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                Day {suggestedSwapDay.dayNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAccept}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            >
              <Check className="w-3 h-3" />
              Swap
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-full transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Compact inline weather warning for day headers
 */
export function DayWeatherBadge({
  condition,
  precipitation,
}: {
  condition: string;
  precipitation: number;
}) {
  if (precipitation < 5) return null;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
      <CloudRain className="w-2.5 h-2.5" />
      {precipitation}mm
    </span>
  );
}
