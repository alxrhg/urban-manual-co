'use client';

import Image from 'next/image';
import { Moon, MapPin, Bed, Star, Wifi, Coffee, Waves, Dumbbell } from 'lucide-react';
import TicketCard, { TicketDivider, TicketBadge } from './TicketCard';
import { cn } from '@/lib/utils';

interface NightPassCardProps {
  // Hotel info
  name: string;
  address?: string;
  neighborhood?: string;
  // Stay details
  nightNumber?: number;
  totalNights?: number;
  // Rating
  rating?: number;
  starRating?: number;
  // Image
  image?: string;
  // Amenities (quick access)
  hasWifi?: boolean;
  hasBreakfast?: boolean;
  hasPool?: boolean;
  hasGym?: boolean;
  // Confirmation
  confirmationNumber?: string;
  // Interaction
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * NightPassCard - The Night Pass (Hotel of the Night) variant
 *
 * Position: Footer of the day
 * Design: Darker/distinct style indicating "Where you sleep"
 * Inverted color scheme for visual distinction
 */
export default function NightPassCard({
  name,
  address,
  neighborhood,
  nightNumber,
  totalNights,
  rating,
  starRating,
  image,
  hasWifi,
  hasBreakfast,
  hasPool,
  hasGym,
  confirmationNumber,
  isActive,
  onClick,
  className,
}: NightPassCardProps) {
  // Build amenities array
  const amenities = [
    hasWifi && { icon: Wifi, label: 'WiFi' },
    hasBreakfast && { icon: Coffee, label: 'Breakfast' },
    hasPool && { icon: Waves, label: 'Pool' },
    hasGym && { icon: Dumbbell, label: 'Gym' },
  ].filter(Boolean) as Array<{ icon: typeof Wifi; label: string }>;

  // Format night display
  const nightDisplay = nightNumber && totalNights
    ? `Night ${nightNumber} of ${totalNights}`
    : nightNumber
      ? `Night ${nightNumber}`
      : 'Tonight';

  return (
    <TicketCard
      variant="night-pass"
      onClick={onClick}
      isActive={isActive}
      className={cn('mt-4', className)}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-stone-500" />
          <span className="text-[10px] uppercase tracking-widest font-medium text-stone-500">
            {nightDisplay}
          </span>
        </div>
        <TicketBadge variant="dark">
          <Bed className="w-3 h-3 mr-1" />
          Overnight
        </TicketBadge>
      </div>

      {/* Main Content */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Hotel Image */}
          {image && (
            <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-stone-800">
              <Image
                src={image}
                alt={name}
                fill
                className="object-cover"
                sizes="64px"
              />
              {/* Overlay for dark theme consistency */}
              <div className="absolute inset-0 bg-stone-900/20" />
            </div>
          )}

          {/* Hotel Details */}
          <div className="flex-1 min-w-0">
            {/* Name & Rating */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white leading-tight truncate">
                  {name}
                </h3>
                {/* Star rating (hotel class) */}
                {starRating && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: starRating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                )}
              </div>
              {/* User rating */}
              {rating && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-white">{rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Location */}
            {(address || neighborhood) && (
              <p className="text-xs text-stone-400 flex items-center gap-1 mt-1.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{neighborhood || address}</span>
              </p>
            )}
          </div>
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <>
            <TicketDivider variant="night-pass" />
            <div className="flex items-center gap-3">
              {amenities.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1 text-stone-400">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Confirmation */}
        {confirmationNumber && (
          <div className="mt-3 pt-2 border-t border-stone-800">
            <p className="text-[10px] text-stone-500">
              Confirmation: <span className="font-mono font-medium text-stone-400">{confirmationNumber}</span>
            </p>
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="h-1 bg-gradient-to-r from-stone-700 via-stone-600 to-stone-700" />
    </TicketCard>
  );
}
