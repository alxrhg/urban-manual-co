'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Settings,
  Map,
  Sparkles,
  MapPin,
  Trash2,
  ExternalLink,
  Star,
  Loader2,
} from 'lucide-react';
import type { Trip, UpdateTrip } from '@/types/trip';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';

type SidebarView = 'suggestions' | 'settings' | 'map' | 'item';

interface TripSidebarProps {
  view: SidebarView;
  trip: Trip;
  days: TripDay[];
  destinations: string[];
  selectedDayNumber: number;
  selectedItem: EnrichedItineraryItem | null;
  activeItemId: string | null;
  onViewChange: (view: SidebarView) => void;
  onUpdateTrip: (updates: UpdateTrip) => Promise<void>;
  onDeleteTrip: () => void;
  onUpdateItemTime: (itemId: string, time: string) => void;
  onUpdateItem: (itemId: string, updates: Record<string, unknown>) => void;
  onRemoveItem: (itemId: string) => void;
  onCloseItem: () => void;
  onMarkerClick: (itemId: string | null) => void;
}

export function TripSidebar({
  view,
  trip,
  days,
  destinations,
  selectedDayNumber,
  selectedItem,
  activeItemId,
  onViewChange,
  onUpdateTrip,
  onDeleteTrip,
  onUpdateItemTime,
  onUpdateItem,
  onRemoveItem,
  onCloseItem,
  onMarkerClick,
}: TripSidebarProps) {
  // Settings state
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(destinations.join(', '));
  const [startDate, setStartDate] = useState(trip.start_date || '');
  const [endDate, setEndDate] = useState(trip.end_date || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when trip changes
  useEffect(() => {
    setTitle(trip.title);
    setDestination(destinations.join(', '));
    setStartDate(trip.start_date || '');
    setEndDate(trip.end_date || '');
  }, [trip, destinations]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onUpdateTrip({
        title,
        destination: destination || null,
        start_date: startDate || null,
        end_date: endDate || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Render based on view
  if (view === 'settings') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Trip Settings
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewChange('suggestions')}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Trip Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Trip"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Paris, London"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>

          <Separator />

          <Button
            variant="destructive"
            onClick={onDeleteTrip}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Trip
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view === 'map') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="w-4 h-4" />
              Route Map
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onViewChange('suggestions')}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Map view coming soon
            </p>
          </div>
          {/* Day items list for map */}
          <div className="mt-4 space-y-2">
            {days
              .find((d) => d.dayNumber === selectedDayNumber)
              ?.items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => onMarkerClick(item.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                    activeItemId === item.id
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm truncate">{item.title}</span>
                </button>
              ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (view === 'item' && selectedItem) {
    const image =
      selectedItem.destination?.image ||
      selectedItem.destination?.image_thumbnail ||
      selectedItem.parsedNotes?.image;

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base truncate pr-2">
              {selectedItem.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCloseItem}
              className="h-8 w-8 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image */}
          {image && (
            <div className="relative w-full h-40 rounded-lg overflow-hidden">
              <Image
                src={image}
                alt={selectedItem.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Category & Rating */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedItem.parsedNotes?.category && (
              <Badge variant="secondary" className="capitalize">
                {selectedItem.parsedNotes.category.replace(/_/g, ' ')}
              </Badge>
            )}
            {selectedItem.destination?.rating && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {selectedItem.destination.rating.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={selectedItem.time || ''}
              onChange={(e) => onUpdateItemTime(selectedItem.id, e.target.value)}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              value={selectedItem.parsedNotes?.duration || 60}
              onChange={(e) =>
                onUpdateItem(selectedItem.id, {
                  duration: parseInt(e.target.value) || 60,
                })
              }
            />
          </div>

          {/* Description */}
          {selectedItem.destination?.description && (
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedItem.destination.description}
              </p>
            </div>
          )}

          {/* Address */}
          {selectedItem.destination?.formatted_address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-600 dark:text-gray-300">
                {selectedItem.destination.formatted_address}
              </span>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {selectedItem.destination?.website && (
              <Button variant="outline" size="sm" asChild className="flex-1">
                <a
                  href={selectedItem.destination.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Website
                </a>
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemoveItem(selectedItem.id)}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default: Suggestions view
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Smart Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
          AI-powered suggestions will appear here based on your itinerary
        </p>
      </CardContent>
    </Card>
  );
}
