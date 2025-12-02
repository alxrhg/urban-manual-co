'use client';

import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Star,
  Trash2,
  Phone,
  Globe,
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface TripItemSheetProps {
  item: EnrichedItineraryItem | null;
  onClose: () => void;
  onTimeChange: (time: string) => void;
  onUpdate: (updates: Record<string, unknown>) => void;
  onRemove: () => void;
}

export function TripItemSheet({
  item,
  onClose,
  onTimeChange,
  onUpdate,
  onRemove,
}: TripItemSheetProps) {
  if (!item) return null;

  const image = item.destination?.image || item.destination?.image_thumbnail || item.parsedNotes?.image;
  const category = item.parsedNotes?.category || item.destination?.category;
  const rating = item.destination?.rating;
  const address = item.destination?.formatted_address || item.parsedNotes?.address;
  const website = item.destination?.website || item.parsedNotes?.website;
  const phone = item.parsedNotes?.phone;
  const description = item.destination?.description || item.destination?.micro_description;

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        {/* Image Header */}
        {image && (
          <div className="relative w-full h-48 -mt-6">
            <Image
              src={image}
              alt={item.title}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        <div className="px-6 py-4 space-y-6 overflow-auto max-h-[calc(85vh-12rem)]">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl">{item.title}</SheetTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {category && (
                <Badge variant="secondary" className="capitalize">
                  {category.replace(/_/g, ' ')}
                </Badge>
              )}
              {rating && rating > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {rating.toFixed(1)}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {description}
            </p>
          )}

          {/* Address */}
          {address && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{address}</p>
            </div>
          )}

          {/* Contact */}
          {(phone || website) && (
            <div className="flex gap-3">
              {phone && (
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={`tel:${phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
              {website && (
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a href={website} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4 mr-2" />
                    Website
                  </a>
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Start Time</Label>
              <Input
                type="time"
                value={item.time || ''}
                onChange={(e) => onTimeChange(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-gray-500">Duration (min)</Label>
              <Input
                type="number"
                min={15}
                step={15}
                value={item.parsedNotes?.duration || 60}
                onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 60 })}
                className="h-12"
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <Button
            variant="destructive"
            onClick={onRemove}
            className="w-full h-12"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove from trip
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
