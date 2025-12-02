'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Phone, Globe, Calendar, Moon } from 'lucide-react';
import { TripEmptyState } from './TripEmptyState';
import { cn } from '@/lib/utils';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface HotelItem extends EnrichedItineraryItem {
  dayNumber: number;
}

interface TripHotelsTabProps {
  hotels: HotelItem[];
  tripStartDate?: string | null;
  selectedItem: EnrichedItineraryItem | null;
  onEditHotel: (hotel: HotelItem) => void;
  onAddHotel: () => void;
}

export function TripHotelsTab({
  hotels,
  tripStartDate,
  selectedItem,
  onEditHotel,
  onAddHotel,
}: TripHotelsTabProps) {
  if (hotels.length === 0) {
    return (
      <TripEmptyState
        type="no-hotels"
        onAddFirst={onAddHotel}
      />
    );
  }

  // Calculate check-in day number based on date
  const getCheckInDayNum = (hotel: HotelItem) => {
    if (hotel.parsedNotes?.checkInDate && tripStartDate) {
      const tripStart = new Date(tripStartDate);
      tripStart.setHours(0, 0, 0, 0);
      const checkIn = new Date(hotel.parsedNotes.checkInDate);
      checkIn.setHours(0, 0, 0, 0);
      return Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    return hotel.dayNumber;
  };

  // Calculate number of nights
  const getNights = (hotel: HotelItem) => {
    if (hotel.parsedNotes?.checkInDate && hotel.parsedNotes?.checkOutDate) {
      const inDate = new Date(hotel.parsedNotes.checkInDate);
      const outDate = new Date(hotel.parsedNotes.checkOutDate);
      return Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return 1;
  };

  // Format date for display
  const formatDate = (date?: string) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-3">
      {hotels.map((hotel) => {
        const checkInDayNum = getCheckInDayNum(hotel);
        const nights = getNights(hotel);
        const isSelected = selectedItem?.id === hotel.id;

        return (
          <Card
            key={hotel.id}
            onClick={() => onEditHotel(hotel)}
            className={cn(
              'cursor-pointer transition-all',
              isSelected
                ? 'border-gray-900 dark:border-white'
                : 'hover:border-gray-300 dark:hover:border-gray-700'
            )}
          >
            <CardContent className="p-4">
              {/* Top Row - Day & Nights */}
              <div className="flex items-center justify-between mb-3">
                <Badge variant="secondary" className="text-xs font-normal">
                  Day {checkInDayNum}
                </Badge>
                <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </Badge>
              </div>

              {/* Hotel Name */}
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {hotel.title}
              </h3>

              {/* Address */}
              {hotel.parsedNotes?.address && (
                <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{hotel.parsedNotes.address}</span>
                </div>
              )}

              {/* Check-in / Check-out */}
              {(hotel.parsedNotes?.checkInDate || hotel.parsedNotes?.checkOutDate) && (
                <div className="flex items-center gap-4 text-sm mb-3">
                  {hotel.parsedNotes?.checkInDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Check-in</span>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(hotel.parsedNotes.checkInDate)}
                          {hotel.parsedNotes.checkInTime && (
                            <span className="ml-1 text-gray-500">
                              {hotel.parsedNotes.checkInTime}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {hotel.parsedNotes?.checkOutDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Check-out</span>
                        <p className="text-gray-900 dark:text-white">
                          {formatDate(hotel.parsedNotes.checkOutDate)}
                          {hotel.parsedNotes.checkOutTime && (
                            <span className="ml-1 text-gray-500">
                              {hotel.parsedNotes.checkOutTime}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Info */}
              {(hotel.parsedNotes?.phone || hotel.parsedNotes?.website) && (
                <div className="flex items-center gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  {hotel.parsedNotes?.phone && (
                    <a
                      href={`tel:${hotel.parsedNotes.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {hotel.parsedNotes.phone}
                    </a>
                  )}
                  {hotel.parsedNotes?.website && (
                    <a
                      href={hotel.parsedNotes.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Website
                    </a>
                  )}
                </div>
              )}

              {/* Confirmation */}
              {hotel.parsedNotes?.hotelConfirmation && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Confirmation: <span className="font-mono">{hotel.parsedNotes.hotelConfirmation}</span>
                  </p>
                </div>
              )}

              {/* Breakfast Badge */}
              {hotel.parsedNotes?.breakfastIncluded && (
                <Badge variant="secondary" className="mt-3 text-xs">
                  Breakfast included
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add Hotel Button */}
      <Button
        variant="outline"
        onClick={onAddHotel}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add another hotel
      </Button>
    </div>
  );
}
