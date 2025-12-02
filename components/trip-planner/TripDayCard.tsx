'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, MapPin } from 'lucide-react';
import { TripItineraryItem } from './TripItineraryItem';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: EnrichedItineraryItem[];
}

interface TripDayCardProps {
  day: TripDay;
  isEditMode: boolean;
  activeItemId: string | null;
  onEditItem: (item: EnrichedItineraryItem) => void;
  onRemoveItem?: (itemId: string) => void;
  onAddItem: () => void;
}

export function TripDayCard({
  day,
  isEditMode,
  activeItemId,
  onEditItem,
  onRemoveItem,
  onAddItem,
}: TripDayCardProps) {
  // Format the date for display
  const formatDate = () => {
    if (!day.date) return null;
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate total duration for the day
  const totalDuration = day.items.reduce((acc, item) => {
    return acc + (item.parsedNotes?.duration || 60);
  }, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Day {day.dayNumber}</CardTitle>
            {formatDate() && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {day.items.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(totalDuration)}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs font-normal">
              {day.items.length} {day.items.length === 1 ? 'stop' : 'stops'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {day.items.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
            <MapPin className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              No activities planned for this day
            </p>
            <Button variant="outline" size="sm" onClick={onAddItem}>
              <Plus className="w-4 h-4 mr-1" />
              Add activity
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {day.items.map((item, index) => (
              <TripItineraryItem
                key={item.id}
                item={item}
                isEditMode={isEditMode}
                isActive={activeItemId === item.id}
                showConnector={index < day.items.length - 1}
                onEdit={() => onEditItem(item)}
                onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
              />
            ))}

            {/* Add more button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddItem}
              className="w-full border border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add more
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
