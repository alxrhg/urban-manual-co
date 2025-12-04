'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Plus,
  Building2,
  Check,
  AlertCircle,
  MapPin,
  Phone,
  Navigation,
  Pencil,
  Trash2,
  Coffee,
  Waves,
  Dumbbell,
  Sparkles,
  Wifi,
  Car,
  Star,
  Armchair,
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import type { HotelBooking } from './ItineraryTab';

interface HotelsTabProps {
  trip: Trip;
  hotels: HotelBooking[];
  onAddHotel: () => void;
  onEditHotel: (hotel: HotelBooking) => void;
  onDeleteHotel: (hotelId: string) => void;
}

/**
 * HotelsTab - Display all trip accommodations
 *
 * Features:
 * - Group by city/destination for multi-stop trips
 * - Show all enabled amenities with details
 * - Highlight breakfast info prominently
 * - Show lounge access if has_lounge
 * - Actions: call, directions, edit, delete
 * - Empty state with add CTA
 */
export default function HotelsTab({
  trip,
  hotels,
  onAddHotel,
  onEditHotel,
  onDeleteHotel,
}: HotelsTabProps) {
  // Group hotels by city
  const groupedHotels = useMemo(() => {
    const groups: Record<string, HotelBooking[]> = {};

    hotels.forEach((hotel) => {
      const city = hotel.city || 'Other';
      if (!groups[city]) groups[city] = [];
      groups[city].push(hotel);
    });

    // Sort each group by check-in date
    Object.keys(groups).forEach((city) => {
      groups[city].sort((a, b) => {
        const dateA = new Date(a.checkInDate);
        const dateB = new Date(b.checkInDate);
        return dateA.getTime() - dateB.getTime();
      });
    });

    return groups;
  }, [hotels]);

  // Calculate total nights
  const totalNights = useMemo(() => {
    return hotels.reduce((total, hotel) => {
      if (hotel.checkInDate && hotel.checkOutDate) {
        const nights = differenceInDays(
          parseISO(hotel.checkOutDate),
          parseISO(hotel.checkInDate)
        );
        return total + Math.max(nights, 0);
      }
      return total + 1; // Assume 1 night if no checkout date
    }, 0);
  }, [hotels]);

  if (hotels.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hotels</h2>
          <button
            onClick={onAddHotel}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Hotel
          </button>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
            <Building2 className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hotels added
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
            Add your accommodation details to keep track of check-in times, amenities, and confirmation numbers.
          </p>
          <button
            onClick={onAddHotel}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Add your first hotel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Hotels</h2>
        <button
          onClick={onAddHotel}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Hotel
        </button>
      </div>

      {/* Hotels List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {Object.entries(groupedHotels).map(([city, cityHotels]) => (
          <div key={city}>
            {/* City Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                {city}
              </span>
              {cityHotels[0] && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {format(parseISO(cityHotels[0].checkInDate), 'MMM d')}
                  {cityHotels[0].checkOutDate && (
                    <>-{format(parseISO(cityHotels[0].checkOutDate), 'd')}</>
                  )}
                  {cityHotels[0].checkOutDate && (
                    <span className="ml-1">
                      ({differenceInDays(
                        parseISO(cityHotels[0].checkOutDate),
                        parseISO(cityHotels[0].checkInDate)
                      )} nights)
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* Hotel Cards */}
            <div className="space-y-4">
              {cityHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onEdit={() => onEditHotel(hotel)}
                  onDelete={() => onDeleteHotel(hotel.id)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            SUMMARY
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total nights: {totalNights} · {hotels.length} {hotels.length === 1 ? 'property' : 'properties'}
          </p>
        </div>
      </div>
    </div>
  );
}

function HotelCard({
  hotel,
  onEdit,
  onDelete,
}: {
  hotel: HotelBooking;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Collect enabled amenities
  const amenities = useMemo(() => {
    const list: Array<{ icon: typeof Coffee; label: string; detail?: string }> = [];

    if (hotel.breakfastIncluded) {
      list.push({
        icon: Coffee,
        label: 'Breakfast',
        detail: hotel.breakfastHours
          ? `${hotel.breakfastHours}${hotel.breakfastLocation ? ` (${hotel.breakfastLocation})` : ''}`
          : undefined,
      });
    }
    if (hotel.hasPool) {
      list.push({
        icon: Waves,
        label: 'Pool',
        detail: hotel.poolHours,
      });
    }
    if (hotel.hasLounge) {
      list.push({
        icon: Armchair,
        label: 'Club Lounge',
        detail: hotel.loungeHours,
      });
    }
    if (hotel.hasGym) {
      list.push({
        icon: Dumbbell,
        label: 'Gym',
        detail: hotel.gymHours,
      });
    }
    if (hotel.hasSpa) {
      list.push({
        icon: Sparkles,
        label: 'Spa',
      });
    }
    if (hotel.hasFreeWifi) {
      list.push({
        icon: Wifi,
        label: 'Free WiFi',
      });
    }
    if (hotel.hasParking) {
      list.push({
        icon: Car,
        label: 'Parking',
        detail: hotel.parkingFee,
      });
    }

    return list;
  }, [hotel]);

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Hotel Info Header */}
      <div className="flex gap-4 p-5">
        {/* Image */}
        <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {hotel.image ? (
            <Image
              src={hotel.image}
              alt={hotel.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {hotel.name}
          </h3>

          {/* Star Rating */}
          {hotel.starRating && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                · {hotel.city}
              </span>
            </div>
          )}

          {/* Address */}
          {hotel.address && (
            <p className="flex items-start gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">{hotel.address}</span>
            </p>
          )}
        </div>
      </div>

      {/* Check-in / Check-out */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              CHECK-IN
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {format(parseISO(hotel.checkInDate), 'EEE, MMM d')}
            </p>
            {hotel.checkInTime && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(hotel.checkInTime)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              CHECK-OUT
            </p>
            {hotel.checkOutDate ? (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(parseISO(hotel.checkOutDate), 'EEE, MMM d')}
                </p>
                {hotel.checkOutTime && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(hotel.checkOutTime)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">Not set</p>
            )}
          </div>
        </div>
      </div>

      {/* Room Type & Confirmation */}
      <div className="px-5 pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          {hotel.roomType && <span>{hotel.roomType}</span>}
          {hotel.confirmationNumber && (
            <>
              {hotel.roomType && <span className="text-gray-300 dark:text-gray-600">·</span>}
              <span>Conf #{hotel.confirmationNumber}</span>
            </>
          )}
        </div>
      </div>

      {/* Amenities */}
      {amenities.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity, index) => {
              const Icon = amenity.icon;
              return (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400"
                  title={amenity.detail}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {amenity.label}
                  {amenity.detail && (
                    <span className="text-gray-400 dark:text-gray-500 ml-0.5">
                      {amenity.detail}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="px-5 pb-4 flex justify-end">
        {hotel.status === 'confirmed' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
            <Check className="w-3.5 h-3.5" />
            Confirmed
          </span>
        ) : hotel.status === 'pending' ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Pending
          </span>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        {hotel.phone && (
          <a
            href={`tel:${hotel.phone}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            Call
          </a>
        )}
        {hotel.address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            Directions
          </a>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Helper functions

function formatTime(timeStr: string): string {
  // Convert 24h to 12h format
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
