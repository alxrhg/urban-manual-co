'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  DollarSign,
  Phone,
  Navigation,
  ExternalLink,
  FileText,
  Globe,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import type { TripSettings } from './types';

interface RestaurantPanelContentProps {
  item: ItineraryItem;
  destination?: Destination;
  onUpdate: (updates: Partial<ItineraryItem>) => void;
  tripSettings: TripSettings;
}

/**
 * RestaurantPanelContent - Restaurant detail panel content
 */
export default function RestaurantPanelContent({
  item,
  destination,
  onUpdate,
  tripSettings,
}: RestaurantPanelContentProps) {
  // Parse notes
  const parsedNotes: ItineraryItemNotes = item.notes
    ? (() => {
        try {
          return JSON.parse(item.notes);
        } catch {
          return { raw: item.notes };
        }
      })()
    : {};

  // Local state for editable fields
  const [time, setTime] = useState(item.time || '');
  const [partySize, setPartySize] = useState(parsedNotes.partySize || 2);
  const [bookingStatus, setBookingStatus] = useState(parsedNotes.bookingStatus || 'need-to-book');
  const [confirmationNumber, setConfirmationNumber] = useState(parsedNotes.confirmationNumber || '');
  const [notes, setNotes] = useState(parsedNotes.notes || parsedNotes.raw || '');

  // Get image from destination or parsed notes
  const imageUrl = destination?.image || destination?.image_thumbnail || parsedNotes.image;
  const address = destination?.formatted_address || destination?.vicinity || parsedNotes.address;
  const priceLevel = destination?.price_level;
  const phone = destination?.phone_number || destination?.international_phone_number;
  const website = destination?.website;
  const category = destination?.category || parsedNotes.category;

  // Get opening hours
  const openingHours = destination?.opening_hours_json as
    | { weekday_text?: string[]; open_now?: boolean }
    | undefined;
  const isOpenNow = openingHours?.open_now;
  const todayHours = getTodayHours(openingHours?.weekday_text);

  // Update notes in the item
  const updateNotes = (updates: Partial<ItineraryItemNotes>) => {
    const newNotes = { ...parsedNotes, ...updates };
    onUpdate({ notes: JSON.stringify(newNotes) });
  };

  // Handle time change
  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    onUpdate({ time: newTime });
  };

  // Handle party size change
  const handlePartySizeChange = (size: number) => {
    setPartySize(size);
    updateNotes({ partySize: size });
  };

  // Handle booking status change
  const handleBookingStatusChange = (value: string) => {
    const status = value as ItineraryItemNotes['bookingStatus'];
    setBookingStatus(status || 'need-to-book');
    updateNotes({ bookingStatus: status });
  };

  // Handle confirmation change
  const handleConfirmationChange = (value: string) => {
    setConfirmationNumber(value);
    updateNotes({ confirmationNumber: value });
  };

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
    updateNotes({ notes: value });
  };

  // Generate price display
  const priceDisplay = priceLevel
    ? Array.from({ length: priceLevel }, (_, i) => '$').join('')
    : null;

  // Get booking URLs
  const resyUrl = destination?.resy_url;
  const opentableUrl = destination?.opentable_url;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Hero Image */}
      {imageUrl && (
        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-900">
          <Image
            src={imageUrl}
            alt={item.title || destination?.name || 'Restaurant'}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-6 px-4 pb-4">
        {/* 2. Restaurant Info */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {item.title || destination?.name}
          </h2>

          {address && (
            <p className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {address}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            {priceDisplay && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {priceDisplay}
              </span>
            )}
            {category && (
              <>
                {priceDisplay && <span>·</span>}
                <span>{category}</span>
              </>
            )}
          </div>

          {todayHours && (
            <p className="flex items-center gap-1.5 text-sm mt-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span
                className={
                  isOpenNow
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }
              >
                {isOpenNow ? 'Open' : 'Closed'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">{todayHours}</span>
            </p>
          )}
        </section>

        {/* 3. Your Reservation */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Your Reservation
          </h3>

          {/* Date display */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDateFromDay(item.day, tripSettings.startDate)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time" className="text-xs text-gray-500">
                Time
              </Label>
              <Select value={time} onValueChange={handleTimeChange}>
                <SelectTrigger id="time" className="h-10">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {generateDiningTimes().map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTimeDisplay(t, tripSettings.timeFormat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="party" className="text-xs text-gray-500">
                Party size
              </Label>
              <Select
                value={String(partySize)}
                onValueChange={(v) => handlePartySizeChange(Number(v))}
              >
                <SelectTrigger id="party" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'guest' : 'guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs text-gray-500">
                Status
              </Label>
              <Select
                value={bookingStatus}
                onValueChange={handleBookingStatusChange}
              >
                <SelectTrigger id="status" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="need-to-book">Not booked</SelectItem>
                  <SelectItem value="booked">Booked</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation" className="text-xs text-gray-500">
                Confirmation
              </Label>
              <Input
                id="confirmation"
                value={confirmationNumber}
                onChange={(e) => handleConfirmationChange(e.target.value)}
                placeholder="Enter code"
                className="h-10 font-mono"
              />
            </div>
          </div>

          {/* Booking buttons */}
          {(resyUrl || opentableUrl) && bookingStatus === 'need-to-book' && (
            <div className="flex gap-2">
              {resyUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(resyUrl, '_blank')}
                >
                  Book on Resy
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
              {opentableUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(opentableUrl, '_blank')}
                >
                  Book on OpenTable
                  <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          )}
        </section>

        {/* 4. Notes */}
        <section className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium text-gray-900 dark:text-white">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Tips, dishes to try, dietary notes..."
            rows={3}
            className="resize-none"
          />
        </section>

        {/* 5. Actions */}
        <section className="space-y-2">
          {phone && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.open(`tel:${phone}`, '_self')}
            >
              <Phone className="w-4 h-4" />
              Call
            </Button>
          )}

          {(address || destination?.latitude) && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                if (destination?.latitude && destination?.longitude) {
                  window.open(
                    `https://maps.google.com/maps?q=${destination.latitude},${destination.longitude}`,
                    '_blank'
                  );
                } else {
                  const query = encodeURIComponent(
                    address || item.title || destination?.name || ''
                  );
                  window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
                }
              }}
            >
              <Navigation className="w-4 h-4" />
              Directions
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
            </Button>
          )}

          {website && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => window.open(`${website}/menu`, '_blank')}
              >
                <FileText className="w-4 h-4" />
                Menu
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => window.open(website, '_blank')}
              >
                <Globe className="w-4 h-4" />
                Website
                <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
              </Button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Get today's hours from weekday_text array
 */
function getTodayHours(weekdayText?: string[]): string | null {
  if (!weekdayText || !Array.isArray(weekdayText)) return null;
  const today = new Date().getDay();
  // weekday_text is usually Mon-Sun (0-6), but getDay() returns Sun=0, Mon=1, etc.
  const adjustedIndex = today === 0 ? 6 : today - 1;
  const todayText = weekdayText[adjustedIndex];
  if (!todayText) return null;
  // Remove day prefix like "Monday: "
  const colonIndex = todayText.indexOf(':');
  return colonIndex > -1 ? todayText.slice(colonIndex + 1).trim() : todayText;
}

/**
 * Format date from day number
 */
function formatDateFromDay(day: number, startDate?: string): string {
  if (!startDate) return `Day ${day}`;
  try {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day - 1);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return `Day ${day}`;
  }
}

/**
 * Generate dining time options
 */
function generateDiningTimes(): string[] {
  const times: string[] = [];
  // Lunch times: 11:00 - 14:30
  for (let h = 11; h <= 14; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 14 && m > 30) break;
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  // Dinner times: 17:00 - 22:00
  for (let h = 17; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return times;
}

/**
 * Format time for display
 */
function formatTimeDisplay(time: string, format?: '12h' | '24h'): string {
  if (format === '24h') return time;
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return time;
  }
}
