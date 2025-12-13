'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X, MapPin, Star, Globe, Phone, Navigation, ExternalLink,
  Plane, Train, Building2, Clock, Coffee, ChevronDown, ChevronUp,
  Calendar, Bookmark, Share2, MoreHorizontal
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ItineraryItemNotes } from '@/types/trip';

interface DestinationBoxProps {
  item: EnrichedItineraryItem;
  onClose?: () => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<ItineraryItemNotes>) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

/**
 * DestinationBox - Clean sidebar for viewing item details
 */
export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [imageError, setImageError] = useState(false);

  const destination = item.destination;
  const notes = item.parsedNotes;
  const itemType = notes?.type || 'place';

  // Common data
  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || notes?.image;
  const category = destination?.category || notes?.category;
  const neighborhood = destination?.neighborhood;
  const description = destination?.micro_description || destination?.description;
  const address = destination?.formatted_address || notes?.address;
  const website = destination?.website || notes?.website;
  const phone = notes?.phone;
  const rating = destination?.rating;
  const priceLevel = destination?.price_level;
  const lat = destination?.latitude || notes?.latitude;
  const lng = destination?.longitude || notes?.longitude;

  // Reset on item change
  useEffect(() => {
    setImageError(false);
    setShowAllDetails(false);
  }, [item.id]);

  // Format time
  const formatTime = (time?: string) => {
    if (!time) return null;
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRemove = () => {
    onRemove?.(item.id);
    onClose?.();
  };

  // Action buttons component
  const ActionButtons = () => {
    const hasActions = phone || website || (lat && lng);
    if (!hasActions) return null;

    return (
      <div className="flex gap-2 py-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex-1 flex flex-col items-center gap-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Call</span>
          </a>
        )}
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center gap-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Website</span>
          </a>
        )}
        {lat && lng && (
          <a
            href={`https://maps.apple.com/?daddr=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center gap-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Navigation className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Directions</span>
          </a>
        )}
      </div>
    );
  };

  // Info row component
  const InfoRow = ({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value}</span>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-900 h-full flex flex-col ${className}`}>
      {/* Close button - floating */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* ============ FLIGHT ============ */}
        {itemType === 'flight' && (
          <>
            {/* Flight Header */}
            <div className="bg-gradient-to-br from-stone-100 to-stone-50 dark:from-gray-800 dark:to-gray-900 p-6">
              <div className="flex items-center gap-2 text-stone-500 dark:text-gray-400 mb-4">
                <Plane className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Flight</span>
                {notes?.confirmationNumber && (
                  <>
                    <span className="text-xs">•</span>
                    <span className="text-xs font-mono">{notes.confirmationNumber}</span>
                  </>
                )}
              </div>

              {/* Route */}
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-3xl font-bold text-stone-900 dark:text-white font-mono tracking-tight">
                    {notes?.from?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                    {formatTime(notes?.departureTime) || '--:--'}
                  </p>
                </div>

                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
                    <div className="w-16 h-px bg-stone-300 dark:bg-gray-600" />
                    <Plane className="w-4 h-4 text-stone-400 dark:text-gray-500 -rotate-0" />
                    <div className="w-16 h-px bg-stone-300 dark:bg-gray-600" />
                    <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold text-stone-900 dark:text-white font-mono tracking-tight">
                    {notes?.to?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                    {formatTime(notes?.arrivalTime) || '--:--'}
                  </p>
                </div>
              </div>

              {/* Airline */}
              <div className="mt-4 pt-4 border-t border-stone-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-700 dark:text-gray-300">
                  {notes?.airline} {notes?.flightNumber}
                </span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                  Confirmed
                </span>
              </div>
            </div>

            {/* Flight Details */}
            <div className="p-4">
              <InfoRow label="Terminal" value={notes?.terminal ? `Terminal ${notes.terminal}` : null} />
              <InfoRow label="Gate" value={notes?.gate ? `Gate ${notes.gate}` : null} />
              <InfoRow label="Seat" value={notes?.seatNumber} />
              <InfoRow label="Confirmation" value={notes?.confirmationNumber} mono />

              {notes?.notes && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">{notes.notes}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ HOTEL ============ */}
        {itemType === 'hotel' && (
          <>
            {/* Hero Image */}
            {image && !imageError ? (
              <div className="relative h-48 bg-gray-200 dark:bg-gray-800">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized={image.includes('googleusercontent.com')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-white/80" />
                    <span className="text-xs text-white/80 uppercase tracking-wide">Hotel</span>
                  </div>
                  <h2 className="text-xl font-semibold text-white">{name}</h2>
                  {neighborhood && <p className="text-sm text-white/80">{neighborhood}</p>}
                </div>
                {rating && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-lg">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-stone-100 dark:bg-gray-800">
                <div className="flex items-center gap-2 text-stone-500 dark:text-gray-400 mb-2">
                  <Building2 className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Hotel</span>
                </div>
                <h2 className="text-xl font-semibold text-stone-900 dark:text-white">{name}</h2>
                {neighborhood && <p className="text-sm text-stone-600 dark:text-gray-400">{neighborhood}</p>}
              </div>
            )}

            <div className="p-4">
              <ActionButtons />

              {/* Stay Dates */}
              <div className="grid grid-cols-2 gap-3 py-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Check-in</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatTime(notes?.checkInTime) || '3:00 PM'}
                  </p>
                  {notes?.checkInDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(notes.checkInDate)}</p>
                  )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Check-out</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatTime(notes?.checkOutTime) || '11:00 AM'}
                  </p>
                  {notes?.checkOutDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(notes.checkOutDate)}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="py-2">
                <InfoRow label="Room" value={notes?.roomType} />
                <InfoRow label="Confirmation" value={notes?.confirmationNumber || notes?.hotelConfirmation} mono />
                {notes?.breakfastIncluded && (
                  <div className="flex items-center gap-2 py-2.5 text-green-600 dark:text-green-400">
                    <Coffee className="w-4 h-4" />
                    <span className="text-sm">Breakfast included</span>
                  </div>
                )}
              </div>

              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed py-3 border-t border-gray-100 dark:border-gray-800">
                  {description}
                </p>
              )}

              {notes?.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">{notes.notes}</p>
                </div>
              )}

              {destination?.slug && (
                <Link
                  href={`/destination/${destination.slug}`}
                  className="flex items-center justify-center gap-2 mt-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Urban Manual
                </Link>
              )}
            </div>
          </>
        )}

        {/* ============ TRAIN ============ */}
        {itemType === 'train' && (
          <>
            {/* Train Header */}
            <div className="bg-gradient-to-br from-stone-100 to-stone-50 dark:from-gray-800 dark:to-gray-900 p-6">
              <div className="flex items-center gap-2 text-stone-500 dark:text-gray-400 mb-4">
                <Train className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Train</span>
              </div>

              {/* Route */}
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-stone-900 dark:text-white">{notes?.from || '—'}</p>
                  <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                    {formatTime(notes?.departureTime) || '--:--'}
                  </p>
                </div>

                <div className="flex items-center gap-1 px-4">
                  <div className="w-8 h-px bg-stone-300 dark:bg-gray-600" />
                  <Train className="w-4 h-4 text-stone-400 dark:text-gray-500" />
                  <div className="w-8 h-px bg-stone-300 dark:bg-gray-600" />
                </div>

                <div className="text-center flex-1">
                  <p className="text-xl font-bold text-stone-900 dark:text-white">{notes?.to || '—'}</p>
                  <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                    {formatTime(notes?.arrivalTime) || '--:--'}
                  </p>
                </div>
              </div>

              {(notes?.trainLine || notes?.trainNumber) && (
                <div className="mt-4 pt-4 border-t border-stone-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-stone-700 dark:text-gray-300">
                    {[notes.trainLine, notes.trainNumber].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
            </div>

            {/* Train Details */}
            <div className="p-4">
              <InfoRow label="Confirmation" value={notes?.confirmationNumber} mono />
              <InfoRow label="Seat" value={notes?.seatNumber} />

              {notes?.notes && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">{notes.notes}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ PLACE / RESTAURANT ============ */}
        {itemType !== 'flight' && itemType !== 'hotel' && itemType !== 'train' && (
          <>
            {/* Hero Image */}
            {image && !imageError ? (
              <div className="relative h-48 bg-gray-200 dark:bg-gray-800">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized={image.includes('googleusercontent.com')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-xl font-semibold text-white">{name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {category && <span className="text-sm text-white/80 capitalize">{category}</span>}
                    {rating && (
                      <>
                        <span className="text-white/60">•</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm text-white">{rating.toFixed(1)}</span>
                        </div>
                      </>
                    )}
                    {priceLevel && priceLevel > 0 && (
                      <>
                        <span className="text-white/60">•</span>
                        <span className="text-sm text-white/80">{'$'.repeat(priceLevel)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-stone-100 dark:bg-gray-800">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-white">{name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {category && <span className="text-sm text-stone-600 dark:text-gray-400 capitalize">{category}</span>}
                  {rating && (
                    <>
                      <span className="text-stone-400">•</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-stone-900 dark:text-white">{rating.toFixed(1)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="p-4">
              <ActionButtons />

              {/* Scheduled Time */}
              {item.time && (
                <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">{formatTime(item.time)}</p>
                  </div>
                </div>
              )}

              {/* Address */}
              {address && (
                <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="pt-1">
                    <p className="text-sm text-gray-900 dark:text-white">{address}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed py-3">
                  {description}
                </p>
              )}

              {/* Notes */}
              {notes?.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mt-2">
                  <p className="text-sm text-amber-800 dark:text-amber-200">{notes.notes}</p>
                </div>
              )}

              {/* View Full Details */}
              {destination?.slug && (
                <Link
                  href={`/destination/${destination.slug}`}
                  className="flex items-center justify-center gap-2 mt-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Urban Manual
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      {onRemove && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <button
            onClick={handleRemove}
            className="w-full py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Remove from itinerary
          </button>
        </div>
      )}
    </div>
  );
}
