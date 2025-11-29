'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'sky';
  size?: 'default' | 'large';
  loading?: boolean;
}

const colorClasses = {
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    icon: 'text-indigo-400',
    glow: 'shadow-indigo-500/10',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: 'text-rose-400',
    glow: 'shadow-rose-500/10',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-400',
    glow: 'shadow-purple-500/10',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    icon: 'text-sky-400',
    glow: 'shadow-sky-500/10',
  },
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'indigo',
  size = 'default',
  loading = false,
}: MetricCardProps) {
  const classes = colorClasses[color];

  const TrendIcon = change === undefined || change === 0
    ? Minus
    : change > 0
    ? ArrowUp
    : ArrowDown;

  const trendColor = change === undefined || change === 0
    ? 'text-gray-500'
    : change > 0
    ? 'text-emerald-400'
    : 'text-rose-400';

  return (
    <div
      className={`
        relative rounded-xl border bg-gray-900/50 backdrop-blur-sm p-5 overflow-hidden
        ${classes.border} hover:border-opacity-40 transition-all duration-200
        hover:shadow-lg ${classes.glow}
        ${size === 'large' ? 'col-span-2' : ''}
      `}
    >
      {/* Subtle gradient background */}
      <div className={`absolute inset-0 ${classes.bg} opacity-30`} />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">
              {title}
            </p>
            {loading ? (
              <div className="mt-2 h-8 w-24 bg-gray-800 rounded animate-pulse" />
            ) : (
              <p className={`mt-2 font-semibold text-white ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            )}
          </div>
          {icon && (
            <div className={`p-2 rounded-lg ${classes.bg} ${classes.icon}`}>
              {icon}
            </div>
          )}
        </div>

        {change !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
            <span className={`text-xs font-medium ${trendColor}`}>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            {changeLabel && (
              <span className="text-xs text-gray-500 ml-1">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
