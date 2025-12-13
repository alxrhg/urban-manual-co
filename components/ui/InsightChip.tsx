'use client';

import { ReactNode } from 'react';
import {
  Users,
  Clock,
  Navigation,
  CloudRain,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sun,
} from 'lucide-react';

/**
 * Standardized Insight Chip Component
 *
 * Provides consistent styling for insight indicators across the app:
 * - Crowd level
 * - Distance/walking time
 * - Opening hours
 * - Weather conditions
 * - Time indicators
 *
 * Standard styles:
 * - Text: text-[10px] font-medium
 * - Padding: px-2 py-0.5 (standard), px-1.5 py-0.5 (compact)
 * - Border radius: rounded-full
 * - Icon: w-3 h-3
 */

export type InsightVariant =
  | 'success'   // Green - quiet, open, good weather
  | 'warning'   // Amber - busy, closing soon
  | 'danger'    // Red - peak, closed, bad weather
  | 'info'      // Blue - distance, weather info
  | 'neutral';  // Gray - moderate, unknown

export type InsightType =
  | 'crowd'
  | 'distance'
  | 'hours'
  | 'weather'
  | 'time'
  | 'custom';

interface InsightChipProps {
  /** The insight type determines the default icon */
  type?: InsightType;
  /** Visual variant (color scheme) */
  variant?: InsightVariant;
  /** Text label to display */
  label: string;
  /** Optional secondary text (e.g., walking time) */
  sublabel?: string;
  /** Custom icon to override the default */
  icon?: ReactNode;
  /** Compact mode for tighter spaces */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Tooltip text */
  title?: string;
}

// Variant color configurations
const VARIANT_STYLES: Record<InsightVariant, { text: string; bg: string }> = {
  success: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  warning: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  danger: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
  info: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  neutral: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
};

// Default icons by type
const TYPE_ICONS: Record<InsightType, ReactNode> = {
  crowd: <Users className="w-3 h-3" />,
  distance: <Navigation className="w-3 h-3" />,
  hours: <Clock className="w-3 h-3" />,
  weather: <CloudRain className="w-3 h-3" />,
  time: <Clock className="w-3 h-3" />,
  custom: null,
};

/**
 * InsightChip - Standardized insight indicator
 *
 * @example
 * // Crowd indicator
 * <InsightChip type="crowd" variant="warning" label="Busy" />
 *
 * @example
 * // Distance with sublabel
 * <InsightChip type="distance" variant="info" label="1.2km" sublabel="15 min walk" />
 *
 * @example
 * // Opening hours
 * <InsightChip type="hours" variant="success" label="Open" />
 */
export function InsightChip({
  type = 'custom',
  variant = 'neutral',
  label,
  sublabel,
  icon,
  compact = false,
  className = '',
  onClick,
  title,
}: InsightChipProps) {
  const styles = VARIANT_STYLES[variant];
  const defaultIcon = TYPE_ICONS[type];
  const displayIcon = icon !== undefined ? icon : defaultIcon;

  const padding = compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5';
  const isClickable = !!onClick;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full text-[10px] font-medium
        ${padding} ${styles.bg} ${styles.text}
        ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${className}
      `.trim()}
      onClick={onClick}
      title={title}
      role={isClickable ? 'button' : undefined}
    >
      {displayIcon}
      <span>{label}</span>
      {sublabel && (
        <span className="opacity-70">{sublabel}</span>
      )}
    </span>
  );
}

/**
 * Inline text-only insight (no background)
 * Used when a full chip would be too heavy
 */
export function InsightText({
  type = 'custom',
  variant = 'neutral',
  label,
  icon,
  className = '',
}: Omit<InsightChipProps, 'compact' | 'sublabel' | 'onClick' | 'title'>) {
  const styles = VARIANT_STYLES[variant];
  const defaultIcon = TYPE_ICONS[type];
  const displayIcon = icon !== undefined ? icon : defaultIcon;

  return (
    <span
      className={`
        inline-flex items-center gap-1 text-[10px] font-medium
        ${styles.text} ${className}
      `.trim()}
    >
      {displayIcon}
      <span>{label}</span>
    </span>
  );
}

/**
 * Dot indicator for minimal inline status
 * Shows only a colored dot (useful in tight spaces)
 */
export function InsightDot({
  variant = 'neutral',
  title,
  className = '',
}: {
  variant?: InsightVariant;
  title?: string;
  className?: string;
}) {
  const colorMap: Record<InsightVariant, string> = {
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
    neutral: 'text-gray-400',
  };

  return (
    <span
      className={`text-[8px] ${colorMap[variant]} ${className}`}
      title={title}
    >
      ●
    </span>
  );
}

// Helper functions for common insight chip configurations

/**
 * Get crowd variant from level
 */
export function getCrowdVariant(level: 'quiet' | 'moderate' | 'busy' | 'peak'): InsightVariant {
  switch (level) {
    case 'quiet':
      return 'success';
    case 'moderate':
      return 'neutral';
    case 'busy':
      return 'warning';
    case 'peak':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * Get crowd label text
 */
export function getCrowdLabel(level: 'quiet' | 'moderate' | 'busy' | 'peak'): string {
  switch (level) {
    case 'quiet':
      return 'Quiet';
    case 'moderate':
      return 'Moderate';
    case 'busy':
      return 'Busy';
    case 'peak':
      return 'Peak';
    default:
      return 'Unknown';
  }
}

/**
 * Get hours status variant
 */
export function getHoursVariant(status: 'open' | 'closed' | 'closing_soon' | 'unknown'): InsightVariant {
  switch (status) {
    case 'open':
      return 'success';
    case 'closed':
      return 'danger';
    case 'closing_soon':
      return 'warning';
    default:
      return 'neutral';
  }
}

/**
 * Get hours status icon
 */
export function getHoursIcon(status: 'open' | 'closed' | 'closing_soon' | 'unknown'): ReactNode {
  switch (status) {
    case 'open':
      return <CheckCircle2 className="w-3 h-3" />;
    case 'closed':
      return <XCircle className="w-3 h-3" />;
    case 'closing_soon':
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
}

/**
 * Get hours status label
 */
export function getHoursLabel(status: 'open' | 'closed' | 'closing_soon' | 'unknown'): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
    case 'closing_soon':
      return 'Closing soon';
    default:
      return 'Hours unknown';
  }
}

/**
 * Get weather variant based on precipitation
 */
export function getWeatherVariant(precipitationMm: number): InsightVariant {
  if (precipitationMm < 5) return 'success';
  if (precipitationMm < 15) return 'info';
  if (precipitationMm < 30) return 'warning';
  return 'danger';
}

export default InsightChip;
