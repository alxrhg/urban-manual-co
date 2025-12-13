'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Plane,
  Train,
  Building2,
  Clock,
  GripVertical,
  X,
  ChevronRight,
  Utensils,
  Coffee,
  Wine,
  Camera,
  Palette,
} from 'lucide-react';
import { cn, textStyles, iconSize, tripStyles, button } from '@/lib/design-tokens';
import type {
  TripItem,
  PlaceItem,
  FlightItem,
  TrainItem,
  HotelItem,
  ActivityItem,
} from '../types';

// ============================================
// TYPES
// ============================================

interface TripItemRowProps {
  /** The trip item to render */
  item: TripItem;
  /** Whether the item is selected */
  isSelected?: boolean;
  /** Whether the item is being dragged */
  isDragging?: boolean;
  /** Whether to show the drag handle */
  showDragHandle?: boolean;
  /** Whether to show the remove button */
  showRemoveButton?: boolean;
  /** Whether to show the time */
  showTime?: boolean;
  /** Variant */
  variant?: 'default' | 'compact' | 'expanded';
  /** Click handler */
  onClick?: () => void;
  /** Remove handler */
  onRemove?: () => void;
  /** Drag handle props */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** Additional class names */
  className?: string;
}

// ============================================
// UTILITIES
// ============================================

/**
 * Get icon for item type
 */
function getItemIcon(item: TripItem): React.ReactNode {
  switch (item.type) {
    case 'flight':
      return <Plane className={iconSize.sm} />;
    case 'train':
      return <Train className={iconSize.sm} />;
    case 'hotel':
      return <Building2 className={iconSize.sm} />;
    case 'activity':
      return <Clock className={iconSize.sm} />;
    case 'place':
      return getCategoryIcon(item.destination.category);
    default:
      return <MapPin className={iconSize.sm} />;
  }
}

/**
 * Get icon for place category
 */
function getCategoryIcon(category?: string | null): React.ReactNode {
  if (!category) return <MapPin className={iconSize.sm} />;

  const cat = category.toLowerCase();

  if (cat.includes('restaurant') || cat.includes('dining')) {
    return <Utensils className={iconSize.sm} />;
  }
  if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('bakery') || cat.includes('breakfast')) {
    return <Coffee className={iconSize.sm} />;
  }
  if (cat.includes('bar') || cat.includes('cocktail') || cat.includes('wine')) {
    return <Wine className={iconSize.sm} />;
  }
  if (cat.includes('museum') || cat.includes('landmark') || cat.includes('temple') || cat.includes('shrine')) {
    return <Camera className={iconSize.sm} />;
  }
  if (cat.includes('gallery') || cat.includes('art')) {
    return <Palette className={iconSize.sm} />;
  }

  return <MapPin className={iconSize.sm} />;
}

/**
 * Get title for item
 */
function getItemTitle(item: TripItem): string {
  switch (item.type) {
    case 'place':
      return item.destination.name;
    case 'flight':
      return `${item.airline || ''} ${item.flightNumber || 'Flight'}`.trim();
    case 'train':
      return item.trainLine
        ? `${item.trainLine}${item.trainNumber ? ` ${item.trainNumber}` : ''}`
        : `Train ${item.trainNumber || ''}`;
    case 'hotel':
      return item.name;
    case 'activity':
      return item.title;
    default:
      return 'Unknown';
  }
}

/**
 * Get subtitle for item
 */
function getItemSubtitle(item: TripItem): string | null {
  switch (item.type) {
    case 'place':
      return item.destination.category || item.destination.city || null;
    case 'flight':
      return `${item.from || ''} → ${item.to || ''}`;
    case 'train':
      return `${item.from || ''} → ${item.to || ''}`;
    case 'hotel':
      return item.address || null;
    case 'activity':
      return item.description || null;
    default:
      return null;
  }
}

/**
 * Get image URL for item
 */
function getItemImage(item: TripItem): string | null {
  if (item.type === 'place') {
    return item.destination.image_thumbnail || item.destination.image || null;
  }
  if (item.type === 'hotel') {
    return item.image || null;
  }
  return null;
}

/**
 * Format time for display
 */
function formatTime(time?: string): string {
  if (!time) return '';
  return time;
}

// ============================================
// COMPONENT VARIANTS
// ============================================

function CompactRow({ item, isSelected, onClick, showTime, className }: {
  item: TripItem;
  isSelected?: boolean;
  onClick?: () => void;
  showTime?: boolean;
  className?: string;
}) {
  const title = getItemTitle(item);
  const subtitle = getItemSubtitle(item);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-lg',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
        isSelected && 'bg-gray-100 dark:bg-gray-800',
        className
      )}
    >
      {showTime && (
        <span className={cn(textStyles.caption, 'font-mono tabular-nums w-12')}>
          {formatTime(item.timeSlot)}
        </span>
      )}

      <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
        {getItemIcon(item)}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(textStyles.cardTitle, 'truncate')}>{title}</p>
        {subtitle && (
          <p className={cn(textStyles.caption, 'truncate')}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function ExpandedRow({ item, isSelected, onClick, onRemove, showTime, className }: {
  item: TripItem;
  isSelected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  showTime?: boolean;
  className?: string;
}) {
  const title = getItemTitle(item);
  const subtitle = getItemSubtitle(item);
  const image = getItemImage(item);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900',
        isSelected && 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-900',
        className
      )}
    >
      {showTime && (
        <div className="flex-shrink-0 text-center">
          <span className="text-lg font-mono tabular-nums text-gray-900 dark:text-white">
            {formatTime(item.timeSlot)}
          </span>
        </div>
      )}

      {/* Image or Icon */}
      <div className="flex-shrink-0">
        {image ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={image}
              alt={title}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            {getItemIcon(item)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(textStyles.cardTitle, 'truncate')}>{title}</p>
        {subtitle && (
          <p className={cn(textStyles.bodySecondary, 'truncate mt-0.5')}>{subtitle}</p>
        )}
        {item.notes && (
          <p className={cn(textStyles.caption, 'truncate mt-1')}>{item.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cn(button.iconSmall, 'text-gray-400 hover:text-red-500')}
            title="Remove"
          >
            <X className={iconSize.sm} />
          </button>
        )}
        {onClick && (
          <ChevronRight className={cn(iconSize.sm, 'text-gray-400')} />
        )}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

/**
 * TripItemRow - Unified row component for any trip item type
 *
 * Variants:
 * - default: Standard row with optional drag handle
 * - compact: Minimal row for lists
 * - expanded: Card-style row with image
 */
export function TripItemRow({
  item,
  isSelected = false,
  isDragging = false,
  showDragHandle = false,
  showRemoveButton = false,
  showTime = true,
  variant = 'default',
  onClick,
  onRemove,
  dragHandleProps,
  className,
}: TripItemRowProps) {
  // Memoize computed values
  const title = useMemo(() => getItemTitle(item), [item]);
  const subtitle = useMemo(() => getItemSubtitle(item), [item]);
  const image = useMemo(() => getItemImage(item), [item]);

  // Compact variant
  if (variant === 'compact') {
    return (
      <CompactRow
        item={item}
        isSelected={isSelected}
        onClick={onClick}
        showTime={showTime}
        className={className}
      />
    );
  }

  // Expanded variant
  if (variant === 'expanded') {
    return (
      <ExpandedRow
        item={item}
        isSelected={isSelected}
        onClick={onClick}
        onRemove={onRemove}
        showTime={showTime}
        className={className}
      />
    );
  }

  // Default variant
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === 'Enter' && onClick()}
      className={cn(
        isSelected ? tripStyles.itemRowSelected : tripStyles.itemRow,
        isDragging && 'opacity-50 shadow-lg',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Drag Handle */}
      {showDragHandle && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500"
        >
          <GripVertical className={iconSize.sm} />
        </div>
      )}

      {/* Time */}
      {showTime && (
        <span className={tripStyles.itemTime}>
          {formatTime(item.timeSlot)}
        </span>
      )}

      {/* Image or Icon */}
      <div className="flex-shrink-0">
        {image ? (
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={image}
              alt={title}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
            {getItemIcon(item)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={tripStyles.itemTitle}>{title}</p>
        {subtitle && (
          <p className={tripStyles.itemMeta}>{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showRemoveButton && onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={cn(button.iconSmall, 'text-gray-400 hover:text-red-500')}
            title="Remove"
          >
            <X className={iconSize.sm} />
          </button>
        )}
        {onClick && (
          <ChevronRight className={cn(iconSize.sm, 'text-gray-400')} />
        )}
      </div>
    </div>
  );
}

export default TripItemRow;
