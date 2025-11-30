'use client';

import { MapPin, Calendar, Phone, Globe, Star, ExternalLink, Coffee, Utensils, Moon, Bed, Dumbbell, Waves } from 'lucide-react';
import Image from 'next/image';

interface LodgingCardProps {
  name: string;
  address?: string;
  neighborhood?: string;
  checkIn?: string;
  checkOut?: string;
  confirmationNumber?: string;
  phone?: string;
  website?: string;
  bookingUrl?: string;
  notes?: string;
  image?: string;
  rating?: number;
  priceLevel?: number;
  compact?: boolean;
  // Multi-night support
  nightStart?: number;
  nightEnd?: number;
  // Meal options
  breakfastIncluded?: boolean;
  // Quick actions
  onAddBreakfast?: () => void;
  onAddLunch?: () => void;
  onAddDinner?: () => void;
  onReturnToHotel?: () => void;
  // Amenities
  hasSpa?: boolean;
  hasPool?: boolean;
  hasGym?: boolean;
  // Travel time back
  travelTimeBack?: number; // minutes to get back to hotel
}

/**
 * LodgingCard - Hotel/lodging card with property-focused design
 * Layout: Image → Property header → Nights/Dates → Amenities → Confirmation → Actions
 */
export default function LodgingCard({
  name,
  address,
  neighborhood,
  checkIn,
  checkOut,
  confirmationNumber,
  phone,
  website,
  bookingUrl,
  notes,
  image,
  rating,
  priceLevel,
  compact = true,
  nightStart,
  nightEnd,
  breakfastIncluded,
  onAddBreakfast,
  onAddLunch,
  onAddDinner,
  onReturnToHotel,
  hasSpa,
  hasPool,
  hasGym,
  travelTimeBack,
}: LodgingCardProps) {
  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate nights from dates
  const calculateNights = () => {
    if (!checkIn || !checkOut) return null;
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  // Format night range
  const formatNightRange = () => {
    if (nightStart !== undefined && nightEnd !== undefined) {
      if (nightStart === nightEnd) {
        return `Night ${nightStart}`;
      }
      return `Nights ${nightStart}–${nightEnd}`;
    }
    if (nightStart !== undefined) {
      return `Night ${nightStart}`;
    }
    return null;
  };

  // Format price level as $ symbols
  const formatPriceLevel = (level?: number) => {
    if (!level || level < 1 || level > 4) return null;
    return '$'.repeat(level);
  };

  // Format travel time
  const formatTravelTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const nights = calculateNights();
  const nightRange = formatNightRange();
  const priceDisplay = formatPriceLevel(priceLevel);
  const travelTimeDisplay = formatTravelTime(travelTimeBack);
  const hasQuickActions = onAddBreakfast || onAddLunch || onAddDinner || onReturnToHotel;
  const hasAmenities = hasSpa || hasPool || hasGym;

  return (
    <div className="rounded-2xl bg-stone-100 dark:bg-gray-800/50 overflow-hidden">
      {/* Hotel Image */}
      {image && (
        <div className="relative w-full h-32 sm:h-40">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          {/* Rating & Price overlay */}
          {(rating || priceDisplay) && (
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              {rating && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-medium text-stone-700 dark:text-gray-200">
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}
              {priceDisplay && (
                <div className="px-2 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                  <span className="text-xs font-medium text-stone-600 dark:text-gray-300">
                    {priceDisplay}
                  </span>
                </div>
              )}
            </div>
          )}
          {/* Night badge */}
          {nightRange && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-stone-900/80 dark:bg-white/90 backdrop-blur-sm">
              <span className="text-xs font-medium text-white dark:text-stone-900">
                {nightRange}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* REGION 1: Property Header (Name & Location) */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-white leading-tight">
              {name}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Show rating inline if no image */}
              {!image && rating && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-200 dark:bg-gray-700">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-medium text-stone-700 dark:text-gray-200">
                    {rating.toFixed(1)}
                  </span>
                </div>
              )}
              {/* Night badge (if no image) */}
              {!image && nightRange && (
                <div className="px-2 py-0.5 rounded-full bg-stone-900 dark:bg-white">
                  <span className="text-xs font-medium text-white dark:text-stone-900">
                    {nightRange}
                  </span>
                </div>
              )}
            </div>
          </div>
          {(address || neighborhood) && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {neighborhood ? `${neighborhood} · ` : ''}{address}
              </span>
            </p>
          )}
          {/* Show price inline if no image */}
          {!image && priceDisplay && (
            <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
              {priceDisplay}
            </p>
          )}
        </div>

        {/* REGION 2: Booking Dates */}
        {(checkIn || checkOut) && (
          <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-gray-300 mb-3">
            <Calendar className="w-3 h-3 text-stone-400" />
            <span>{formatDate(checkIn) || 'Check-in'}</span>
            <span className="text-stone-400 px-0.5">—</span>
            <span>{formatDate(checkOut) || 'Check-out'}</span>
            {nights && (
              <span className="text-stone-400 ml-1">
                ({nights} {nights === 1 ? 'night' : 'nights'})
              </span>
            )}
          </div>
        )}

        {/* REGION 3: Amenities & Inclusions */}
        {(hasAmenities || breakfastIncluded) && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {breakfastIncluded && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <Coffee className="w-3 h-3" />
                <span className="text-[10px] font-medium">Breakfast included</span>
              </div>
            )}
            {hasPool && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                <Waves className="w-3 h-3" />
                <span className="text-[10px] font-medium">Pool</span>
              </div>
            )}
            {hasGym && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                <Dumbbell className="w-3 h-3" />
                <span className="text-[10px] font-medium">Gym</span>
              </div>
            )}
            {hasSpa && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                <span className="text-[10px] font-medium">Spa</span>
              </div>
            )}
          </div>
        )}

        {/* REGION 4: Travel Time Back */}
        {travelTimeDisplay && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400 mb-3 px-2 py-1.5 rounded-lg bg-stone-200/50 dark:bg-gray-700/50">
            <Moon className="w-3 h-3" />
            <span>{travelTimeDisplay} back to hotel</span>
          </div>
        )}

        {/* REGION 5: Confirmation & Contact */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {confirmationNumber && (
              <p className="text-[10px] text-stone-500 dark:text-gray-400">
                Confirmation: <span className="font-mono font-medium">{confirmationNumber}</span>
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                title="Call property"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 transition-colors"
                title="Visit website"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* REGION 6: Quick Action Buttons */}
        {hasQuickActions && (
          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {onAddBreakfast && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddBreakfast();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-gray-300 text-xs font-medium hover:bg-stone-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <Coffee className="w-3 h-3" />
                  <span>Breakfast</span>
                </button>
              )}
              {onAddLunch && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddLunch();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-gray-300 text-xs font-medium hover:bg-stone-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <Utensils className="w-3 h-3" />
                  <span>Lunch</span>
                </button>
              )}
              {onAddDinner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddDinner();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-gray-300 text-xs font-medium hover:bg-stone-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <Utensils className="w-3 h-3" />
                  <span>Dinner</span>
                </button>
              )}
              {onReturnToHotel && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReturnToHotel();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-gray-700 text-stone-700 dark:text-gray-300 text-xs font-medium hover:bg-stone-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <Bed className="w-3 h-3" />
                  <span>Rest at hotel</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* REGION 7: Booking Button */}
        {bookingUrl && (
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-gray-100 transition-colors"
          >
            <span>Book Now</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Notes (if any) */}
        {notes && (
          <div className="mt-3 pt-3 border-t border-stone-200 dark:border-gray-700">
            <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-2">
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
