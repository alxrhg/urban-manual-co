'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Clock,
  Ticket,
  Timer,
  Navigation,
  ExternalLink,
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

interface AttractionPanelContentProps {
  item: ItineraryItem;
  destination?: Destination;
  onUpdate: (updates: Partial<ItineraryItem>) => void;
  tripSettings: TripSettings;
}

/**
 * AttractionPanelContent - Attraction/museum detail panel content
 */
export default function AttractionPanelContent({
  item,
  destination,
  onUpdate,
  tripSettings,
}: AttractionPanelContentProps) {
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
  const [duration, setDuration] = useState(parsedNotes.duration || 120); // Default 2 hours
  const [partySize, setPartySize] = useState(parsedNotes.partySize || 2);
  const [ticketStatus, setTicketStatus] = useState(
    parsedNotes.bookingStatus || 'need-to-book'
  );
  const [confirmationNumber, setConfirmationNumber] = useState(
    parsedNotes.ticketConfirmation || parsedNotes.confirmationNumber || ''
  );
  const [notes, setNotes] = useState(parsedNotes.notes || parsedNotes.raw || '');

  // Get image from destination or parsed notes
  const imageUrl = destination?.image || destination?.image_thumbnail || parsedNotes.image;
  const address = destination?.formatted_address || destination?.vicinity || parsedNotes.address;
  const website = destination?.website;

  // Get opening hours
  const openingHours = destination?.opening_hours_json as
    | { weekday_text?: string[]; open_now?: boolean }
    | undefined;
  const isOpenNow = openingHours?.open_now;
  const todayHours = getTodayHours(openingHours?.weekday_text);
  const closedDays = getClosedDays(openingHours?.weekday_text);

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

  // Handle duration change
  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    updateNotes({ duration: mins });
  };

  // Handle party size change
  const handlePartySizeChange = (size: number) => {
    setPartySize(size);
    updateNotes({ partySize: size });
  };

  // Handle ticket status change
  const handleTicketStatusChange = (value: string) => {
    const status = value as ItineraryItemNotes['bookingStatus'];
    setTicketStatus(status || 'need-to-book');
    updateNotes({ bookingStatus: status });
  };

  // Handle confirmation change
  const handleConfirmationChange = (value: string) => {
    setConfirmationNumber(value);
    updateNotes({ ticketConfirmation: value });
  };

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
    updateNotes({ notes: value });
  };

  // Format duration for display
  const formatDuration = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Hero Image */}
      {imageUrl && (
        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-900">
          <Image
            src={imageUrl}
            alt={item.title || destination?.name || 'Attraction'}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-6 px-4 pb-4">
        {/* 2. Attraction Info */}
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

          {/* Opening hours */}
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
              {closedDays && (
                <span className="text-gray-400 dark:text-gray-500">
                  · Closed {closedDays}
                </span>
              )}
            </p>
          )}

          {/* Ticket info placeholder - could be enriched from destination data */}
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5" />
              Admission varies
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              Typical visit: {formatDuration(duration)}
            </span>
          </div>
        </section>

        {/* 3. Your Visit */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Your Visit</h3>

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
                  {generateAttractionTimes().map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTimeDisplay(t, tripSettings.timeFormat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="text-xs text-gray-500">
                Duration
              </Label>
              <Select
                value={String(duration)}
                onValueChange={(v) => handleDurationChange(Number(v))}
              >
                <SelectTrigger id="duration" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="150">2.5 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="300">5 hours</SelectItem>
                  <SelectItem value="360">6 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="party" className="text-xs text-gray-500">
              Party size
            </Label>
            <Select
              value={String(partySize)}
              onValueChange={(v) => handlePartySizeChange(Number(v))}
            >
              <SelectTrigger id="party" className="h-10 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tickets" className="text-xs text-gray-500">
                Tickets
              </Label>
              <Select
                value={ticketStatus}
                onValueChange={handleTicketStatusChange}
              >
                <SelectTrigger id="tickets" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="need-to-book">Not purchased</SelectItem>
                  <SelectItem value="booked">Purchased</SelectItem>
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

          {/* Buy tickets button */}
          {ticketStatus === 'need-to-book' && website && (
            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => window.open(`${website}/tickets`, '_blank')}
            >
              <Ticket className="w-4 h-4" />
              Buy tickets
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
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
            placeholder="Tips, must-see exhibits, skip-the-line info..."
            rows={3}
            className="resize-none"
          />
        </section>

        {/* 5. Actions */}
        <section className="space-y-2">
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
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.open(website, '_blank')}
            >
              <Globe className="w-4 h-4" />
              Website
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
            </Button>
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
  const adjustedIndex = today === 0 ? 6 : today - 1;
  const todayText = weekdayText[adjustedIndex];
  if (!todayText) return null;
  const colonIndex = todayText.indexOf(':');
  return colonIndex > -1 ? todayText.slice(colonIndex + 1).trim() : todayText;
}

/**
 * Get closed days from weekday_text
 */
function getClosedDays(weekdayText?: string[]): string | null {
  if (!weekdayText || !Array.isArray(weekdayText)) return null;
  const closedDays: string[] = [];
  const dayNames = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

  weekdayText.forEach((text, index) => {
    if (text.toLowerCase().includes('closed')) {
      closedDays.push(dayNames[index]);
    }
  });

  if (closedDays.length === 0) return null;
  return closedDays.join(', ');
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
 * Generate attraction time options (morning to evening)
 */
function generateAttractionTimes(): string[] {
  const times: string[] = [];
  for (let h = 8; h <= 18; h++) {
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
