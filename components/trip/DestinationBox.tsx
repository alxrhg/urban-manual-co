'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe,
  Plane, Train, Building2, Phone, Navigation
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ItineraryItemNotes } from '@/types/trip';

interface DestinationBoxProps {
  item: EnrichedItineraryItem;
  onClose?: () => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onNotesChange?: (itemId: string, notes: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<ItineraryItemNotes>) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

/**
 * DestinationBox - Clean, minimal destination details for sidebar
 */
export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  // Edit state
  const [editTime, setEditTime] = useState(item.time || '');
  const [editNotes, setEditNotes] = useState(item.parsedNotes?.notes || '');
  const [editConfirmation, setEditConfirmation] = useState(
    item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || ''
  );
  const [editDepartureTime, setEditDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [editArrivalTime, setEditArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');
  const [editCheckInTime, setEditCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [editCheckOutTime, setEditCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');
  const [hasChanges, setHasChanges] = useState(false);

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;
  const itemType = parsedNotes?.type || 'place';

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
  const neighborhood = destination?.neighborhood;
  const description = destination?.micro_description || destination?.description;
  const address = destination?.formatted_address || parsedNotes?.address;
  const website = destination?.website || parsedNotes?.website;
  const phone = parsedNotes?.phone;
  const rating = destination?.rating;
  const priceLevel = destination?.price_level;
  const michelinStars = destination?.michelin_stars;

  // Reset when item changes
  useEffect(() => {
    setEditTime(item.time || '');
    setEditNotes(item.parsedNotes?.notes || '');
    setEditConfirmation(item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '');
    setEditDepartureTime(item.parsedNotes?.departureTime || '');
    setEditArrivalTime(item.parsedNotes?.arrivalTime || '');
    setEditCheckInTime(item.parsedNotes?.checkInTime || '');
    setEditCheckOutTime(item.parsedNotes?.checkOutTime || '');
    setHasChanges(false);
  }, [item.id]);

  // Auto-save on blur
  const handleSave = () => {
    if (!hasChanges) return;

    if (onTimeChange && editTime !== item.time) {
      onTimeChange(item.id, editTime);
    }

    if (onItemUpdate) {
      const updates: Partial<ItineraryItemNotes> = {};

      if (editNotes !== (item.parsedNotes?.notes || '')) {
        updates.notes = editNotes;
      }

      if (itemType === 'hotel') {
        if (editCheckInTime !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = editCheckInTime;
        if (editCheckOutTime !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = editCheckOutTime;
        if (editConfirmation !== (item.parsedNotes?.hotelConfirmation || '')) {
          updates.confirmationNumber = editConfirmation;
          updates.hotelConfirmation = editConfirmation;
        }
      } else if (itemType === 'flight' || itemType === 'train') {
        if (editDepartureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = editDepartureTime;
        if (editArrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = editArrivalTime;
        if (editConfirmation !== (item.parsedNotes?.confirmationNumber || '')) updates.confirmationNumber = editConfirmation;
      }

      if (Object.keys(updates).length > 0) {
        onItemUpdate(item.id, updates);
      }
    }

    setHasChanges(false);
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
      onClose?.();
    }
  };

  // Get type icon
  const TypeIcon = itemType === 'flight' ? Plane : itemType === 'train' ? Train : itemType === 'hotel' ? Building2 : MapPin;

  // Coordinates for directions
  const lat = destination?.latitude || parsedNotes?.latitude;
  const lng = destination?.longitude || parsedNotes?.longitude;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <TypeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{itemType}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
            {name}
          </h3>
          {category && (
            <span className="text-xs text-gray-500 capitalize">{category}</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Image */}
      {image && itemType !== 'flight' && itemType !== 'train' && (
        <div className="aspect-[2/1] relative">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
          />
          {michelinStars && michelinStars > 0 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {michelinStars}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Flight/Train route display */}
        {(itemType === 'flight' || itemType === 'train') && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{parsedNotes?.from || '—'}</p>
              <p className="text-xs text-gray-500">{parsedNotes?.departureTime || '—'}</p>
            </div>
            <div className="flex items-center gap-2 px-3">
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />
              <TypeIcon className="w-4 h-4 text-gray-400" />
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{parsedNotes?.to || '—'}</p>
              <p className="text-xs text-gray-500">{parsedNotes?.arrivalTime || '—'}</p>
            </div>
          </div>
        )}

        {/* Hotel check-in/out display */}
        {itemType === 'hotel' && (parsedNotes?.checkInTime || parsedNotes?.checkOutTime) && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-0.5">Check-in</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {parsedNotes?.checkInTime || '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-0.5">Check-out</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {parsedNotes?.checkOutTime || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Rating & Price */}
        {(rating || priceLevel) && itemType !== 'flight' && itemType !== 'train' && (
          <div className="flex items-center gap-3 text-sm">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
              </div>
            )}
            {priceLevel && priceLevel > 0 && (
              <span className="text-gray-400">{'$'.repeat(priceLevel)}</span>
            )}
            {neighborhood && (
              <span className="text-gray-400">· {neighborhood}</span>
            )}
          </div>
        )}

        {/* Description */}
        {description && itemType !== 'flight' && itemType !== 'train' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
            {description}
          </p>
        )}

        {/* Confirmation # */}
        {(parsedNotes?.confirmationNumber || parsedNotes?.hotelConfirmation) && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Ref:</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">
              {parsedNotes?.confirmationNumber || parsedNotes?.hotelConfirmation}
            </span>
          </div>
        )}

        {/* Edit Fields */}
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          {/* Time for places */}
          {itemType !== 'flight' && itemType !== 'train' && itemType !== 'hotel' && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Time</label>
              <input
                type="time"
                value={editTime}
                onChange={(e) => { setEditTime(e.target.value); setHasChanges(true); }}
                onBlur={handleSave}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
              />
            </div>
          )}

          {/* Times for flights/trains */}
          {(itemType === 'flight' || itemType === 'train') && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Departs</label>
                <input
                  type="time"
                  value={editDepartureTime}
                  onChange={(e) => { setEditDepartureTime(e.target.value); setHasChanges(true); }}
                  onBlur={handleSave}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Arrives</label>
                <input
                  type="time"
                  value={editArrivalTime}
                  onChange={(e) => { setEditArrivalTime(e.target.value); setHasChanges(true); }}
                  onBlur={handleSave}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Times for hotels */}
          {itemType === 'hotel' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Check-in</label>
                <input
                  type="time"
                  value={editCheckInTime}
                  onChange={(e) => { setEditCheckInTime(e.target.value); setHasChanges(true); }}
                  onBlur={handleSave}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Check-out</label>
                <input
                  type="time"
                  value={editCheckOutTime}
                  onChange={(e) => { setEditCheckOutTime(e.target.value); setHasChanges(true); }}
                  onBlur={handleSave}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Confirmation for bookable items */}
          {(itemType === 'hotel' || itemType === 'flight' || itemType === 'train') && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Confirmation #</label>
              <input
                type="text"
                value={editConfirmation}
                onChange={(e) => { setEditConfirmation(e.target.value); setHasChanges(true); }}
                onBlur={handleSave}
                placeholder="Booking reference"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => { setEditNotes(e.target.value); setHasChanges(true); }}
              onBlur={handleSave}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Call
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              Web
            </a>
          )}
          {lat && lng && (
            <a
              href={`https://maps.apple.com/?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Directions
            </a>
          )}
        </div>

        {/* Address */}
        {address && (
          <p className="text-xs text-gray-400 leading-relaxed">{address}</p>
        )}

        {/* Remove */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="w-full mt-2 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Remove from itinerary
          </button>
        )}
      </div>
    </div>
  );
}
