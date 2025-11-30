'use client';

import Image from 'next/image';
import { MapPin, Calendar, Phone, Globe, Building2 } from 'lucide-react';

interface LodgingCardProps {
  name: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  confirmationNumber?: string;
  phone?: string;
  website?: string;
  notes?: string;
  image?: string;
  compact?: boolean;
}

/**
 * LodgingCard - Compact hotel/lodging card with property-focused design
 * Layout: Property header (name + address) → Booking dates → Confirmation
 */
export default function LodgingCard({
  name,
  address,
  checkIn,
  checkOut,
  confirmationNumber,
  phone,
  website,
  notes,
  image,
  compact = true,
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

  // Calculate nights
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

  const nights = calculateNights();

  return (
    <div className="rounded-2xl bg-stone-100 dark:bg-gray-800/50 overflow-hidden">
      {/* Image Section */}
      {image && (
        <div className="relative h-24 w-full">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {/* REGION 1: Property Header (Name & Address) */}
        <div className="flex items-start gap-3 mb-3">
          {!image && (
            <div className="w-10 h-10 rounded-lg bg-stone-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-stone-400 dark:text-gray-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-stone-900 dark:text-white leading-tight">
              {name}
            </h3>
            {address && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{address}</span>
              </p>
            )}
          </div>
        </div>

        {/* REGION 2: Booking Dates */}
        {(checkIn || checkOut) && (
          <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-gray-300 mb-3 bg-white dark:bg-gray-900/50 rounded-lg px-3 py-2">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-medium">{formatDate(checkIn) || 'Check-in'}</span>
            <span className="text-stone-400 px-0.5">→</span>
            <span className="font-medium">{formatDate(checkOut) || 'Check-out'}</span>
            {nights && (
              <span className="text-stone-400 ml-auto text-[10px] bg-stone-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
            )}
          </div>
        )}

        {/* REGION 3: Confirmation & Contact */}
        <div className="flex items-center justify-between">
          {confirmationNumber && (
            <p className="text-[10px] text-stone-500 dark:text-gray-400">
              Confirmation: <span className="font-mono font-medium">{confirmationNumber}</span>
            </p>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-2 ml-auto">
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

        {/* Notes (if any) */}
        {notes && (
          <div className="mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
            <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-2">
              {notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
