'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Star,
  Phone,
  Navigation,
  ExternalLink,
  Clock,
  Utensils,
  Waves,
  Dumbbell,
  Sparkles,
  Crown,
  Car,
  Wifi,
  Bus,
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
import type { HotelBooking, TripSettings } from './types';

interface HotelPanelContentProps {
  hotel: HotelBooking;
  onUpdate: (updates: Partial<HotelBooking>) => void;
  tripSettings: TripSettings;
}

/**
 * HotelPanelContent - Hotel detail panel content
 */
export default function HotelPanelContent({
  hotel,
  onUpdate,
  tripSettings,
}: HotelPanelContentProps) {
  // Local state for amenity toggles
  const [amenities, setAmenities] = useState({
    breakfastIncluded: hotel.breakfastIncluded ?? false,
    hasPool: hotel.hasPool ?? false,
    hasGym: hotel.hasGym ?? false,
    hasSpa: hotel.hasSpa ?? false,
    hasClubLounge: hotel.hasClubLounge ?? false,
    hasParking: hotel.hasParking ?? false,
    wifiIncluded: hotel.wifiIncluded ?? false,
    hasAirportShuttle: hotel.hasAirportShuttle ?? false,
  });

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate nights
  const calculateNights = () => {
    if (!hotel.checkInDate || !hotel.checkOutDate) return 0;
    try {
      const checkIn = new Date(hotel.checkInDate);
      const checkOut = new Date(hotel.checkOutDate);
      const diff = checkOut.getTime() - checkIn.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch {
      return hotel.nights || 0;
    }
  };

  const nights = calculateNights();
  const totalCost = hotel.ratePerNight ? hotel.ratePerNight * nights : hotel.totalCost;

  const handleAmenityChange = (key: keyof typeof amenities, checked: boolean) => {
    setAmenities((prev) => ({ ...prev, [key]: checked }));
    onUpdate({ [key]: checked });
  };

  // Generate stars display
  const starsDisplay = hotel.stars
    ? Array.from({ length: hotel.stars }, (_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      ))
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Hero Image */}
      {hotel.imageUrl && (
        <div className="relative w-full h-48 bg-gray-100 dark:bg-gray-900">
          <Image
            src={hotel.imageUrl}
            alt={hotel.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-col gap-6 px-4 pb-4">
        {/* 2. Hotel Info */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {hotel.name}
          </h2>
          {starsDisplay && (
            <div className="flex items-center gap-1 mt-1">
              {starsDisplay}
              {hotel.city && (
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  · {hotel.city}
                </span>
              )}
            </div>
          )}
          {hotel.address && (
            <p className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {hotel.address}
            </p>
          )}
        </section>

        {/* 3. Your Stay */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Your Stay
          </h3>

          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-800">
              {/* Check-in */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Check-in
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {formatDate(hotel.checkInDate)}
                </p>
                <div className="mt-2">
                  <Select
                    value={hotel.checkInTime || '15:00'}
                    onValueChange={(value) => onUpdate({ checkInTime: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeDisplay(time, tripSettings.timeFormat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Check-out */}
              <div className="p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Check-out
                </p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {formatDate(hotel.checkOutDate)}
                </p>
                <div className="mt-2">
                  <Select
                    value={hotel.checkOutTime || '11:00'}
                    onValueChange={(value) => onUpdate({ checkOutTime: value })}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTimeDisplay(time, tripSettings.timeFormat)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{nights}</span> {nights === 1 ? 'night' : 'nights'}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room" className="text-xs text-gray-500">
                Room
              </Label>
              <Input
                id="room"
                value={hotel.roomType || ''}
                onChange={(e) => onUpdate({ roomType: e.target.value })}
                placeholder="Ocean View King"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor" className="text-xs text-gray-500">
                Floor
              </Label>
              <Input
                id="floor"
                value={hotel.floorPreference || ''}
                onChange={(e) => onUpdate({ floorPreference: e.target.value })}
                placeholder="High floor"
                className="h-10"
              />
            </div>
          </div>
        </section>

        {/* 4. Booking Details */}
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
                value={hotel.bookingStatus || 'confirmed'}
                onValueChange={(value) =>
                  onUpdate({ bookingStatus: value as HotelBooking['bookingStatus'] })
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
                value={hotel.confirmationNumber || ''}
                onChange={(e) => onUpdate({ confirmationNumber: e.target.value })}
                placeholder="EDI-8847291"
                className="h-10 font-mono"
              />
            </div>
          </div>
        </section>

        {/* 5. Amenities */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Amenities
          </h3>

          <div className="space-y-4">
            {/* Breakfast */}
            <AmenityToggle
              id="breakfast"
              icon={<Utensils className="w-4 h-4" />}
              label="Breakfast included"
              checked={amenities.breakfastIncluded}
              onCheckedChange={(checked) => handleAmenityChange('breakfastIncluded', checked)}
            >
              {amenities.breakfastIncluded && (
                <div className="grid grid-cols-2 gap-3 mt-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Time</Label>
                    <Input
                      value={hotel.breakfastTime || ''}
                      onChange={(e) => onUpdate({ breakfastTime: e.target.value })}
                      placeholder="7:00 AM - 10:00 AM"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Location</Label>
                    <Input
                      value={hotel.breakfastLocation || ''}
                      onChange={(e) => onUpdate({ breakfastLocation: e.target.value })}
                      placeholder="Lobby restaurant"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </AmenityToggle>

            {/* Pool */}
            <AmenityToggle
              id="pool"
              icon={<Waves className="w-4 h-4" />}
              label="Pool"
              checked={amenities.hasPool}
              onCheckedChange={(checked) => handleAmenityChange('hasPool', checked)}
            >
              {amenities.hasPool && (
                <div className="mt-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Hours</Label>
                    <Input
                      value={hotel.poolHours || ''}
                      onChange={(e) => onUpdate({ poolHours: e.target.value })}
                      placeholder="7:00 AM - 10:00 PM"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </AmenityToggle>

            {/* Gym */}
            <AmenityToggle
              id="gym"
              icon={<Dumbbell className="w-4 h-4" />}
              label="Gym"
              checked={amenities.hasGym}
              onCheckedChange={(checked) => handleAmenityChange('hasGym', checked)}
            >
              {amenities.hasGym && (
                <div className="mt-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Hours</Label>
                    <Input
                      value={hotel.gymHours || ''}
                      onChange={(e) => onUpdate({ gymHours: e.target.value })}
                      placeholder="24 hours"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </AmenityToggle>

            {/* Spa */}
            <AmenityToggle
              id="spa"
              icon={<Sparkles className="w-4 h-4" />}
              label="Spa"
              checked={amenities.hasSpa}
              onCheckedChange={(checked) => handleAmenityChange('hasSpa', checked)}
            />

            {/* Club Lounge */}
            <AmenityToggle
              id="lounge"
              icon={<Crown className="w-4 h-4" />}
              label="Club Lounge"
              checked={amenities.hasClubLounge}
              onCheckedChange={(checked) => handleAmenityChange('hasClubLounge', checked)}
            >
              {amenities.hasClubLounge && (
                <div className="grid grid-cols-2 gap-3 mt-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Hours</Label>
                    <Input
                      value={hotel.clubLoungeHours || ''}
                      onChange={(e) => onUpdate({ clubLoungeHours: e.target.value })}
                      placeholder="6:00 AM - 10:00 PM"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Location</Label>
                    <Input
                      value={hotel.clubLoungeLocation || ''}
                      onChange={(e) => onUpdate({ clubLoungeLocation: e.target.value })}
                      placeholder="Floor 12"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </AmenityToggle>

            {/* Parking */}
            <AmenityToggle
              id="parking"
              icon={<Car className="w-4 h-4" />}
              label="Parking"
              checked={amenities.hasParking}
              onCheckedChange={(checked) => handleAmenityChange('hasParking', checked)}
            >
              {amenities.hasParking && (
                <div className="grid grid-cols-2 gap-3 mt-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Type</Label>
                    <Select
                      value={hotel.parkingType || 'valet'}
                      onValueChange={(value) =>
                        onUpdate({ parkingType: value as HotelBooking['parkingType'] })
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Self-park</SelectItem>
                        <SelectItem value="valet">Valet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Cost</Label>
                    <Input
                      value={hotel.parkingCost ? `$${hotel.parkingCost}` : ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        onUpdate({ parkingCost: value ? Number(value) : undefined });
                      }}
                      placeholder="$45/night"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </AmenityToggle>

            {/* WiFi */}
            <AmenityToggle
              id="wifi"
              icon={<Wifi className="w-4 h-4" />}
              label="WiFi included"
              checked={amenities.wifiIncluded}
              onCheckedChange={(checked) => handleAmenityChange('wifiIncluded', checked)}
            />

            {/* Airport Shuttle */}
            <AmenityToggle
              id="shuttle"
              icon={<Bus className="w-4 h-4" />}
              label="Airport shuttle"
              checked={amenities.hasAirportShuttle}
              onCheckedChange={(checked) => handleAmenityChange('hasAirportShuttle', checked)}
            />
          </div>
        </section>

        {/* 6. Pricing */}
        {(hotel.ratePerNight || hotel.totalCost) && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Pricing
            </h3>
            <div className="flex items-baseline justify-between">
              {hotel.ratePerNight && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ${hotel.ratePerNight} / night
                </p>
              )}
              {totalCost && (
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${totalCost.toLocaleString()}
                </p>
              )}
            </div>
          </section>
        )}

        {/* 7. Notes */}
        <section className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium text-gray-900 dark:text-white">
            Notes
          </Label>
          <Textarea
            id="notes"
            value={hotel.notes || ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Add notes about this stay..."
            rows={3}
            className="resize-none"
          />
        </section>

        {/* 8. Actions */}
        <section className="space-y-2">
          {hotel.phone && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.open(`tel:${hotel.phone}`, '_self')}
            >
              <Phone className="w-4 h-4" />
              Call hotel
            </Button>
          )}

          {hotel.address && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                const query = encodeURIComponent(hotel.address || hotel.name);
                window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
              }}
            >
              <Navigation className="w-4 h-4" />
              Directions
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
            </Button>
          )}

          {hotel.website && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.open(hotel.website, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Manage booking
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-50" />
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Amenity toggle component
 */
interface AmenityToggleProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: React.ReactNode;
}

function AmenityToggle({
  id,
  icon,
  label,
  checked,
  onCheckedChange,
  children,
}: AmenityToggleProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
        <Label
          htmlFor={id}
          className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
        >
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          {label}
        </Label>
      </div>
      {children}
    </div>
  );
}

/**
 * Generate time options for selects
 */
function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
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
