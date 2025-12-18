'use client';

import Image from 'next/image';
import {
  Hotel,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  Calendar,
  Coffee,
  Wifi,
  Car,
  Dumbbell,
  Waves,
  Sparkles,
  KeyRound,
  ChevronRight,
} from 'lucide-react';

interface HotelCardProps {
  name: string;
  image?: string;
  rating?: number;
  starRating?: number;
  address?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomNumber?: string;
  roomType?: string;
  confirmationNumber?: string;
  phone?: string;
  website?: string;
  amenities?: string[];
  breakfast?: {
    included: boolean;
    restaurant?: string;
    time?: string;
  };
  compact?: boolean;
}

/**
 * HotelCard - Premium key card design for expanded sidebar view
 * Design: Elegant hotel key card aesthetic
 * Shows the complete hotel stay at a glance
 */
export default function HotelCard({
  name,
  image,
  rating,
  starRating,
  address,
  checkInDate,
  checkOutDate,
  checkInTime = '15:00',
  checkOutTime = '11:00',
  roomNumber,
  roomType,
  confirmationNumber,
  phone,
  website,
  amenities = [],
  breakfast,
  compact = false,
}: HotelCardProps) {
  // Format date for display
  const formatDate = (dateStr?: string, format: 'short' | 'full' = 'short') => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (format === 'full') {
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate nights
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return null;
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  const nights = calculateNights();

  // Amenity icon mapping
  const amenityIcons: Record<string, typeof Wifi> = {
    wifi: Wifi,
    parking: Car,
    gym: Dumbbell,
    pool: Waves,
    spa: Sparkles,
    breakfast: Coffee,
  };

  if (compact) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-stone-100 dark:bg-gray-800/50">
        {/* Image header */}
        {image && (
          <div className="relative h-20 w-full">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
              sizes="350px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {/* Rating badge */}
            {rating && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                <img src="/google-logo.svg" alt="Google" className="w-3 h-3" />
                <span className="text-xs font-medium text-white">{rating.toFixed(1)}</span>
              </div>
            )}
            {/* Hotel name overlay */}
            <div className="absolute bottom-2 left-3 right-3">
              <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
            </div>
          </div>
        )}

        <div className="p-3">
          {!image && (
            <div className="flex items-center gap-2 mb-2">
              <Hotel className="w-4 h-4 text-stone-400" />
              <h3 className="text-sm font-semibold text-stone-900 dark:text-white truncate">{name}</h3>
            </div>
          )}

          {/* Stay dates */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-600 dark:text-gray-300">
              {formatDate(checkInDate)} → {formatDate(checkOutDate)}
            </span>
            {nights && (
              <span className="text-stone-400 dark:text-gray-500">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 shadow-lg border border-stone-200 dark:border-gray-800">
      {/* Hero Image */}
      <div className="relative h-40 w-full bg-stone-200 dark:bg-gray-800">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="400px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Hotel className="w-16 h-16 text-stone-300 dark:text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Star rating badge */}
        {(starRating || rating) && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm">
            {starRating ? (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: starRating }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            ) : rating ? (
              <>
                <img src="/google-logo.svg" alt="Google" className="w-3.5 h-3.5" />
                <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
              </>
            ) : null}
          </div>
        )}

        {/* Hotel name and address overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
          {address && (
            <p className="text-sm text-white/80 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="line-clamp-1">{address}</span>
            </p>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* YOUR STAY Section */}
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-3">
            Your Stay
          </p>

          {/* Check-in/out timeline */}
          <div className="flex items-stretch gap-4">
            {/* Check-in */}
            <div className="flex-1 bg-gradient-to-br from-green-50 to-stone-50 dark:from-green-950/30 dark:to-gray-800/50 rounded-xl p-3 border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <KeyRound className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-green-600 dark:text-green-400">
                  Check-in
                </p>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-white">
                {checkInTime}
              </p>
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {formatDate(checkInDate, 'full')}
              </p>
            </div>

            {/* Nights indicator */}
            <div className="flex flex-col items-center justify-center px-2">
              <div className="flex-1 w-px bg-gradient-to-b from-green-300 via-stone-300 to-rose-300 dark:from-green-600 dark:via-gray-600 dark:to-rose-600" />
              {nights && (
                <div className="my-2 px-2 py-1 rounded-full bg-stone-100 dark:bg-gray-800 text-[10px] font-medium text-stone-600 dark:text-gray-300 whitespace-nowrap">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                </div>
              )}
              <div className="flex-1 w-px bg-gradient-to-b from-stone-300 to-rose-300 dark:from-gray-600 dark:to-rose-600" />
            </div>

            {/* Check-out */}
            <div className="flex-1 bg-gradient-to-br from-rose-50 to-stone-50 dark:from-rose-950/30 dark:to-gray-800/50 rounded-xl p-3 border border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                  Check-out
                </p>
              </div>
              <p className="text-lg font-bold text-stone-900 dark:text-white">
                {checkOutTime}
              </p>
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {formatDate(checkOutDate, 'full')}
              </p>
            </div>
          </div>
        </div>

        {/* Room and Confirmation */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {roomNumber && (
            <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Room
              </p>
              <p className="text-lg font-bold text-stone-900 dark:text-white">
                {roomNumber}
              </p>
              {roomType && (
                <p className="text-xs text-stone-500 dark:text-gray-400">{roomType}</p>
              )}
            </div>
          )}

          {confirmationNumber && (
            <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
              <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                Confirmation
              </p>
              <p className="text-sm font-mono font-bold text-stone-900 dark:text-white truncate">
                {confirmationNumber}
              </p>
            </div>
          )}
        </div>

        {/* Breakfast */}
        {breakfast && (
          <div className="mb-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl p-3 border border-orange-100 dark:border-orange-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-white">
                    Breakfast
                    {breakfast.included && (
                      <span className="ml-2 text-[10px] text-green-600 dark:text-green-400 font-normal">
                        Included
                      </span>
                    )}
                  </p>
                  {(breakfast.restaurant || breakfast.time) && (
                    <p className="text-xs text-stone-500 dark:text-gray-400">
                      {breakfast.restaurant && breakfast.restaurant}
                      {breakfast.restaurant && breakfast.time && ' · '}
                      {breakfast.time && breakfast.time}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-2">
              Amenities
            </p>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => {
                const Icon = amenityIcons[amenity.toLowerCase()] || Sparkles;
                return (
                  <div
                    key={amenity}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-gray-800 text-xs text-stone-600 dark:text-gray-300"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="capitalize">{amenity}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-stone-100 dark:border-gray-800">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm text-stone-700 dark:text-gray-300 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm text-stone-700 dark:text-gray-300 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Website
            </a>
          )}
        </div>
      </div>

      {/* Key card barcode pattern */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-0.5 h-8 opacity-20 dark:opacity-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="bg-stone-900 dark:bg-white"
              style={{
                width: i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px',
                height: '100%',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
