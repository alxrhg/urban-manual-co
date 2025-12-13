'use client';

import { memo, ReactNode } from 'react';
import {
  Clock,
  Route,
  Users,
  CloudRain,
  Utensils,
  Layers,
  Info,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Footprints,
  Battery,
  BrainCircuit,
} from 'lucide-react';
import { TripInsightsBarProps, DayInsight, TripHealth } from './types';
import { getInsightColor, getHealthColor } from './utils';

/**
 * Get icon component for insight type
 */
function InsightIcon({ icon }: { icon: DayInsight['icon'] }): ReactNode {
  const className = 'w-3.5 h-3.5 flex-shrink-0';

  switch (icon) {
    case 'clock':
      return <Clock className={className} />;
    case 'route':
      return <Route className={className} />;
    case 'crowd':
      return <Users className={className} />;
    case 'weather':
      return <CloudRain className={className} />;
    case 'food':
      return <Utensils className={className} />;
    case 'category':
      return <Layers className={className} />;
    default:
      return <Info className={className} />;
  }
}

/**
 * Get type indicator icon
 */
function TypeIcon({ type }: { type: DayInsight['type'] }): ReactNode {
  const className = 'w-3 h-3 flex-shrink-0';

  switch (type) {
    case 'warning':
      return <AlertTriangle className={className} />;
    case 'success':
      return <CheckCircle className={className} />;
    case 'tip':
    default:
      return <Lightbulb className={className} />;
  }
}

/**
 * TripInsightsBar - Displays actionable insights for a day
 *
 * Shows warnings, tips, and success messages with optional action buttons.
 * Designed to be compact but informative.
 */
export const TripInsightsBar = memo(function TripInsightsBar({
  insights,
  onAction,
}: TripInsightsBarProps) {
  if (insights.length === 0) return null;

  return (
    <div
      className="space-y-1.5 mb-3"
      role="region"
      aria-label="Day insights"
    >
      {insights.map((insight, idx) => (
        <div
          key={`${insight.icon}-${idx}`}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]
            ${getInsightColor(insight.type)}
            transition-all duration-200
          `}
          role={insight.type === 'warning' ? 'alert' : 'status'}
        >
          <InsightIcon icon={insight.icon} />
          <span className="flex-1 leading-snug">{insight.message}</span>
          {insight.action && (
            <button
              onClick={() => onAction(insight.action!)}
              className="px-2.5 py-1 rounded-lg bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              {insight.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
});

/**
 * TripHealthBadge - Visual health score indicator
 *
 * Shows overall trip health with color coding:
 * - Green (80+): Excellent
 * - Blue (60-79): Good
 * - Amber (40-59): Needs attention
 * - Red (<40): Poor
 */
export const TripHealthBadge = memo(function TripHealthBadge({
  score,
  label,
}: {
  score: number;
  label: string;
}) {
  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        text-[10px] font-semibold tracking-wide
        ${getHealthColor(score)}
        transition-colors duration-200
      `}
      role="status"
      aria-label={`Trip health score: ${score}%, ${label}`}
    >
      <span className="tabular-nums">{score}%</span>
      <span className="opacity-80">{label}</span>
    </div>
  );
});

/**
 * TripHealthCard - Detailed health breakdown
 *
 * Shows comprehensive trip health with category balance,
 * time stats, and actionable insights.
 */
export const TripHealthCard = memo(function TripHealthCard({
  health,
  onAction,
}: {
  health: TripHealth;
  onAction?: (action: string) => void;
}) {
  const categories = Object.entries(health.categoryBalance);

  return (
    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 space-y-4">
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white">
            Trip Health
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Based on timing, variety & routing
          </p>
        </div>
        <TripHealthBadge score={health.score} label={health.label} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-xl bg-white dark:bg-white/5">
          <div className="text-[16px] font-semibold text-gray-900 dark:text-white">
            {Math.round(health.totalWalkingTime)}m
          </div>
          <div className="text-[10px] text-gray-500">Travel</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-white/5">
          <div className="text-[16px] font-semibold text-gray-900 dark:text-white">
            {categories.length}
          </div>
          <div className="text-[10px] text-gray-500">Categories</div>
        </div>
        <div className="p-2 rounded-xl bg-white dark:bg-white/5">
          <div
            className={`text-[16px] font-semibold ${
              health.hasTimeConflicts
                ? 'text-amber-500'
                : 'text-green-500'
            }`}
          >
            {health.hasTimeConflicts ? 'Yes' : 'No'}
          </div>
          <div className="text-[10px] text-gray-500">Conflicts</div>
        </div>
      </div>

      {/* Energy & Fatigue Analysis */}
      {health.energyAnalysis && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Energy & Pace
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-white/5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Battery className={`w-3.5 h-3.5 ${
                  health.energyAnalysis.averageDailyFatigue >= 70 ? 'text-red-500' :
                  health.energyAnalysis.averageDailyFatigue >= 50 ? 'text-amber-500' :
                  'text-green-500'
                }`} />
              </div>
              <div className={`text-[14px] font-semibold ${
                health.energyAnalysis.averageDailyFatigue >= 70 ? 'text-red-500' :
                health.energyAnalysis.averageDailyFatigue >= 50 ? 'text-amber-500' :
                'text-gray-900 dark:text-white'
              }`}>
                {health.energyAnalysis.averageDailyFatigue}%
              </div>
              <div className="text-[10px] text-gray-500">Avg Fatigue</div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-white/5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Footprints className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-[14px] font-semibold text-gray-900 dark:text-white">
                {health.energyAnalysis.totalWalkingKm}km
              </div>
              <div className="text-[10px] text-gray-500">Walking</div>
            </div>
            <div className="p-2 rounded-xl bg-white dark:bg-white/5">
              <div className="flex items-center justify-center gap-1 mb-1">
                <BrainCircuit className={`w-3.5 h-3.5 ${
                  health.energyAnalysis.intensityMarathons.length > 0 ? 'text-amber-500' : 'text-green-500'
                }`} />
              </div>
              <div className={`text-[14px] font-semibold ${
                health.energyAnalysis.intensityMarathons.length > 0 ? 'text-amber-500' : 'text-gray-900 dark:text-white'
              }`}>
                {health.energyAnalysis.intensityMarathons.length > 0
                  ? health.energyAnalysis.intensityMarathons.length
                  : '✓'}
              </div>
              <div className="text-[10px] text-gray-500">Marathons</div>
            </div>
          </div>
          {/* Per-day fatigue breakdown */}
          {health.energyAnalysis.dayFatigueScores.length > 0 && (
            <div className="mt-2 flex gap-1.5">
              {health.energyAnalysis.dayFatigueScores.map(({ day, fatigue }) => (
                <div
                  key={day}
                  className="flex-1 text-center p-1.5 rounded-lg bg-white dark:bg-white/5"
                  title={`Day ${day}: ${fatigue.label} (${fatigue.physicalLoad}% physical, ${fatigue.mentalLoad}% mental)`}
                >
                  <div className="text-[9px] text-gray-400 mb-0.5">Day {day}</div>
                  <div className={`text-[11px] font-semibold ${
                    fatigue.score >= 75 ? 'text-red-500' :
                    fatigue.score >= 55 ? 'text-amber-500' :
                    fatigue.score >= 30 ? 'text-blue-500' :
                    'text-green-500'
                  }`}>
                    {fatigue.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      {categories.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Category Mix
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map(([category, count]) => (
              <span
                key={category}
                className="px-2 py-0.5 text-[10px] bg-white dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300"
              >
                {category} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {health.insights.length > 0 && (
        <div className="space-y-1.5">
          {health.insights.map((insight, idx) => (
            <div
              key={idx}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]
                ${getInsightColor(insight.type)}
              `}
            >
              <TypeIcon type={insight.type} />
              <span className="flex-1">{insight.message}</span>
              {insight.action && onAction && (
                <button
                  onClick={() => onAction(insight.action!)}
                  className="px-2 py-0.5 rounded bg-white/50 dark:bg-black/20 font-medium"
                >
                  {insight.action}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default TripInsightsBar;
