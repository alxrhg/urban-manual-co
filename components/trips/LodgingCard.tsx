'use client';

import { MapPin, Calendar, ExternalLink, Phone, Globe } from 'lucide-react';

interface LodgingCardProps {
  name: string;
  address?: string;
  checkIn?: string;
  checkOut?: string;
  confirmationNumber?: string;
  phone?: string;
  website?: string;
  notes?: string;
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
    <div className="p-4 rounded-2xl bg-stone-100 dark:bg-gray-800/50">
      {/* REGION 1: Property Header (Name & Address) */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-white leading-tight">
          {name}
        </h3>
        {address && (
          <p className="text-xs text-stone-500 dark:text-gray-400 mt-1 flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{address}</span>
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

      {/* REGION 3: Confirmation & Contact */}
      <div className="flex items-center justify-between">
        {confirmationNumber && (
          <p className="text-[10px] text-stone-500 dark:text-gray-400">
            Confirmation: <span className="font-mono font-medium">{confirmationNumber}</span>
          </p>
        )}

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

      {/* Notes (if any) */}
      {notes && (
        <div className="mt-2 pt-2 border-t border-stone-200 dark:border-gray-700">
          <p className="text-[10px] text-stone-500 dark:text-gray-400 line-clamp-2">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
}
