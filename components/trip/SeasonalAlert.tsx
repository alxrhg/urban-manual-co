'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import type { SeasonalIntelligence } from '@/types/trip';

interface SeasonalAlertProps {
  intelligence: SeasonalIntelligence;
  destination: string;
  className?: string;
}

/**
 * Get crowd level styling
 */
function getCrowdLevelStyle(level: SeasonalIntelligence['crowdLevel']): {
  bg: string;
  text: string;
  icon: 'warning' | 'info';
} {
  switch (level) {
    case 'very_high':
      return { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-800 dark:text-amber-200', icon: 'warning' };
    case 'high':
      return { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-800 dark:text-orange-200', icon: 'warning' };
    case 'moderate':
      return { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-800 dark:text-blue-200', icon: 'info' };
    case 'low':
      return { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-800 dark:text-green-200', icon: 'info' };
    default:
      return { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200', icon: 'info' };
  }
}

/**
 * SeasonalAlert - O3Pack-inspired seasonal intelligence banner
 * Shows crowd levels, timing recommendations, and expandable tips
 */
export default function SeasonalAlert({ intelligence, destination, className = '' }: SeasonalAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const style = getCrowdLevelStyle(intelligence.crowdLevel);

  // Generate headline based on crowd level
  const getHeadline = (): string => {
    const crowdText = {
      very_high: 'very busy crowds',
      high: 'busy crowds',
      moderate: 'moderate crowds',
      low: 'fewer crowds',
    };

    if (intelligence.isPeakSeason) {
      return `${destination} during this time is peak season with ${crowdText[intelligence.crowdLevel]}.`;
    }

    return `${destination} during this time has ${crowdText[intelligence.crowdLevel]}.`;
  };

  return (
    <div className={`rounded-xl ${style.bg} overflow-hidden ${className}`}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {style.icon === 'warning' ? (
            <Calendar className={`w-5 h-5 ${style.text}`} />
          ) : (
            <Info className={`w-5 h-5 ${style.text}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${style.text}`}>{getHeadline()}</p>
        </div>

        {/* Expand toggle */}
        <div className={`flex-shrink-0 ${style.text}`}>
          {intelligence.tips.length > 0 && (
            <>
              <span className="text-xs mr-1">See more</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 inline" />
              ) : (
                <ChevronDown className="w-4 h-4 inline" />
              )}
            </>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Description */}
          {intelligence.seasonDescription && (
            <div className="flex items-start gap-2">
              <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.text} opacity-70`} />
              <p className={`text-sm ${style.text} opacity-90`}>{intelligence.seasonDescription}</p>
            </div>
          )}

          {/* Tips */}
          {intelligence.tips.length > 0 && (
            <div className="space-y-2">
              {intelligence.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Lightbulb className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.text} opacity-70`} />
                  <p className={`text-sm ${style.text} opacity-90`}>{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Major Events */}
          {intelligence.majorEvents && intelligence.majorEvents.length > 0 && (
            <div className="pt-2 border-t border-current/10">
              <p className={`text-xs font-medium ${style.text} opacity-70 mb-1`}>
                Events during your visit:
              </p>
              <div className="flex flex-wrap gap-2">
                {intelligence.majorEvents.map((event, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${style.bg} ${style.text} border border-current/10`}
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Best time to visit */}
          {intelligence.bestTimeToVisit && (
            <div className={`text-xs ${style.text} opacity-70 pt-2`}>
              <span className="font-medium">Best time to visit:</span> {intelligence.bestTimeToVisit}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
