'use client';

import Image from 'next/image';
import { GripVertical, Clock, MapPin, X, Utensils, Coffee, Wine, Building2, Plane, Train, Bed, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripItineraryItemProps {
  item: EnrichedItineraryItem;
  isEditMode: boolean;
  isActive: boolean;
  showConnector: boolean;
  onEdit: () => void;
  onRemove?: () => void;
}

// Icon component that renders based on item type/category
function ItemIcon({ item }: { item: EnrichedItineraryItem }) {
  const type = item.parsedNotes?.type;
  const category = item.parsedNotes?.category || item.destination?.category;

  const iconClass = "w-6 h-6 text-gray-400 dark:text-gray-500";

  if (type === 'flight') return <Plane className={iconClass} />;
  if (type === 'train') return <Train className={iconClass} />;
  if (type === 'hotel') return <Bed className={iconClass} />;

  switch (category) {
    case 'restaurant':
    case 'dining':
      return <Utensils className={iconClass} />;
    case 'cafe':
    case 'coffee':
      return <Coffee className={iconClass} />;
    case 'bar':
    case 'cocktail_bar':
      return <Wine className={iconClass} />;
    case 'hotel':
    case 'accommodation':
      return <Bed className={iconClass} />;
    case 'attraction':
    case 'museum':
    case 'gallery':
      return <Building2 className={iconClass} />;
    default:
      return <MapPin className={iconClass} />;
  }
}

// Format time for display
function formatTime(time?: string | null) {
  if (!time) return null;
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  } catch {
    return time;
  }
}

export function TripItineraryItem({
  item,
  isEditMode,
  isActive,
  showConnector,
  onEdit,
  onRemove,
}: TripItineraryItemProps) {
  const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category;
  const duration = item.parsedNotes?.duration || 60;
  const rating = item.destination?.rating;

  return (
    <div className="relative">
      <div
        onClick={onEdit}
        className={cn(
          'group relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
          isActive
            ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800'
            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        )}
      >
        {/* Drag Handle (Edit Mode) */}
        {isEditMode && (
          <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        {/* Time */}
        <div className="flex-shrink-0 w-16 text-center">
          {item.time ? (
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatTime(item.time)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No time</span>
          )}
        </div>

        {/* Image or Icon */}
        <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          {image ? (
            <Image
              src={image}
              alt={item.title}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ItemIcon item={item} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.title}
          </h4>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {category && (
              <Badge variant="secondary" className="text-xs font-normal capitalize">
                {category.replace(/_/g, ' ')}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {duration} min
            </span>
            {rating && rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
          {item.parsedNotes?.notes && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {item.parsedNotes.notes}
            </p>
          )}
        </div>

        {/* Remove Button (Edit Mode) */}
        {isEditMode && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Connector Line */}
      {showConnector && (
        <div className="absolute left-[4.5rem] top-full h-2 w-px bg-gray-200 dark:bg-gray-800" />
      )}
    </div>
  );
}
