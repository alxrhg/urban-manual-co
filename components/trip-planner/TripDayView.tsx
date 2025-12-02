'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Clock,
  Plane,
  Train,
  Bed,
  Utensils,
  Coffee,
  Wine,
  Building2,
  Plus,
  Star,
} from 'lucide-react';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';

interface TripDayViewProps {
  day: TripDay;
  onItemClick: (item: EnrichedItineraryItem) => void;
  onAddClick: () => void;
}

function getIcon(item: EnrichedItineraryItem) {
  const type = item.parsedNotes?.type;
  const category = item.parsedNotes?.category || item.destination?.category;

  if (type === 'flight') return Plane;
  if (type === 'train') return Train;
  if (type === 'hotel') return Bed;

  switch (category) {
    case 'restaurant':
    case 'dining':
      return Utensils;
    case 'cafe':
    case 'coffee':
      return Coffee;
    case 'bar':
    case 'cocktail_bar':
      return Wine;
    case 'hotel':
    case 'accommodation':
      return Bed;
    case 'attraction':
    case 'museum':
    case 'gallery':
      return Building2;
    default:
      return MapPin;
  }
}

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

export function TripDayView({ day, onItemClick, onAddClick }: TripDayViewProps) {
  if (day.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <MapPin className="w-7 h-7 text-gray-400" />
        </div>
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
          Day {day.dayNumber} is empty
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
          Add places, flights, or activities
        </p>
        <Button onClick={onAddClick}>
          <Plus className="w-4 h-4 mr-2" />
          Add first item
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {day.items.map((item) => {
        const Icon = getIcon(item);
        const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
        const category = item.parsedNotes?.category || item.destination?.category;
        const duration = item.parsedNotes?.duration;
        const rating = item.destination?.rating;

        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl p-4 flex gap-4 text-left active:scale-[0.98] transition-transform border border-gray-100 dark:border-gray-800"
          >
            {/* Image/Icon */}
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
              {image ? (
                <Image
                  src={image}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Time */}
              {item.time && (
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                  {formatTime(item.time)}
                </p>
              )}

              {/* Title */}
              <h4 className="text-base font-medium text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {category && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {category.replace(/_/g, ' ')}
                  </Badge>
                )}
                {duration && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {duration}m
                  </span>
                )}
                {rating && rating > 0 && (
                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Add more */}
      <Button
        variant="outline"
        onClick={onAddClick}
        className="w-full h-14 border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add more
      </Button>
    </div>
  );
}
