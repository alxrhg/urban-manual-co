'use client';

import { memo, useState } from 'react';
import Image from 'next/image';
import {
  GripVertical,
  Clock,
  MapPin,
  Plane,
  Utensils,
  Camera,
  Coffee,
  Hotel,
  Navigation,
  MoreHorizontal,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  CloudRain,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { TimeBlock, CrowdLevel } from '@/services/intelligence/planner/types';

interface TimeBlockCardProps {
  block: TimeBlock;
  /** Order number for display (1, 2, 3...) */
  orderNumber?: number;
  /** Is this block currently being dragged */
  isDragging?: boolean;
  /** Is this block expanded */
  isExpanded?: boolean;
  /** Callbacks */
  onEdit?: () => void;
  onRemove?: () => void;
  onToggleLock?: () => void;
  onSwap?: () => void;
  onToggleExpand?: () => void;
  onTimeChange?: (time: string) => void;
  /** Drag handle props from dnd-kit */
  dragHandleProps?: any;
  /** Show connector line to next item */
  showConnector?: boolean;
  /** Compact mode for dense timelines */
  compact?: boolean;
}

// Icon mapping for block types
const TYPE_ICONS: Record<string, React.ReactNode> = {
  activity: <Camera className="w-4 h-4" />,
  meal: <Utensils className="w-4 h-4" />,
  transit: <Navigation className="w-4 h-4" />,
  lodging: <Hotel className="w-4 h-4" />,
  flight: <Plane className="w-4 h-4" />,
  gap: <Coffee className="w-4 h-4" />,
};

// Color mapping for crowd levels
const CROWD_COLORS: Record<CrowdLevel, { text: string; bg: string }> = {
  low: { text: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  moderate: { text: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  high: { text: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  very_high: { text: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

// Badge styles
const BADGE_STYLES: Record<string, { icon: React.ReactNode; className: string }> = {
  'High Demand': {
    icon: <Users className="w-3 h-3" />,
    className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  },
  'Rainy Day Option': {
    icon: <CloudRain className="w-3 h-3" />,
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
  'Weather Alert': {
    icon: <AlertTriangle className="w-3 h-3" />,
    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  },
  'AI Suggested': {
    icon: <Sparkles className="w-3 h-3" />,
    className: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const TimeBlockCard = memo(function TimeBlockCard({
  block,
  orderNumber,
  isDragging,
  isExpanded,
  onEdit,
  onRemove,
  onToggleLock,
  onSwap,
  onToggleExpand,
  onTimeChange,
  dragHandleProps,
  showConnector,
  compact = false,
}: TimeBlockCardProps) {
  const [showActions, setShowActions] = useState(false);

  const isTransit = block.type === 'transit';
  const isFlight = block.type === 'flight';
  const smartData = block.smartData;
  const badge = smartData?.badge;
  const badgeStyle = badge ? BADGE_STYLES[badge] : null;
  const crowdLevel = smartData?.crowdLevel;
  const crowdStyle = crowdLevel ? CROWD_COLORS[crowdLevel] : null;

  // Transit block has simpler rendering
  if (isTransit) {
    return (
      <div className="relative py-2 pl-8">
        {/* Connector line */}
        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {smartData?.transitMode === 'walk' ? (
              <span className="text-[10px]">🚶</span>
            ) : smartData?.transitMode === 'transit' ? (
              <span className="text-[10px]">🚇</span>
            ) : (
              <span className="text-[10px]">🚗</span>
            )}
          </div>
          <span className="font-medium">{formatDuration(block.durationMinutes)}</span>
          {smartData?.transitDistanceKm && (
            <span className="opacity-70">{smartData.transitDistanceKm.toFixed(1)}km</span>
          )}
        </div>
      </div>
    );
  }

  // Main block rendering
  return (
    <div className="relative">
      {/* Connector line */}
      {showConnector && (
        <div className="absolute left-[22px] top-full h-4 w-px bg-gray-200 dark:bg-gray-700 z-0" />
      )}

      <div
        className={`
          group relative rounded-2xl border transition-all duration-200
          ${isDragging
            ? 'shadow-xl border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-800 z-50 scale-[1.02]'
            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
          }
          ${isFlight ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50' : ''}
          ${block.isLocked ? 'ring-2 ring-amber-400/50' : ''}
        `}
      >
        <div className={`flex items-start gap-3 ${compact ? 'p-2' : 'p-3'}`}>
          {/* Drag Handle + Order Number */}
          <div className="flex flex-col items-center gap-1">
            <div
              {...dragHandleProps}
              className="p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 touch-none rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
            {orderNumber && (
              <span className="w-6 h-6 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center">
                {orderNumber}
              </span>
            )}
          </div>

          {/* Time Input */}
          <div className="flex-shrink-0">
            <div className="relative">
              <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              <input
                type="time"
                value={block.startTime || ''}
                onChange={(e) => onTimeChange?.(e.target.value)}
                className="w-[80px] pl-6 pr-1 py-1 text-xs font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100"
                placeholder="--:--"
              />
            </div>
            {block.endTime && (
              <div className="text-[10px] text-gray-400 mt-0.5 text-center">
                → {block.endTime}
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div className={`
            relative flex-shrink-0 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800
            ${compact ? 'w-10 h-10' : 'w-12 h-12'}
            ${isFlight ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}
          `}>
            {block.place?.image || block.place?.imageThumbnail ? (
              <Image
                src={block.place.imageThumbnail || block.place.image || ''}
                alt={block.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                {TYPE_ICONS[block.type] || <MapPin className="w-5 h-5" />}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0" onClick={onEdit}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className={`font-medium text-gray-900 dark:text-white truncate ${compact ? 'text-sm' : 'text-sm'}`}>
                  {block.title}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {block.category && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                      {block.category}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400">
                    {formatDuration(block.durationMinutes)}
                  </span>
                </div>
              </div>

              {/* Lock indicator */}
              {block.isLocked && (
                <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              )}
            </div>

            {/* Smart Badges */}
            {(badge || crowdLevel) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {badgeStyle && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badgeStyle.className}`}>
                    {badgeStyle.icon}
                    {badge}
                  </span>
                )}
                {crowdStyle && crowdLevel !== 'low' && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${crowdStyle.bg} ${crowdStyle.text}`}>
                    <Users className="w-3 h-3" />
                    {crowdLevel === 'high' ? 'Busy' : crowdLevel === 'very_high' ? 'Very Busy' : 'Moderate'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Action Menu */}
              {showActions && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {onToggleLock && (
                    <button
                      onClick={() => { onToggleLock(); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {block.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      {block.isLocked ? 'Unlock' : 'Lock Position'}
                    </button>
                  )}
                  {onSwap && (
                    <button
                      onClick={() => { onSwap(); setShowActions(false); }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Swap Place
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove "${block.title}" from itinerary?`)) {
                          onRemove();
                        }
                        setShowActions(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && block.notes && (
          <div className="px-4 pb-3 pt-0 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 mt-2">
            {block.notes}
          </div>
        )}
      </div>
    </div>
  );
});

export default TimeBlockCard;
