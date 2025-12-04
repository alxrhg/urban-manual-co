'use client';

import { useState } from 'react';
import {
  Plane,
  Clock,
  ArrowRight,
  Calendar,
  ExternalLink,
  CalendarPlus,
  Briefcase,
  Luggage,
  CreditCard,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Flight, TripSettings } from './types';

interface FlightPanelContentProps {
  flight: Flight;
  onUpdate: (updates: Partial<Flight>) => void;
  tripSettings: TripSettings;
}

/**
 * FlightPanelContent - Flight detail panel content
 *
 * Sections:
 * 1. Route Summary
 * 2. Departure / Arrival Grid
 * 3. Booking Details
 * 4. Seat & Bags
 * 5. Lounge Access
 * 6. Notes
 * 7. Actions
 */
export default function FlightPanelContent({
  flight,
  onUpdate,
  tripSettings,
}: FlightPanelContentProps) {
  const [loungeAccess, setLoungeAccess] = useState(flight.loungeAccess ?? false);

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      if (tripSettings.timeFormat === '24h') {
        return timeStr;
      }
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeStr;
    }
  };

  // Calculate flight duration
  const calculateDuration = () => {
    if (flight.duration) {
      const hours = Math.floor(flight.duration / 60);
      const mins = flight.duration % 60;
      return `${hours}h ${mins}m`;
    }
    return null;
  };

  const handleLoungeChange = (checked: boolean) => {
    setLoungeAccess(checked);
    onUpdate({ loungeAccess: checked });
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* 1. Route Summary */}
      <section>
        <div className="flex items-center justify-center gap-3 text-2xl font-semibold text-gray-900 dark:text-white">
          <span>{flight.from}</span>
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <span>{flight.to}</span>
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(flight.departureDate)}
        </p>
      </section>

      {/* 2. Departure / Arrival Grid */}
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800">
          {/* Departure */}
          <div className="p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Departure
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatTime(flight.departureTime)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {flight.fromCity || flight.from} ({flight.from})
            </p>
            <div className="mt-2 space-y-0.5 text-sm text-gray-500 dark:text-gray-400">
              <p>Terminal {flight.terminal || '--'}</p>
              <p>Gate {flight.gate || '--'}</p>
            </div>
          </div>

          {/* Arrival */}
          <div className="p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Arrival
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatTime(flight.arrivalTime)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {flight.toCity || flight.to} ({flight.to})
            </p>
            <div className="mt-2 space-y-0.5 text-sm text-gray-500 dark:text-gray-400">
              <p>Terminal {flight.arrivalTerminal || '--'}</p>
              <p>Gate {flight.arrivalGate || '--'}</p>
            </div>
          </div>
        </div>

        {/* Duration */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            <Clock className="w-3.5 h-3.5 inline mr-1.5" />
            {calculateDuration() || 'Duration unknown'} · Direct flight
          </p>
        </div>
      </section>

      {/* 3. Booking Details */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Booking Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status" className="text-xs text-gray-500">
              Status
            </Label>
            <Select
              value={flight.bookingStatus || 'pending'}
              onValueChange={(value) =>
                onUpdate({ bookingStatus: value as Flight['bookingStatus'] })
              }
            >
              <SelectTrigger id="status" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-xs text-gray-500">
              Confirmation
            </Label>
            <Input
              id="confirmation"
              value={flight.confirmationNumber || ''}
              onChange={(e) => onUpdate({ confirmationNumber: e.target.value })}
              placeholder="ABC123"
              className="h-10 font-mono"
            />
          </div>
        </div>
      </section>

      {/* 4. Seat & Bags */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Seat & Bags
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="class" className="text-xs text-gray-500">
              Class
            </Label>
            <Select
              value={flight.cabinClass || 'economy'}
              onValueChange={(value) =>
                onUpdate({ cabinClass: value as Flight['cabinClass'] })
              }
            >
              <SelectTrigger id="class" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">Economy</SelectItem>
                <SelectItem value="premium-economy">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seat" className="text-xs text-gray-500">
              Seat
            </Label>
            <Input
              id="seat"
              value={flight.seatNumber || ''}
              onChange={(e) => onUpdate({ seatNumber: e.target.value })}
              placeholder="12A"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="carryon" className="text-xs text-gray-500">
              Carry-on
            </Label>
            <Select
              value={String(flight.bagsCarryOn ?? 1)}
              onValueChange={(value) => onUpdate({ bagsCarryOn: Number(value) })}
            >
              <SelectTrigger id="carryon" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No carry-on</SelectItem>
                <SelectItem value="1">1 carry-on</SelectItem>
                <SelectItem value="2">2 carry-ons</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checked" className="text-xs text-gray-500">
              Checked
            </Label>
            <Select
              value={String(flight.bagsChecked ?? 0)}
              onValueChange={(value) => onUpdate({ bagsChecked: Number(value) })}
            >
              <SelectTrigger id="checked" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No checked bags</SelectItem>
                <SelectItem value="1">1 checked</SelectItem>
                <SelectItem value="2">2 checked</SelectItem>
                <SelectItem value="3">3 checked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="frequent-flyer" className="text-xs text-gray-500">
            Frequent flyer number
          </Label>
          <Input
            id="frequent-flyer"
            value={flight.frequentFlyerNumber || ''}
            onChange={(e) => onUpdate({ frequentFlyerNumber: e.target.value })}
            placeholder="Enter number"
            className="h-10"
          />
        </div>
      </section>

      {/* 5. Lounge Access */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id="lounge-access"
            checked={loungeAccess}
            onCheckedChange={handleLoungeChange}
          />
          <Label
            htmlFor="lounge-access"
            className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
          >
            Airport lounge access
          </Label>
        </div>

        {loungeAccess && (
          <div className="pl-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lounge-name" className="text-xs text-gray-500">
                Lounge
              </Label>
              <Input
                id="lounge-name"
                value={flight.loungeName || ''}
                onChange={(e) => onUpdate({ loungeName: e.target.value })}
                placeholder="Admirals Club"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lounge-location" className="text-xs text-gray-500">
                Location
              </Label>
              <Input
                id="lounge-location"
                value={flight.loungeLocation || ''}
                onChange={(e) => onUpdate({ loungeLocation: e.target.value })}
                placeholder="Terminal C, near Gate 24"
                className="h-10"
              />
            </div>
          </div>
        )}
      </section>

      {/* 6. Notes */}
      <section className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium text-gray-900 dark:text-white">
          Notes
        </Label>
        <Textarea
          id="notes"
          value={flight.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="Add notes about this flight..."
          rows={3}
          className="resize-none"
        />
      </section>

      {/* 7. Actions */}
      <section className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            // Open airline check-in page
            const airlineUrl = getAirlineCheckInUrl(flight.airline);
            if (airlineUrl) window.open(airlineUrl, '_blank');
          }}
        >
          <Plane className="w-4 h-4" />
          Check in on {flight.airline}
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => {
            // Generate calendar event
            const calendarUrl = generateCalendarUrl(flight);
            if (calendarUrl) window.open(calendarUrl, '_blank');
          }}
        >
          <CalendarPlus className="w-4 h-4" />
          Add to calendar
          <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
        </Button>
      </section>
    </div>
  );
}

/**
 * Get airline check-in URL
 */
function getAirlineCheckInUrl(airline: string): string | null {
  const airlineUrls: Record<string, string> = {
    'United': 'https://www.united.com/en/us/checkin',
    'American': 'https://www.aa.com/homePage.do',
    'Delta': 'https://www.delta.com/mytrips/',
    'Southwest': 'https://www.southwest.com/air/check-in/',
    'JetBlue': 'https://www.jetblue.com/manage-trips',
    'Alaska': 'https://www.alaskaair.com/booking/checkin',
    'Spirit': 'https://www.spirit.com/check-in',
    'Frontier': 'https://www.flyfrontier.com/travel/my-trips/',
  };

  const key = Object.keys(airlineUrls).find((k) =>
    airline.toLowerCase().includes(k.toLowerCase())
  );
  return key ? airlineUrls[key] : null;
}

/**
 * Generate Google Calendar URL
 */
function generateCalendarUrl(flight: Flight): string {
  const title = encodeURIComponent(
    `${flight.airline} ${flight.flightNumber}: ${flight.from} → ${flight.to}`
  );
  const startDate = flight.departureDate.replace(/-/g, '');
  const startTime = flight.departureTime.replace(/:/g, '') + '00';
  const endDate = flight.arrivalDate.replace(/-/g, '');
  const endTime = flight.arrivalTime.replace(/:/g, '') + '00';

  const details = encodeURIComponent(
    [
      `Flight: ${flight.airline} ${flight.flightNumber}`,
      `Confirmation: ${flight.confirmationNumber || 'N/A'}`,
      `Departure: ${flight.from}${flight.terminal ? `, Terminal ${flight.terminal}` : ''}${flight.gate ? `, Gate ${flight.gate}` : ''}`,
      `Arrival: ${flight.to}${flight.arrivalTerminal ? `, Terminal ${flight.arrivalTerminal}` : ''}`,
      flight.seatNumber ? `Seat: ${flight.seatNumber}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  );

  const location = encodeURIComponent(`${flight.from} Airport`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}T${startTime}/${endDate}T${endTime}&details=${details}&location=${location}`;
}
